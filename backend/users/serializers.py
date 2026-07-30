import re
from rest_framework import serializers
from .models import CustomUser, Device, Session, FriendRequest, Contact

USERNAME_RE = re.compile(r'^[a-z0-9_]{3,20}$')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'display_name', 'is_user_a', 'avatar', 'bio', 'phone_number', 'website', 'location', 'presence_status', 'last_seen', 'timezone', 'preferred_language', 'privacy_settings', 'last_login']
        read_only_fields = ['id', 'email', 'is_user_a', 'last_login', 'last_seen']

class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'display_name', 'avatar', 'presence_status', 'last_seen']

class FriendRequestSerializer(serializers.ModelSerializer):
    sender_details = UserSearchSerializer(source='sender', read_only=True)
    receiver_details = UserSearchSerializer(source='receiver', read_only=True)

    class Meta:
        model = FriendRequest
        fields = ['id', 'sender', 'sender_details', 'receiver', 'receiver_details', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

class ContactSerializer(serializers.ModelSerializer):
    user_details = UserSearchSerializer(source='user', read_only=True)

    class Meta:
        model = Contact
        fields = ['id', 'user', 'user_details', 'nickname', 'is_blocked', 'is_close_friend', 'is_archived', 'is_muted', 'is_favorite', 'last_interaction_at', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    username = serializers.CharField(required=True, max_length=20)

    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'username', 'timezone', 'preferred_language']

    def validate_username(self, value):
        value = value.strip().lower()
        if not USERNAME_RE.match(value):
            raise serializers.ValidationError(
                'Username must be 3-20 characters, lowercase letters, numbers, and underscores only.'
            )
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            username=validated_data['username'],
            display_name=validated_data['username'],
            timezone=validated_data.get('timezone', 'UTC'),
            preferred_language=validated_data.get('preferred_language', 'en'),
            privacy_settings={'discoverable_by_username': True}
        )
        return user

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'device_name', 'public_key_x25519', 'public_key_ed25519', 'fcm_token', 'is_verified', 'created_at']
        read_only_fields = ['id', 'is_verified', 'created_at']

class SessionSerializer(serializers.ModelSerializer):
    device = DeviceSerializer(read_only=True)
    
    class Meta:
        model = Session
        fields = ['id', 'device', 'ip_address', 'user_agent', 'created_at', 'expires_at', 'is_active']
        read_only_fields = ['id', 'device', 'ip_address', 'user_agent', 'created_at', 'expires_at']
