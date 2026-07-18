from rest_framework import serializers
from .models import CustomUser, Device, Session

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'is_user_a', 'avatar', 'bio', 'presence_status', 'last_seen', 'timezone', 'preferred_language', 'last_login']
        read_only_fields = ['id', 'email', 'is_user_a', 'last_login', 'last_seen']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'timezone', 'preferred_language']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            timezone=validated_data.get('timezone', 'UTC'),
            preferred_language=validated_data.get('preferred_language', 'en')
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
