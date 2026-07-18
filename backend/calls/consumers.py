import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .signaling import CallSignalingRouter

logger = logging.getLogger(__name__)

class CallConsumer(AsyncWebsocketConsumer):
    """
    Dedicated consumer for WebRTC signaling.
    Server is signaling ONLY. Media is never parsed here.
    """
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
            
        self.device_id = self.scope.get('device_id')
        self.user_group = f"user_calls_{self.user.id}"
        
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            event_type = data.get('type')
            payload = data.get('payload', {})
            msg_id = data.get('id', 'unknown')
            
            await CallSignalingRouter.route_event(self, event_type, payload, msg_id)
            
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON")
        except Exception as e:
            logger.error(f"Call signaling error: {e}")
            await self.send_error("Internal error")
            
    async def forward_signaling(self, event):
        """Forwards standard WebRTC signaling payloads to the connected peer device."""
        await self.send(text_data=json.dumps({
            'type': event['payload']['type'],
            'payload': event['payload']['data']
        }))

    async def send_error(self, message):
        await self.send(text_data=json.dumps({
            'type': 'error',
            'payload': {'message': message}
        }))
