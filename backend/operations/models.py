import uuid
from django.db import models
from users.models import CustomUser

class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    actor = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    actor_ip = models.GenericIPAddressField(null=True, blank=True)
    
    category = models.CharField(max_length=50, db_index=True) # e.g. AUTH, VAULT, AI, SETTINGS
    action = models.CharField(max_length=100) # e.g. LOGIN_SUCCESS, AI_PERMISSION_GRANT
    severity = models.CharField(max_length=20, default='INFO', db_index=True) # INFO, WARNING, CRITICAL
    
    correlation_id = models.UUIDField(null=True, blank=True, db_index=True)
    trace_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    
    # Strictly METADATA only. Plaintext content is structurally forbidden.
    metadata = models.JSONField(default=dict)

    class Meta:
        ordering = ['-timestamp']

class Incident(models.Model):
    STATES = [
        ('DETECTED', 'Detected'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('INVESTIGATING', 'Investigating'),
        ('MITIGATED', 'Mitigated'),
        ('RESOLVED', 'Resolved'),
        ('POSTMORTEM', 'Postmortem')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    state = models.CharField(max_length=20, choices=STATES, default='DETECTED')
    severity = models.CharField(max_length=20) # SEV1, SEV2, SEV3
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    root_cause = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

class MaintenanceMode(models.Model):
    TYPES = [
        ('SCHEDULED', 'Scheduled'),
        ('EMERGENCY', 'Emergency')
    ]
    SCOPES = [
        ('FULL', 'Full Maintenance'),
        ('READ_ONLY', 'Read-Only Mode'),
        ('PARTIAL', 'Partial Component Degradation')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=False)
    
    maintenance_type = models.CharField(max_length=20, choices=TYPES, default='SCHEDULED')
    scope = models.CharField(max_length=20, choices=SCOPES, default='FULL')
    
    start_time = models.DateTimeField()
    estimated_end_time = models.DateTimeField(null=True, blank=True)
    
    message = models.TextField(help_text="Public message displayed to users")
    
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-start_time']
