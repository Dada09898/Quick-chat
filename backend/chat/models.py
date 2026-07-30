import uuid6
from django.db import models
from django.conf import settings
from users.models import Device

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    is_direct = models.BooleanField(default=False)
    direct_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    
    last_message_id = models.UUIDField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now_add=True)
    version = models.BigIntegerField(default=1, db_index=True) # Optimistic locking/sequence
    unread_count_cache = models.IntegerField(default=0)
    disappearing_messages_timer = models.CharField(
        max_length=10,
        choices=[('off', 'Off'), ('24h', '24 Hours'), ('7d', '7 Days'), ('90d', '90 Days')],
        default='off'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['version']),
            models.Index(fields=['last_activity']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['direct_hash'],
                condition=models.Q(is_direct=True, deleted_at__isnull=True),
                name='unique_active_direct_conversation'
            )
        ]

class ConversationMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    role = models.CharField(max_length=50, default='member')
    session_key_version = models.IntegerField(default=1)
    
    is_pinned = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_favorite = models.BooleanField(default=False)
    
    last_read_at = models.DateTimeField(null=True, blank=True)
    unread_count = models.IntegerField(default=0)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('conversation', 'user')
        indexes = [
            models.Index(fields=['user', 'unread_count']),
        ]

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False) # Client generates this usually, but fallback if not provided
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sequence_number = models.BigIntegerField(db_index=True)
    
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    sender_device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, related_name='sent_messages')
    
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    ciphertext = models.TextField()
    nonce = models.CharField(max_length=128)
    signature = models.CharField(max_length=256)
    
    key_version = models.IntegerField(default=1)
    algorithm = models.CharField(max_length=64, default='AES-256-GCM')
    
    is_edited = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField() # Client timestamp
    server_timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('conversation', 'sequence_number')
        ordering = ['sequence_number']

class MessageEditHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='edit_history')
    ciphertext = models.TextField()
    nonce = models.CharField(max_length=128)
    signature = models.CharField(max_length=256)
    key_version = models.IntegerField()
    algorithm = models.CharField(max_length=64)
    edited_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-edited_at']

class MessageStatus(models.Model):
    STATUS_CHOICES = (
        ('queued', 'Queued'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
    )
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='sent')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('message', 'user')

class MessageReaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    reaction_ciphertext = models.CharField(max_length=256)
    nonce = models.CharField(max_length=128)
    signature = models.CharField(max_length=256)
    key_version = models.IntegerField(default=1)
    algorithm = models.CharField(max_length=64, default='AES-256-GCM')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')

class UploadSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=32, default='pending') # pending, uploading, completed, failed, cancelled
    chunk_count = models.IntegerField(default=0)
    completed_chunks = models.IntegerField(default=0)
    upload_url = models.CharField(max_length=1024, blank=True, null=True)
    mime_type = models.CharField(max_length=128, default='application/octet-stream')
    original_filename = models.CharField(max_length=255, blank=True, default='')
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class MediaAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    message = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True, related_name='attachments')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    s3_key = models.CharField(max_length=512)
    mime_type = models.CharField(max_length=128, default='application/octet-stream')
    original_filename = models.CharField(max_length=255, blank=True, default='')
    thumbnail_s3_key = models.CharField(max_length=512, null=True, blank=True)
    file_hash = models.CharField(max_length=128) # e.g. SHA-256 of the assembled ciphertext
    
    key_version = models.IntegerField(default=1)
    algorithm = models.CharField(max_length=64, default='AES-256-GCM')
    checksum_algorithm = models.CharField(max_length=64, default='SHA-256')
    chunk_count = models.IntegerField(default=1)
    
    status = models.CharField(max_length=32, default='uploading') # uploading, completed, failed
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class DeviceSyncState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sync_states')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='sync_states')
    
    last_sequence_synced = models.BigIntegerField(default=0)
    sync_version = models.BigIntegerField(default=1)
    
    last_server_timestamp = models.DateTimeField(auto_now_add=True)
    last_client_timestamp = models.DateTimeField(auto_now_add=True)
    
    sync_status = models.CharField(max_length=32, default='idle') # idle, syncing, failed
    last_error = models.TextField(null=True, blank=True)
    last_full_sync = models.DateTimeField(null=True, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('device', 'conversation')
        indexes = [
            models.Index(fields=['device', 'conversation']),
        ]

class DraftMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='drafts')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    
    ciphertext = models.TextField()
    
    expires_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('conversation', 'sender', 'device')

class SharedCollaborativeObject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='collaborative_objects')
    object_type = models.CharField(max_length=64) # note, checklist, reminder, calendar, timeline
    
    ciphertext = models.TextField() # Encrypted JSON state (CRDT or LWW)
    nonce = models.CharField(max_length=128)
    signature = models.CharField(max_length=256)
    key_version = models.IntegerField(default=1)
    algorithm = models.CharField(max_length=64, default='AES-256-GCM')
    
    object_version = models.BigIntegerField(default=1)
    sync_version = models.BigIntegerField(default=1)
    last_sequence = models.BigIntegerField(default=0)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['conversation', 'object_type']),
        ]

class MessageBookmark(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='bookmarks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('message', 'user')

class ReadReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=True, blank=True)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True)
    
    notification_type = models.CharField(max_length=50) # mention, reply, new_message
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class TypingState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='typing_states')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    is_typing = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('conversation', 'user')


class UserStatus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='statuses')
    
    status_type = models.CharField(max_length=20, default='text') # 'image', 'video', 'text', 'audio'
    content = models.TextField()
    caption = models.TextField(blank=True, default='')
    background_color = models.CharField(max_length=20, default='#005c4b')
    font_family = models.CharField(max_length=30, default='sans-serif')
    privacy = models.CharField(max_length=20, default='contacts') # 'contacts', 'except', 'only'
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']


class StatusView(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    status = models.ForeignKey(UserStatus, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('status', 'viewer')


class Community(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_communities')
    announcement_conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='community_announcements')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class CommunityGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='groups')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    group_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)



