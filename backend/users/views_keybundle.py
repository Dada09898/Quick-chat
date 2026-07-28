from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from users.models import Device
from users.models_prekey import SignedPreKey, OneTimePreKey, AuditLog


class SignedPreKeySerializer(serializers.Serializer):
    public_key = serializers.CharField()
    signature = serializers.CharField()
    key_id = serializers.IntegerField()


class OneTimePreKeySerializer(serializers.Serializer):
    public_key = serializers.CharField()
    key_id = serializers.IntegerField()


class KeyBundleUploadSerializer(serializers.Serializer):
    device_id = serializers.UUIDField()
    signed_pre_key = SignedPreKeySerializer()
    one_time_pre_keys = OneTimePreKeySerializer(many=True, required=False, default=[])


class KeyBundleUploadView(APIView):
    """Upload signed pre-key and one-time pre-keys for a device.
    
    POST /api/auth/devices/keys/upload/
    """
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = KeyBundleUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        try:
            device = Device.objects.get(
                id=data['device_id'],
                user=request.user
            )
        except Device.DoesNotExist:
            return Response(
                {'error': 'Device not found or does not belong to you'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Deactivate old signed pre-key
            SignedPreKey.objects.filter(
                device=device, is_active=True
            ).update(is_active=False)
            
            # Create new signed pre-key
            spk_data = data['signed_pre_key']
            SignedPreKey.objects.create(
                device=device,
                public_key=spk_data['public_key'],
                signature=spk_data['signature'],
                key_id=spk_data['key_id'],
                is_active=True
            )
            
            # Create one-time pre-keys
            otpks = data.get('one_time_pre_keys', [])
            OneTimePreKey.objects.bulk_create([
                OneTimePreKey(
                    device=device,
                    public_key=opk['public_key'],
                    key_id=opk['key_id']
                ) for opk in otpks
            ])
            
            # Audit log
            AuditLog.objects.create(
                user=request.user,
                action='key_bundle_upload',
                target_device=device,
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={
                    'signed_pre_key_id': spk_data['key_id'],
                    'one_time_pre_keys_count': len(otpks)
                }
            )
        
        remaining = OneTimePreKey.objects.filter(
            device=device, is_consumed=False
        ).count()
        
        return Response({
            'status': 'ok',
            'remaining_one_time_pre_keys': remaining
        }, status=status.HTTP_201_CREATED)
    
    def _get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class KeyBundleFetchView(APIView):
    """Fetch a user's key bundle for X3DH session establishment.
    
    GET /api/auth/devices/keys/<user_id>/
    
    Returns the identity keys, signed pre-key, and one one-time pre-key
    (if available) for the target user's device.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        devices = Device.objects.filter(
            user_id=user_id
        ).select_related('user')
        
        if not devices.exists():
            return Response(
                {'error': 'No devices found for user'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        bundles = []
        for device in devices:
            # Get active signed pre-key
            spk = SignedPreKey.objects.filter(
                device=device, is_active=True
            ).first()
            
            if not spk:
                continue
            
            # Consume one one-time pre-key (atomic)
            with transaction.atomic():
                otpk = OneTimePreKey.objects.select_for_update().filter(
                    device=device,
                    is_consumed=False
                ).first()
                
                otpk_data = None
                if otpk:
                    otpk.is_consumed = True
                    otpk.consumed_at = timezone.now()
                    otpk.consumed_by = request.user
                    otpk.save()
                    otpk_data = otpk.public_key
            
            bundles.append({
                'device_id': str(device.id),
                'device_name': device.device_name,
                'identity_key': device.public_key_ed25519,
                'exchange_key': device.public_key_x25519,
                'signed_pre_key': spk.public_key,
                'signed_pre_key_signature': spk.signature,
                'signed_pre_key_id': spk.key_id,
                'one_time_pre_key': otpk_data,
            })
        
        # Audit log
        AuditLog.objects.create(
            user=request.user,
            action='key_bundle_fetch',
            target_user_id=user_id,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={'device_count': len(bundles)}
        )
        
        # Check if any device is running low on pre-keys and log low_prekey_alert
        for device in devices:
            remaining = OneTimePreKey.objects.filter(
                device=device, is_consumed=False
            ).count()
            if remaining < 10:
                AuditLog.objects.create(
                    user=device.user,
                    action='key_bundle_upload',
                    target_device=device,
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={'warning': 'low_prekey_count', 'remaining': remaining}
                )
        
        return Response({'bundles': bundles})
    
    def _get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class PreKeyCountView(APIView):
    """Check remaining one-time pre-key count for a device.
    
    GET /api/auth/devices/keys/count/?device_id=<uuid>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        device_id = request.query_params.get('device_id')
        if not device_id:
            return Response(
                {'error': 'device_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            device = Device.objects.get(id=device_id, user=request.user)
        except Device.DoesNotExist:
            return Response(
                {'error': 'Device not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        remaining = OneTimePreKey.objects.filter(
            device=device, is_consumed=False
        ).count()
        
        return Response({
            'device_id': str(device.id),
            'remaining': remaining,
            'recommended_minimum': 20,
            'recommended_batch_size': 100
        })
