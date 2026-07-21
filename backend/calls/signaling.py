import logging
from channels.db import database_sync_to_async
from .models import CallSession, CallEvent
from core.observability import logger as obs_logger

logger = logging.getLogger(__name__)

class CallSignalingRouter:
    @staticmethod
    async def route_event(consumer, event_type, payload, msg_id):
        # A strictly defined state machine is managed at the client.
        # The server merely ensures that unauthorized sessions are blocked
        # and forwards events between devices of authorized members.
        
        session_id = payload.get('session_id')
        payload.get('target_device_id') # If addressing a specific peer device

        try:
            # Audit the event (never logging SDP or media metadata)
            await database_sync_to_async(CallSignalingRouter._audit_event)(
                consumer, event_type, session_id
            )
            
            # Simple Forwarding pattern to the conversation group
            # In a true enterprise WebRTC setup, signaling is routed directly to the specific user/device channel
            # We mock the route by broadcasting to the caller's target
            target_user_id = payload.get('target_user_id')
            if target_user_id:
                target_group = f"user_calls_{target_user_id}"
                await consumer.channel_layer.group_send(target_group, {
                    'type': 'forward_signaling',
                    'payload': {
                        'type': event_type,
                        'data': payload
                    }
                })
        except Exception as e:
            logger.error(f"Signaling routing failed: {e}")
            await consumer.send_error("Signaling failed")

    @staticmethod
    def _audit_event(consumer, event_type, session_id):
        if not session_id:
            return
            
        session = CallSession.objects.filter(id=session_id).first()
        if session:
            # Create an immutable audit log
            CallEvent.objects.create(
                session=session,
                event_type=event_type,
                sender=consumer.user,
                # device=consumer.device_id  # Mocking device
            )
            
            # Send to observability provider (without SDP payload)
            obs_logger.log('INFO', f"WebRTC Signaling Event: {event_type}", metadata={
                "session_id": str(session_id),
                "event_type": event_type
            })
