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
    last_message_preview = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    is_archived = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'is_direct', 'last_message_id', 'last_message_preview', 
            'last_activity', 'version', 'unread_count_cache', 
            'disappearing_messages_timer', 'created_at', 'members',
            'is_pinned', 'is_muted', 'is_archived'
        ]

    def get_last_message_preview(self, obj):
        last_msg = Message.objects.filter(conversation=obj, deleted_at__isnull=True).order_by('-created_at').first()
        if not last_msg:
            return ""
        preview_text = last_msg.ciphertext or ""
        try:
            import base64
            preview_text = base64.b64decode(preview_text).decode('utf-8')
        except Exception:
            pass
        if len(preview_text) > 100:
            preview_text = preview_text[:97] + '...'
        return preview_text

    def get_is_pinned(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        member = obj.members.filter(user=request.user).first()
        return member.is_pinned if member else False

    def get_is_muted(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        member = obj.members.filter(user=request.user).first()
        return member.is_muted if member else False

    def get_is_archived(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        member = obj.members.filter(user=request.user).first()
        return member.is_archived if member else False


class MediaAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAttachment
        fields = [
            'id', 's3_key', 'thumbnail_s3_key', 'file_hash', 'key_version',
            'algorithm', 'chunk_count', 'status', 'mime_type', 'original_filename', 'url'
        ]

    def get_url(self, obj):
        from core.storage import storage_provider
        return storage_provider.get_presigned_url(obj.s3_key)


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


class CommunityGroupSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import CommunityGroup
        model = CommunityGroup
        fields = ['id', 'community', 'conversation', 'group_name', 'created_at']


class CommunitySerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    groups = CommunityGroupSerializer(many=True, read_only=True)

    class Meta:
        from .models import Community
        model = Community
        fields = ['id', 'name', 'description', 'creator', 'announcement_conversation', 'groups', 'created_at', 'updated_at']
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']


