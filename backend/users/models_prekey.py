import uuid
from django.db import models
from django.conf import settings
from users.models import Device


class SignedPreKey(models.Model):
    """Signed pre-key for X3DH key exchange.
    Each device has exactly one active signed pre-key.
    Rotated periodically (recommended: every 7-30 days).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='signed_prekeys')
    
    public_key = models.TextField(help_text="Base64 SPKI encoded X25519 public key")
    signature = models.TextField(help_text="Base64 Ed25519 signature of the public key")
    key_id = models.IntegerField(help_text="Client-assigned key ID for rotation tracking")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['device', 'is_active']),
        ]
    
    def __str__(self):
        return f"SPK:{self.key_id} for {self.device.device_name}"


class OneTimePreKey(models.Model):
    """One-time pre-keys for X3DH.
    Consumed on first use. Devices should upload batches of 100.
    Server deletes after consumption to ensure forward secrecy.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='one_time_prekeys')
    
    public_key = models.TextField(help_text="Base64 SPKI encoded X25519 public key")
    key_id = models.IntegerField(help_text="Client-assigned key ID")
    
    is_consumed = models.BooleanField(default=False)
    consumed_at = models.DateTimeField(null=True, blank=True)
    consumed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['device', 'is_consumed']),
        ]
    
    def __str__(self):
        return f"OPK:{self.key_id} for {self.device.device_name}"


class AuditLog(models.Model):
    """Security audit log for cryptographic operations."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    
    ACTION_CHOICES = [
        ('key_bundle_upload', 'Key Bundle Upload'),
        ('key_bundle_fetch', 'Key Bundle Fetch'),
        ('prekey_consumed', 'Pre-Key Consumed'),
        ('device_registered', 'Device Registered'),
        ('device_removed', 'Device Removed'),
        ('session_established', 'Session Established'),
        ('session_destroyed', 'Session Destroyed'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
    ]
    
    action = models.CharField(max_length=64, choices=ACTION_CHOICES)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    target_device = models.ForeignKey(
        Device,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+'
    )
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'action', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} at {self.created_at}"
