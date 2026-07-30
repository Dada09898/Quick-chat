from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from django.utils import timezone
from datetime import timedelta

from .models import UploadSession, MediaAttachment, Conversation, ConversationMember, Message
from .serializers import ConversationSerializer, MessageSerializer
from .pagination import ConversationPagination, MessageCursorPagination
from .services import ChatService
from core.storage import LocalStorageProvider

storage_provider = LocalStorageProvider()

class UploadStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chunk_count = request.data.get('chunk_count', 1)
        mime_type = request.data.get('mime_type', 'application/octet-stream')
        file_size = request.data.get('file_size', 0)
        
        MAX_FILE_SIZE = 100 * 1024 * 1024 # 100MB
        
        # Flexible MIME validation allowing images, videos, audio, documents, and encrypted octet-streams
        is_valid_mime = (
            mime_type == 'application/octet-stream' or
            mime_type.startswith(('image/', 'video/', 'audio/', 'text/', 'application/'))
        )
        
        if not is_valid_mime:
            return Response({'error': 'Invalid MIME type'}, status=status.HTTP_400_BAD_REQUEST)
        if int(file_size or 0) > MAX_FILE_SIZE:
            return Response({'error': 'File exceeds maximum size'}, status=status.HTTP_400_BAD_REQUEST)
        
        original_filename = request.data.get('filename', '')

        session = UploadSession.objects.create(
            user=request.user,
            status='uploading',
            chunk_count=chunk_count,
            mime_type=mime_type,
            original_filename=original_filename,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        return Response({
            'session_id': str(session.id),
            'chunk_size_bytes': 5 * 1024 * 1024, # Suggest 5MB but adaptive is handled by client
        }, status=status.HTTP_201_CREATED)

class UploadChunkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = UploadSession.objects.get(id=session_id, user=request.user, status='uploading')
        except UploadSession.DoesNotExist:
            return Response({'error': 'Session not found or invalid'}, status=status.HTTP_404_NOT_FOUND)
            
        chunk_index = int(request.data.get('chunk_index', 0))
        chunk_data = request.FILES.get('chunk')
        
        if not chunk_data:
            return Response({'error': 'Missing chunk data'}, status=status.HTTP_400_BAD_REQUEST)
            
        if chunk_index < 0 or chunk_index >= session.chunk_count:
            return Response({'error': 'Invalid chunk index'}, status=status.HTTP_400_BAD_REQUEST)
            
        if chunk_data.size > 10 * 1024 * 1024: # 10MB chunk max
            return Response({'error': 'Chunk size too large'}, status=status.HTTP_400_BAD_REQUEST)
            
        storage_provider.save_chunk(str(session.id), chunk_index, chunk_data.read())
        
        session.completed_chunks += 1
        session.save()
        
        return Response({'status': 'ok'})

class UploadCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = UploadSession.objects.get(id=session_id, user=request.user, status='uploading')
        except UploadSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
            
        file_hash = request.data.get('file_hash')
        if not file_hash:
            return Response({'error': 'Missing file_hash'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ext = 'bin'
            if session.original_filename and '.' in session.original_filename:
                ext = session.original_filename.split('.')[-1].lower()
            elif '/' in session.mime_type:
                ext = session.mime_type.split('/')[-1].lower()

            # Assembly and checksum verification with extension preservation
            s3_key = storage_provider.assemble_chunks(str(session.id), session.chunk_count, file_hash, ext)
            
            session.status = 'completed'
            session.save()
            
            # Create MediaAttachment record
            attachment = MediaAttachment.objects.create(
                sender=request.user,
                s3_key=s3_key,
                file_hash=file_hash,
                chunk_count=session.chunk_count,
                mime_type=session.mime_type,
                original_filename=session.original_filename,
                status='completed'
            )
            
            return Response({
                'attachment_id': str(attachment.id),
                'url': storage_provider.get_presigned_url(s3_key),
                'mime_type': attachment.mime_type,
                'filename': attachment.original_filename
            })
            
        except ValueError as e:
            session.status = 'failed'
            session.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Internal error during assembly'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    pagination_class = ConversationPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['last_activity']

    def get_queryset(self):
        # Optimize N+1 queries by prefetching members and their user profiles
        return Conversation.objects.filter(members__user=self.request.user, deleted_at__isnull=True).prefetch_related('members__user').distinct()
        
    def perform_create(self, serializer):
        conversation = serializer.save()
        # Add creator as admin
        ConversationMember.objects.create(conversation=conversation, user=self.request.user, role='admin')
        
        # Add additional member IDs if provided
        member_ids = self.request.data.get('member_ids', [])
        for m_id in member_ids:
            if str(m_id) != str(self.request.user.id):
                ConversationMember.objects.get_or_create(conversation=conversation, user_id=m_id)

    @action(detail=False, methods=['post'])
    def get_or_create(self, request):
        from django.db import transaction, IntegrityError
        from hashlib import sha256
        
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({'error': 'target_user_id required'}, status=status.HTTP_400_BAD_REQUEST)
            
        user1_id = str(request.user.id)
        user2_id = str(target_user_id)
        
        if user1_id == user2_id:
            return Response({'error': 'Cannot create conversation with yourself'}, status=status.HTTP_400_BAD_REQUEST)
            
        sorted_ids = sorted([user1_id, user2_id])
        hash_str = f"{sorted_ids[0]}:{sorted_ids[1]}"
        direct_hash = sha256(hash_str.encode('utf-8')).hexdigest()
        
        try:
            with transaction.atomic():
                conversation = Conversation.objects.create(
                    is_direct=True,
                    direct_hash=direct_hash
                )
                ConversationMember.objects.create(conversation=conversation, user_id=user1_id)
                ConversationMember.objects.create(conversation=conversation, user_id=user2_id)
                
                # Fetch it back fully serialized
                serializer = self.get_serializer(conversation)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            # Race condition or already exists, fetch it
            conversation = Conversation.objects.get(direct_hash=direct_hash, deleted_at__isnull=True)
            serializer = self.get_serializer(conversation)
            return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        conversation = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        ConversationMember.objects.get_or_create(conversation=conversation, user_id=user_id)
        return Response({'status': 'Member added'})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        conversation = self.get_object()
        ConversationMember.objects.filter(conversation=conversation, user=request.user).delete()
        return Response({'status': 'Left conversation'})

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        conversation = self.get_object()
        member, _ = ConversationMember.objects.get_or_create(conversation=conversation, user=request.user)
        member.is_pinned = not member.is_pinned
        member.save()
        return Response({'status': 'ok', 'is_pinned': member.is_pinned})

    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        conversation = self.get_object()
        member, _ = ConversationMember.objects.get_or_create(conversation=conversation, user=request.user)
        member.is_muted = not member.is_muted
        member.save()
        return Response({'status': 'ok', 'is_muted': member.is_muted})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        conversation = self.get_object()
        member, _ = ConversationMember.objects.get_or_create(conversation=conversation, user=request.user)
        member.is_archived = not member.is_archived
        member.save()
        return Response({'status': 'ok', 'is_archived': member.is_archived})

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        from django.utils import timezone
        conversation = self.get_object()
        Message.objects.filter(conversation=conversation).update(deleted_at=timezone.now())
        return Response({'status': 'ok', 'message': 'Chat cleared'})

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        ConversationMember.objects.filter(user=request.user).update(unread_count_cache=0)
        return Response({'status': 'ok', 'message': 'All chats marked as read'})


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = MessageCursorPagination

    def get_queryset(self):
        conversation_id = self.request.query_params.get('conversation_id')
        if not conversation_id:
            return Message.objects.none()
            
        # Ensure user is a member of the requested conversation
        if not ConversationMember.objects.filter(conversation_id=conversation_id, user=self.request.user).exists():
            return Message.objects.none()
            
        # Optimize N+1 queries by prefetching sender profiles, attachments, and reactions
        return Message.objects.filter(conversation_id=conversation_id).select_related('sender').prefetch_related('attachments', 'reactions')

    def create(self, request, *args, **kwargs):
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response({'error': 'conversation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not ConversationMember.objects.filter(conversation_id=conversation_id, user=request.user).exists():
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        # We route message creation through ChatService for crypto validation and sequence increment
        try:
            message = ChatService.process_incoming_message(request.user, request.data)
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        from .models import MessageBookmark
        message = self.get_object()
        bookmark, created = MessageBookmark.objects.get_or_create(message=message, user=request.user)
        if not created:
            bookmark.delete()
            starred = False
        else:
            starred = True
        return Response({'status': 'ok', 'is_starred': starred})

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        from .models import MessageReaction
        message = self.get_object()
        reaction_text = request.data.get('reaction', '')
        if not reaction_text:
            MessageReaction.objects.filter(message=message, user=request.user).delete()
            return Response({'status': 'reaction_removed'})
        
        MessageReaction.objects.update_or_create(
            message=message,
            user=request.user,
            defaults={'reaction_ciphertext': reaction_text}
        )
        return Response({'status': 'reacted', 'reaction': reaction_text})



class UserStatusViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from .models import UserStatus
        now = timezone.now()
        return UserStatus.objects.filter(expires_at__gt=now).select_related('user').prefetch_related('views__viewer')

    def get_serializer_class(self):
        from .serializers import UserStatusSerializer
        return UserStatusSerializer

    def create(self, request, *args, **kwargs):
        from .models import UserStatus
        from .serializers import UserStatusSerializer

        status_type = request.data.get('status_type', request.data.get('type', 'text'))
        content = request.data.get('content', '')
        caption = request.data.get('caption', '')
        bg_color = request.data.get('background_color', request.data.get('backgroundColor', '#005c4b'))
        font_family = request.data.get('font_family', request.data.get('fontFamily', 'sans-serif'))
        privacy = request.data.get('privacy', 'contacts')

        if not content:
            return Response({'error': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)

        expires_at = timezone.now() + timedelta(hours=24)
        status_obj = UserStatus.objects.create(
            user=request.user,
            status_type=status_type,
            content=content,
            caption=caption,
            background_color=bg_color,
            font_family=font_family,
            privacy=privacy,
            expires_at=expires_at
        )

        return Response(UserStatusSerializer(status_obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        from .models import StatusView
        status_obj = self.get_object()
        StatusView.objects.get_or_create(status=status_obj, viewer=request.user)
        return Response({'status': 'viewed'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        status_obj = self.get_object()
        reaction_emoji = request.data.get('reaction', '❤️')
        reply_text = request.data.get('reply_text', '')

        return Response({
            'status': 'reacted',
            'reaction': reaction_emoji,
            'reply_text': reply_text,
            'status_id': str(status_obj.id),
            'target_user_id': str(status_obj.user_id)
        }, status=status.HTTP_200_OK)


class CommunityViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from .models import Community
        return Community.objects.filter(creator=self.request.user).select_related('creator').prefetch_related('groups')

    def get_serializer_class(self):
        from .serializers import CommunitySerializer
        return CommunitySerializer

    def create(self, request, *args, **kwargs):
        from .models import Community, Conversation, ConversationMember, CommunityGroup
        from .serializers import CommunitySerializer

        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()

        if not name:
            return Response({'error': 'Community name is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Create Announcement Conversation
        announcement_conv = Conversation.objects.create(is_direct=False)
        ConversationMember.objects.create(conversation=announcement_conv, user=request.user, role='admin')

        # 2. Create Community
        community = Community.objects.create(
            name=name,
            description=description,
            creator=request.user,
            announcement_conversation=announcement_conv
        )

        # 3. Add default sub-groups if specified
        sub_groups = request.data.get('sub_groups', ['General Updates', 'Announcements'])
        for group_title in sub_groups:
            sub_conv = Conversation.objects.create(is_direct=False)
            ConversationMember.objects.create(conversation=sub_conv, user=request.user, role='admin')
            CommunityGroup.objects.create(community=community, conversation=sub_conv, group_name=group_title)

        return Response(CommunitySerializer(community).data, status=status.HTTP_201_CREATED)



