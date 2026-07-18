from django.db import models
from django.conf import settings
import uuid6
from users.models import Device

class SecurityAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    
    event_type = models.CharField(max_length=64, db_index=True)
    severity = models.CharField(max_length=32) # INFO, WARNING, CRITICAL
    category = models.CharField(max_length=64) # AUTH, RATE_LIMIT, ABUSE, ANOMALY
    
    trace_id = models.CharField(max_length=128, null=True, blank=True, db_index=True)
    correlation_id = models.CharField(max_length=128, null=True, blank=True)
    
    mitigation_status = models.CharField(max_length=32, default='pending') # pending, mitigated, ignored
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    ip_address_hash = models.CharField(max_length=128, db_index=True) # Hashed to preserve privacy
    
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    metadata = models.JSONField(default=dict) # Strict rule: NEVER store plaintext/ciphertext here
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']

class FeatureFlag(models.Model):
    name = models.CharField(max_length=128, unique=True, primary_key=True)
    is_enabled = models.BooleanField(default=False)
    rollout_percentage = models.IntegerField(default=0) # 0 to 100
    description = models.TextField(blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
