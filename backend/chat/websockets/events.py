import json
import logging
from channels.db import database_sync_to_async
from chat.services import ChatService

logger = logging.getLogger(__name__)

class ChatEventRouter:
    @staticmethod
    async def route_event(consumer, event_type, payload, msg_id):
        if event_type == 'message.send':
            await ChatEventRouter.handle_message_send(consumer, payload, msg_id)
        elif event_type == 'message.edit':
            await ChatEventRouter.handle_message_edit(consumer, payload, msg_id)
        elif event_type == 'message.reaction':
            await ChatEventRouter.handle_message_reaction(consumer, payload, msg_id)
        elif event_type == 'message.delete':
            await ChatEventRouter.handle_message_delete(consumer, payload, msg_id)
        elif event_type in ['message.delivered', 'message.read']:
            await ChatEventRouter.handle_message_status(consumer, payload, msg_id, event_type)
        elif event_type == 'conversation.sync':
            await ChatEventRouter.handle_conversation_sync(consumer, payload, msg_id)
        elif event_type == 'sync.complete':
            await ChatEventRouter.handle_sync_complete(consumer, payload, msg_id)
        elif event_type == 'draft.updated':
            await ChatEventRouter.handle_draft_updated(consumer, payload, msg_id)
        elif event_type in ['call.offer', 'call.answer', 'call.ice_candidate', 'call.end', 'call.reject']:
            await ChatEventRouter.handle_call_signaling(consumer, payload, msg_id, event_type)
        elif event_type == 'connection.quality':
            # Analytics/observability payload
            pass 
        else:
            logger.warning(f"Unhandled chat event: {event_type}")

    @staticmethod
    async def handle_message_send(consumer, payload, ack_id):
        logger.error(f"Received message payload: {payload}")
        try:
            # Run the synchronous service layer in a sync_to_async thread
            msg = await database_sync_to_async(ChatService.process_incoming_message)(
                consumer.user, 
                payload
            )
            
            server_ts = msg.server_timestamp.isoformat() if hasattr(msg.server_timestamp, 'isoformat') else msg.server_timestamp
            created_ts = msg.created_at.isoformat() if hasattr(msg.created_at, 'isoformat') else msg.created_at
            
            # 1. Send ACK back to sender
            await consumer.send(text_data=json.dumps({
                'type': 'ack',
                'id': ack_id,
                'payload': {
                    'status': 'sent',
                    'message_id': str(msg.id),
                    'sequence_number': msg.sequence_number,
                    'server_timestamp': server_ts
                }
            }))
            
            # 2. Broadcast 'message.new' to the conversation group
            attachments_data = []
            if hasattr(msg, 'attachments'):
                for att in msg.attachments.all():
                    attachments_data.append({
                        'id': str(att.id),
                        's3_key': att.s3_key,
                        'type': att.s3_key.split('.')[-1] if '.' in att.s3_key else 'file'
                    })

            member_user_ids = await database_sync_to_async(
                lambda: list(msg.conversation.members.values_list('user_id', flat=True))
            )()

            event_data = {
                'type': 'forward_event',
                'sender_id': str(consumer.user.id),
                'payload': {
                    'type': 'message.new',
                    'payload': {
                        'id': str(msg.id),
                        'conversation_id': str(msg.conversation_id),
                        'sequence_number': msg.sequence_number,
                        'sender_id': str(msg.sender_id),
                        'ciphertext': msg.ciphertext,
                        'nonce': msg.nonce,
                        'signature': msg.signature,
                        'key_version': msg.key_version,
                        'algorithm': msg.algorithm,
                        'created_at': created_ts,
                        'attachments': attachments_data
                    }
                }
            }

            try:
                conversation_group = f"conversation_{msg.conversation_id}"
                await consumer.channel_layer.group_send(conversation_group, event_data)

                for member_id in member_user_ids:
                    user_group = f"user_{member_id}"
                    await consumer.channel_layer.group_send(user_group, event_data)
            except Exception as broadcast_err:
                logger.error(f"WebSocket group_send broadcast error (Redis connection issue?): {broadcast_err}")
            
        except ValueError as e:
            logger.error(f"Message processing failed (ValueError): {str(e)}")
            await consumer.send_error(str(e))
        except Exception as e:
            logger.error(f"Message processing failed: {str(e)}")
            await consumer.send_error("Message processing failed")

    @staticmethod
    async def handle_message_reaction(consumer, payload, ack_id):
        try:
            result = await database_sync_to_async(ChatService.process_message_reaction)(
                consumer.user,
                payload
            )
            await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'ok'}}))
            conversation_group = f"conversation_{payload.get('conversation_id')}"
            await consumer.channel_layer.group_send(conversation_group, {
                'type': 'forward_event',
                'sender_id': str(consumer.user.id),
                'event_type': 'message.reaction',
                'payload': result
            })
        except Exception as e:
            logger.error(f"Message reaction processing failed: {str(e)}")
            await consumer.send_error("Message reaction processing failed")

    @staticmethod
    async def handle_message_edit(consumer, payload, ack_id):
        try:
            msg = await database_sync_to_async(ChatService.process_message_edit)(
                consumer.user, 
                payload
            )
            await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'edited'}}))
            conversation_group = f"conversation_{payload.get('conversation_id', msg.conversation_id)}"
            await consumer.channel_layer.group_send(conversation_group, {
                'type': 'forward_event',
                'sender_id': str(consumer.user.id),
                'payload': {'type': 'message.edit', 'payload': payload}
            })
        except ValueError as e:
            await consumer.send_error(str(e))

    @staticmethod
    async def handle_message_delete(consumer, payload, ack_id):
        try:
            await database_sync_to_async(ChatService.process_message_delete)(
                consumer.user, 
                payload
            )
            await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'deleted'}}))
            conversation_group = f"conversation_{payload.get('conversation_id')}"
            await consumer.channel_layer.group_send(conversation_group, {
                'type': 'forward_event',
                'sender_id': str(consumer.user.id),
                'payload': {'type': 'message.delete', 'payload': payload}
            })
        except ValueError as e:
            await consumer.send_error(str(e))

    @staticmethod
    async def handle_message_status(consumer, payload, ack_id, event_type):
        try:
            await database_sync_to_async(ChatService.process_message_status)(
                consumer.user, 
                payload,
                event_type.split('.')[1] # 'delivered' or 'read'
            )
            await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'ok'}}))
            conversation_group = f"conversation_{payload.get('conversation_id')}"
            await consumer.channel_layer.group_send(conversation_group, {
                'type': 'forward_event',
                'sender_id': str(consumer.user.id),
                'payload': {'type': event_type, 'payload': payload}
            })
        except ValueError as e:
            await consumer.send_error(str(e))

    @staticmethod
    async def handle_conversation_sync(consumer, payload, ack_id):
        try:
            # Sync response returns 'conversation.delta' instead of sync_response per Sprint 7 spec
            delta = await database_sync_to_async(ChatService.process_conversation_sync)(
                consumer.user, 
                payload
            )
            await consumer.send(text_data=json.dumps({
                'type': 'conversation.delta',
                'id': ack_id,
                'payload': delta
            }))
        except ValueError as e:
            await consumer.send_error(str(e))

    @staticmethod
    async def handle_sync_complete(consumer, payload, ack_id):
        try:
            await database_sync_to_async(ChatService.process_sync_complete)(consumer.user, payload)
            await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'ok'}}))
        except ValueError as e:
            await consumer.send_error(str(e))

    @staticmethod
    async def handle_draft_updated(consumer, payload, ack_id):
        try:
            await database_sync_to_async(ChatService.process_draft_updated)(consumer.user, payload)
            # Drafts can optionally be forwarded to other devices of the SAME user
            await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'ok'}}))
        except ValueError as e:
            await consumer.send_error(str(e))

    @staticmethod
    async def handle_call_signaling(consumer, payload, ack_id, event_type):
        try:
            conversation_id = payload.get('conversation_id')
            if not conversation_id:
                raise ValueError("Missing conversation_id for call signaling")
            
            # Forward the SDP/ICE payload verbatim to the other participants in the conversation
            await consumer.channel_layer.group_send(f"conversation_{conversation_id}", {
                'type': 'forward_event',
                'sender_id': str(consumer.user.id),
                'payload': {
                    'type': event_type,
                    'payload': payload
                }
            })
            if ack_id:
                await consumer.send(text_data=json.dumps({'type': 'ack', 'id': ack_id, 'payload': {'status': 'routed'}}))
        except Exception as e:
            await consumer.send_error(f"Call signaling failed: {str(e)}")


