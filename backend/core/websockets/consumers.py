import json
import time
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from chat.websockets.events import ChatEventRouter
from chat.models import ConversationMember

logger = logging.getLogger(__name__)

class RealtimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        
        if self.user.is_anonymous:
            logger.warning("WebSocket rejected: Unauthenticated connection attempt.")
            await self.close(code=4001)
            return

        self.user_group = f"user_{self.user.id}"
        self.last_message_time = 0
        self.message_count = 0
        
        # Join user specific group
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        
        # Join all conversation groups the user belongs to
        conversations = await self.get_user_conversations()
        for conv_id in conversations:
            await self.channel_layer.group_add(f"conversation_{conv_id}", self.channel_name)

        await self.accept()

        # Add to global stories group for simplified broadcast
        await self.channel_layer.group_add("global_stories", self.channel_name)
        logger.info(f"WebSocket connected: User {self.user.email}")
        
        # Broadcast presence
        await self.set_online_status(True)

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and not self.user.is_anonymous:
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
            
            conversations = await self.get_user_conversations()
            for conv_id in conversations:
                await self.channel_layer.group_discard(f"conversation_{conv_id}", self.channel_name)
            
            # Update presence to offline
            await self.set_online_status(False)
            await self.channel_layer.group_discard("global_stories", self.channel_name)
            logger.info(f"WebSocket disconnected: User {self.user.email} (Code: {close_code})")

    async def receive(self, text_data):
        try:
            # Message size validation (e.g. max 128KB)
            if len(text_data) > 131072:
                logger.warning("WebSocket rejected: Frame too large")
                await self.send_error("Message too large")
                await self.close(code=1009)
                return

            # Frame rate limiting (Token bucket approximation)
            now = time.time()
            if now - self.last_message_time > 1.0:
                self.message_count = 0
            self.message_count += 1
            self.last_message_time = now
            
            if self.message_count > 50:
                logger.warning("WebSocket rejected: Rate limit exceeded")
                await self.send_error("Rate limit exceeded")
                await self.close(code=4029)
                return

            data = json.loads(text_data)
            event_type = data.get('type')
            payload = data.get('payload', {})
            msg_id = data.get('id')
            
            if event_type == 'heartbeat':
                await self.send(text_data=json.dumps({
                    'type': 'ack',
                    'id': msg_id,
                    'payload': {'status': 'ok'}
                }))
                
            elif event_type == 'typing.start':
                await self.broadcast_to_conversation(payload.get('conversation_id'), {'type': 'typing.start', 'user_id': str(self.user.id)})
                
            elif event_type == 'typing.stop':
                await self.broadcast_to_conversation(payload.get('conversation_id'), {'type': 'typing.stop', 'user_id': str(self.user.id)})
                
            elif event_type.startswith('message.') or event_type.startswith('conversation.'):
                await ChatEventRouter.route_event(self, event_type, payload, msg_id)
                
            else:
                logger.warning(f"Unknown event type received: {event_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"WebSocket receive error: {str(e)}")
            await self.send_error("Internal server error")

    async def send_error(self, message):
        await self.send(text_data=json.dumps({
            'type': 'error',
            'payload': {'message': message}
        }))

    async def set_online_status(self, is_online):
        status = 'presence.online' if is_online else 'presence.offline'
        event = {
            'type': 'presence_update',
            'status': status,
            'user_id': str(self.user.id),
            'timestamp': int(time.time() * 1000)
        }
        
        # Broadcast to all shared conversations instead of global
        conversations = await self.get_user_conversations()
        for conv_id in conversations:
            await self.channel_layer.group_send(f"conversation_{conv_id}", event)

    async def presence_update(self, event):
        if event.get('user_id') != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': event['status'],
                'payload': {
                    'user_id': event['user_id'],
                    'timestamp': event['timestamp']
                }
            }))
        
    async def broadcast_to_conversation(self, conversation_id, payload):
        if not conversation_id:
            return
            
        is_member = await self.check_conversation_membership(conversation_id)
        if not is_member:
            return
            
        await self.channel_layer.group_send(f"conversation_{conversation_id}", {
            'type': 'forward_event',
            'sender_id': str(self.user.id),
            'payload': payload
        })
        
    async def forward_event(self, event):
        if event.get('sender_id') != str(self.user.id):
            await self.send(text_data=json.dumps(event['payload']))

    @database_sync_to_async
    def get_user_conversations(self):
        return list(ConversationMember.objects.filter(user=self.user).values_list('conversation_id', flat=True))

    @database_sync_to_async
    def check_conversation_membership(self, conversation_id):
        return ConversationMember.objects.filter(conversation_id=conversation_id, user=self.user).exists()
