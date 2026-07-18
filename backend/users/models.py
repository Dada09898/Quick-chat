import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError

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
    avatar = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    presence_status = models.CharField(max_length=20, default='offline', choices=[
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('away', 'Away'),
        ('dnd', 'Do Not Disturb')
    ])
    last_seen = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    preferred_language = models.CharField(max_length=10, default='en')
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

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
