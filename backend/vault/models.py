import uuid
from django.db import models
from users.models import CustomUser

class VaultFolder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='vault_folders')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    
    # Encrypted metadata (folder name, color, icon)
    encrypted_metadata = models.TextField()
    wrapped_key = models.TextField() # Key wrapping for folder metadata DEK
    
    sync_version = models.BigIntegerField(default=1)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['owner', 'sync_version']),
        ]

class VaultItem(models.Model):
    ITEM_TYPES = [
        ('PASSWORD', 'Password'),
        ('NOTE', 'Note'),
        ('DOCUMENT', 'Document'),
        ('API_KEY', 'API Key'),
        ('SSH_KEY', 'SSH Key'),
        ('IDENTITY', 'Identity'),
        ('BANK_CARD', 'Bank Card'),
        ('LICENSE', 'License'),
        ('CERTIFICATE', 'Certificate'),
        ('CUSTOM', 'Custom'),
        ('FILE', 'File')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='vault_items')
    folder = models.ForeignKey(VaultFolder, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES)
    
    # Encrypted payload containing BOTH metadata (name, tags) and content (password, note body)
    ciphertext = models.TextField()
    
    # Cryptographic Material
    wrapped_key = models.TextField() # The unique DEK wrapped by the Master Key
    key_version = models.IntegerField(default=1) # Supports independent key rotation
    algorithm = models.CharField(max_length=50, default='AES-256-GCM')
    
    # Sync Engine
    sync_version = models.BigIntegerField(default=1)
    version = models.IntegerField(default=1) # Item specific version for conflict resolution
    
    is_favorite = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['owner', 'sync_version']),
            models.Index(fields=['item_type']),
        ]

class VaultItemVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(VaultItem, on_delete=models.CASCADE, related_name='history')
    
    ciphertext = models.TextField()
    wrapped_key = models.TextField()
    key_version = models.IntegerField()
    algorithm = models.CharField(max_length=50)
    version = models.IntegerField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-version']
