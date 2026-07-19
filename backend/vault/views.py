from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db import transaction
from .models import VaultItem, VaultItemVersion

class VaultItemViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        sync_version = int(request.query_params.get('since', 0))
        items = VaultItem.objects.filter(owner=request.user, sync_version__gt=sync_version)
        
        # In a real app we'd use serializers, keeping it simple for the architectural scaffold
        result = []
        for item in items:
            result.append({
                'id': str(item.id),
                'folder_id': str(item.folder.id) if item.folder else None,
                'item_type': item.item_type,
                'ciphertext': item.ciphertext,
                'wrapped_key': item.wrapped_key,
                'key_version': item.key_version,
                'algorithm': item.algorithm,
                'sync_version': item.sync_version,
                'version': item.version,
                'is_deleted': item.is_deleted,
            })
        return Response({'items': result})

    @transaction.atomic
    def create(self, request):
        data = request.data
        item = VaultItem.objects.create(
            owner=request.user,
            folder_id=data.get('folder_id'),
            item_type=data.get('item_type'),
            ciphertext=data.get('ciphertext'),
            wrapped_key=data.get('wrapped_key'),
            key_version=data.get('key_version', 1),
            algorithm=data.get('algorithm', 'AES-256-GCM'),
            sync_version=self._get_next_sync_version(request.user),
            version=1
        )
        self._create_version(item)
        return Response({'id': str(item.id), 'sync_version': item.sync_version})

    @transaction.atomic
    def update(self, request, pk=None):
        try:
            item = VaultItem.objects.get(id=pk, owner=request.user)
        except VaultItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        data = request.data
        
        # Conflict resolution check
        client_version = data.get('version')
        if client_version and client_version < item.version:
            return Response({'error': 'conflict', 'current_version': item.version}, status=status.HTTP_409_CONFLICT)

        item.ciphertext = data.get('ciphertext', item.ciphertext)
        item.wrapped_key = data.get('wrapped_key', item.wrapped_key)
        item.key_version = data.get('key_version', item.key_version)
        item.folder_id = data.get('folder_id', item.folder_id)
        
        item.version += 1
        item.sync_version = self._get_next_sync_version(request.user)
        item.save()
        
        self._create_version(item)
        return Response({'sync_version': item.sync_version, 'version': item.version})

    def _get_next_sync_version(self, user):
        # Extremely simplified sequencer. In prod use Redis INCR or a sequence table.
        latest = VaultItem.objects.filter(owner=user).order_by('-sync_version').first()
        return (latest.sync_version + 1) if latest else 1

    def _create_version(self, item):
        VaultItemVersion.objects.create(
            item=item,
            ciphertext=item.ciphertext,
            wrapped_key=item.wrapped_key,
            key_version=item.key_version,
            algorithm=item.algorithm,
            version=item.version
        )
