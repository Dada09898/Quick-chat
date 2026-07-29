from rest_framework import serializers
from users.serializers import UserSerializer
from .models import Conversation, ConversationMember, Message, MediaAttachment, MessageReaction


class ConversationMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ['id', 'user', 'session_key_version', 'is_pinned', 'is_muted', 'is_archived', 'joined_at']


class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'last_message_id', 'last_activity', 'version', 'unread_count_cache', 'created_at', 'members']


class MediaAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAttachment
        fields = ['id', 's3_key', 'thumbnail_s3_key', 'file_hash', 'key_version', 'algorithm', 'chunk_count', 'status']


class MessageReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'reaction_ciphertext', 'nonce', 'signature']


class MessageSerializer(serializers.ModelSerializer):
    attachments = MediaAttachmentSerializer(many=True, read_only=True)
    sender = UserSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sequence_number', 'sender', 'reply_to',
            'ciphertext', 'nonce', 'signature', 'key_version', 'algorithm',
            'is_edited', 'created_at', 'server_timestamp', 'attachments', 'reactions'
        ]
        read_only_fields = ['id', 'sequence_number', 'sender', 'server_timestamp']
