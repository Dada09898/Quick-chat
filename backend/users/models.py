import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
            
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_user_a = models.BooleanField(default=False, help_text="Designates if this is User A or B")
    
    totp_secret = models.CharField(max_length=64, blank=True, null=True)
    
    # Extended Profile Fields
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    presence_status = models.CharField(max_length=20, default='offline', choices=[
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('away', 'Away'),
        ('dnd', 'Do Not Disturb')
    ])
    last_seen = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    preferred_language = models.CharField(max_length=10, default='en')
    
    privacy_settings = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username or self.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

class FriendRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_requests')
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_requests')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    
    responded_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_requests')
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['sender', 'receiver'],
                condition=models.Q(status='pending', deleted_at__isnull=True),
                name='unique_pending_request'
            ),
            models.CheckConstraint(
                condition=~models.Q(sender=models.F('receiver')),
                name='prevent_self_request'
            )
        ]
        indexes = [
            models.Index(fields=['sender', 'status']),
            models.Index(fields=['receiver', 'status']),
        ]

class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='contacts')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='contacted_by')
    
    nickname = models.CharField(max_length=255, blank=True, null=True)
    
    is_blocked = models.BooleanField(default=False)
    is_close_friend = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    is_favorite = models.BooleanField(default=False)
    
    blocked_at = models.DateTimeField(null=True, blank=True)
    last_interaction_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_contacts')
    notes = models.TextField(blank=True, null=True)
    
    disappearing_messages_default = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'user'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_contact'
            )
        ]
class SupportTicket(models.Model):
    TICKET_TYPE_CHOICES = [
        ('bug', 'Bug Report'),
        ('feature', 'Feature Request'),
        ('feedback', 'Feedback'),
        ('help', 'Help / Question')
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='support_tickets')
    ticket_type = models.CharField(max_length=20, choices=TICKET_TYPE_CHOICES, default='bug')
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

class AISetting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='ai_setting')
    system_prompt = models.TextField(default='You are an AI assistant in QuickChat.')
    ai_memory_enabled = models.BooleanField(default=True)
    saved_prompts = models.JSONField(default=list, blank=True)
    preferred_model = models.CharField(max_length=50, default='gemini-2.0')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.owner.email} -> {self.user.email}"

class Device(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='devices')
    device_name = models.CharField(max_length=255)
    
    # Public keys for E2EE
    public_key_x25519 = models.TextField(help_text="Base64 encoded public key for key exchange")
    public_key_ed25519 = models.TextField(help_text="Base64 encoded public key for signatures")
    
    # Push Notifications
    fcm_token = models.TextField(null=True, blank=True, help_text="Firebase Cloud Messaging token for push notifications")
    
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'public_key_x25519')

class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sessions')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, null=True, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
