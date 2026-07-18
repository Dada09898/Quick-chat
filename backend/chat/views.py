from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from .models import UploadSession, MediaAttachment
from core.storage import LocalStorageProvider

storage_provider = LocalStorageProvider()

class UploadStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chunk_count = request.data.get('chunk_count', 1)
        mime_type = request.data.get('mime_type', 'application/octet-stream')
        file_size = request.data.get('file_size', 0)
        
        ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4', 'audio/mpeg']
        MAX_FILE_SIZE = 50 * 1024 * 1024 # 50MB
        
        if mime_type not in ALLOWED_MIME_TYPES:
            return Response({'error': 'Invalid MIME type'}, status=status.HTTP_400_BAD_REQUEST)
        if int(file_size) > MAX_FILE_SIZE:
            return Response({'error': 'File exceeds maximum size'}, status=status.HTTP_400_BAD_REQUEST)
        
        session = UploadSession.objects.create(
            user=request.user,
            status='uploading',
            chunk_count=chunk_count,
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
            # Assembly and checksum verification
            s3_key = storage_provider.assemble_chunks(str(session.id), session.chunk_count, file_hash)
            
            session.status = 'completed'
            session.save()
            
            # Create MediaAttachment record
            attachment = MediaAttachment.objects.create(
                sender=request.user,
                s3_key=s3_key,
                file_hash=file_hash,
                chunk_count=session.chunk_count,
                status='completed'
            )
            
            return Response({
                'attachment_id': str(attachment.id),
                'url': storage_provider.get_presigned_url(s3_key)
            })
            
        except ValueError as e:
            session.status = 'failed'
            session.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Internal error during assembly'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework import viewsets, mixins, filters
from rest_framework.decorators import action
from .models import Conversation, ConversationMember, Message
from .serializers import ConversationSerializer, MessageSerializer
from .pagination import ConversationPagination, MessageCursorPagination
from .services import ChatService

class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    pagination_class = ConversationPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['last_activity']

    def get_queryset(self):
        # Optimize N+1 queries by prefetching members and their user profiles
        return Conversation.objects.filter(members__user=self.request.user).prefetch_related('members__user').distinct()
        
    def perform_create(self, serializer):
        conversation = serializer.save()
        ConversationMember.objects.create(conversation=conversation, user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        conversation = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        ConversationMember.objects.get_or_create(conversation=conversation, user_id=user_id)
        return Response({'status': 'Member added'})

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
            
        # Optimize N+1 queries by prefetching sender profiles and attachments
        return Message.objects.filter(conversation_id=conversation_id).select_related('sender').prefetch_related('attachments')

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
