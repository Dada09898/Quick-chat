from rest_framework import serializers
from users.serializers import UserSerializer
from .models import Conversation, ConversationMember, Message, MediaAttachment, MessageReaction, ReadReceipt


class ConversationMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ['id', 'user', 'session_key_version', 'is_pinned', 'is_muted', 'is_archived', 'joined_at']


class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'last_message_id', 'last_activity', 'version', 'unread_count_cache', 'disappearing_messages_timer', 'created_at', 'members']


class MediaAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAttachment
        fields = [
            'id', 's3_key', 'thumbnail_s3_key', 'file_hash', 'key_version',
            'algorithm', 'chunk_count', 'status', 'mime_type', 'original_filename', 'url'
        ]

    def get_url(self, obj):
        from core.storage import LocalStorageProvider
        return LocalStorageProvider().get_presigned_url(obj.s3_key)


class MessageReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'reaction_ciphertext', 'nonce', 'signature']


class ReadReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadReceipt
        fields = ['user', 'read_at']


class MessageSerializer(serializers.ModelSerializer):
    attachments = MediaAttachmentSerializer(many=True, read_only=True)
    sender = UserSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    read_receipts = ReadReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sequence_number', 'sender', 'reply_to',
            'ciphertext', 'nonce', 'signature', 'key_version', 'algorithm',
            'is_edited', 'created_at', 'server_timestamp', 'attachments', 'reactions', 'read_receipts'
        ]
        read_only_fields = ['id', 'sequence_number', 'sender', 'server_timestamp']


class StatusViewSerializer(serializers.ModelSerializer):
    viewer = UserSerializer(read_only=True)

    class Meta:
        from .models import StatusView
        model = StatusView
        fields = ['id', 'viewer', 'viewed_at']


class UserStatusSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    views = StatusViewSerializer(many=True, read_only=True)

    class Meta:
        from .models import UserStatus
        model = UserStatus
        fields = [
            'id', 'user', 'status_type', 'content', 'caption',
            'background_color', 'font_family', 'privacy',
            'created_at', 'expires_at', 'views'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'expires_at']

