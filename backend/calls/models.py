from django.db import models
from django.conf import settings
import uuid6
from chat.models import Conversation
from users.models import Device

class CallSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='calls')
    caller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='initiated_calls')
    
    # IDLE, OUTGOING, RINGING, CONNECTING, CONNECTED, RECONNECTING, HOLD, ENDED, FAILED
    status = models.CharField(max_length=32, default='IDLE') 
    call_type = models.CharField(max_length=32) # 'audio', 'video'
    
    ended_reason = models.CharField(max_length=64, null=True, blank=True) # e.g. 'rejected', 'timeout', 'hungup'
    reconnect_count = models.IntegerField(default=0)
    quality_summary = models.CharField(max_length=32, default='Unknown') # Excellent, Good, Fair, Poor
    version = models.IntegerField(default=1) # Optimistic concurrency
    
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

class CallParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    session = models.ForeignKey(CallSession, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True)
    
    device_name = models.CharField(max_length=128, blank=True)
    media_state = models.CharField(max_length=64, default='inactive') # 'audio_only', 'video', 'screen_share'
    reconnects = models.IntegerField(default=0)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('session', 'user', 'device')

class CallEvent(models.Model):
    """Immutable ledger of signaling events for audit and diagnostics. EXCLUDES payloads (SDP)."""
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    session = models.ForeignKey(CallSession, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=64) # 'invite', 'accept', 'ice_restart', 'reconnect'
    
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
