import pyotp
import qrcode
import base64
from io import BytesIO
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics
from django.db import transaction
from django.db.models import Q
from core.models import SecurityAuditLog
from .models import Device, Session, CustomUser, FriendRequest, Contact
from .serializers import UserSerializer, DeviceSerializer, SessionSerializer, RegisterSerializer, UserSearchSerializer, FriendRequestSerializer, ContactSerializer

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'error': 'Invalid credentials or account locked.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Optional TOTP enforcement
        if user.totp_secret:
            totp_code = request.data.get('totp_code')
            if not totp_code:
                return Response({'requires_2fa': True}, status=status.HTTP_200_OK)
            
            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(totp_code):
                return Response({'error': 'Invalid TOTP code'}, status=status.HTTP_401_UNAUTHORIZED)

        # Successful Auth
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Track Session
        ip_addr = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        session = Session.objects.create(
            user=user,
            ip_address=ip_addr,
            user_agent=user_agent,
            expires_at=timezone.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
        )
        
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        response = Response({
            'user': UserSerializer(user).data,
            'session_id': session.id
        }, status=status.HTTP_200_OK)
        
        # Set HttpOnly Cookies
        response.set_cookie(
            settings.SIMPLE_JWT['AUTH_COOKIE'],
            access_token,
            max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            httponly=True,
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        )
        response.set_cookie(
            'refresh_token',
            refresh_token,
            max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
            httponly=True,
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        )
        return response

class RefreshTokenView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'error': 'No refresh token'}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            refresh = RefreshToken(refresh_token)
            
            # SimpleJWT allows manual rotation
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            
            access_token = str(refresh.access_token)
            new_refresh_token = str(refresh)
            
            response = Response({'detail': 'Token refreshed'}, status=status.HTTP_200_OK)
            
            response.set_cookie(
                settings.SIMPLE_JWT['AUTH_COOKIE'],
                access_token,
                max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            )
            response.set_cookie(
                'refresh_token',
                new_refresh_token,
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            )
            return response
        except Exception:
            return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

import logging  # noqa: E402
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken  # noqa: E402

logger = logging.getLogger(__name__)

class LogoutView(views.APIView):
    def post(self, request):
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Remove FCM token from the device associated with the active session
            session = Session.objects.filter(user=request.user, ip_address=get_client_ip(request), is_active=True).first()
            if session and session.device:
                session.device.fcm_token = None
                session.device.save(update_fields=['fcm_token'])
        except Exception as e:
            logger.error(f"Failed to blacklist token during logout: {str(e)}")
            
        response = Response({'detail': 'Successfully logged out'}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie('refresh_token')
        return response

class GlobalLogoutView(views.APIView):
    def post(self, request):
        request.user.sessions.filter(is_active=True).update(is_active=False)
        
        # Blacklist all outstanding tokens for this user
        tokens = OutstandingToken.objects.filter(user=request.user)
        for token in tokens:
            try:
                BlacklistedToken.objects.get_or_create(token=token)
            except Exception as e:
                logger.error(f"Failed to blacklist global token: {str(e)}")
                
        response = Response({'detail': 'All devices logged out'}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
        response.delete_cookie('refresh_token')
        return response

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Auto-login after registration
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            
            ip_addr = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            session = Session.objects.create(
                user=user,
                ip_address=ip_addr,
                user_agent=user_agent,
                expires_at=timezone.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
            )
            
            response = Response({
                'user': UserSerializer(user).data,
                'session_id': session.id
            }, status=status.HTTP_201_CREATED)
            
            response.set_cookie(
                settings.SIMPLE_JWT['AUTH_COOKIE'],
                access_token,
                max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            )
            response.set_cookie(
                'refresh_token',
                str(refresh),
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CurrentUserView(views.APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)
        
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        user.is_active = False
        user.save()
        return Response({'status': 'Account deleted'}, status=status.HTTP_204_NO_CONTENT)

class ChangePasswordView(views.APIView):
    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not request.user.check_password(old_password):
            return Response({'error': 'Wrong password.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})

class PasswordResetView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        # Scaffold logic for Phase 1. Real implementation would dispatch celery email task.
        email = request.data.get('email')
        if not CustomUser.objects.filter(email=email).exists():
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Password reset link sent.'})

class EmailVerificationView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        return Response({'detail': 'Email verified.'})

class TOTPSetupView(views.APIView):
    def post(self, request):
        if request.user.totp_secret:
            return Response({'error': 'TOTP already setup'}, status=status.HTTP_400_BAD_REQUEST)
            
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(name=request.user.email, issuer_name='DualConnect')
        
        img = qrcode.make(provisioning_uri)
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        # We store it temporarily. In production, store in cache until verified.
        # For simplicity, we just return it and require verification in the same flow.
        
        return Response({
            'secret': secret,
            'qr_code': f"data:image/png;base64,{qr_base64}"
        })

class TOTPVerifyView(views.APIView):
    def post(self, request):
        secret = request.data.get('secret')
        code = request.data.get('code')
        
        if not secret or not code:
            return Response({'error': 'Missing data'}, status=status.HTTP_400_BAD_REQUEST)
            
        totp = pyotp.TOTP(secret)
        if totp.verify(code):
            request.user.totp_secret = secret
            request.user.save()
            return Response({'detail': 'TOTP verified and saved.'})
        return Response({'error': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)

class DeviceListView(views.APIView):
    def get(self, request):
        devices = Device.objects.filter(user=request.user)
        return Response(DeviceSerializer(devices, many=True).data)

class DeviceRegisterView(views.APIView):
    def post(self, request):
        serializer = DeviceSerializer(data=request.data)
        if serializer.is_valid():
            device = serializer.save(user=request.user, is_verified=True) # Auto-verified for now
            
            # Associate device with current session if possible
            session = Session.objects.filter(user=request.user, ip_address=get_client_ip(request), is_active=True).first()
            if session:
                session.device = device
                session.save(update_fields=['device'])
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeviceDetailView(views.APIView):
    def patch(self, request, pk):
        try:
            device = Device.objects.get(pk=pk, user=request.user)
        except Device.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        serializer = DeviceSerializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SessionListView(views.APIView):
    def get(self, request):
        sessions = Session.objects.filter(user=request.user, is_active=True)
        return Response(SessionSerializer(sessions, many=True).data)

class UserSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if not query or len(query) < 2:
            return CustomUser.objects.none()
        
        return CustomUser.objects.filter(
            Q(email__icontains=query) | Q(username__icontains=query) | Q(display_name__icontains=query),
            is_active=True,
            deleted_at__isnull=True
        ).exclude(id=self.request.user.id)[:20]

class FriendRequestCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get('target_user_id')
        try:
            target_user = CustomUser.objects.get(id=target_user_id, is_active=True, deleted_at__isnull=True)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if target_user == request.user:
            return Response({'error': 'Cannot send friend request to yourself'}, status=400)

        if Contact.objects.filter(owner=request.user, user=target_user, deleted_at__isnull=True).exists():
            return Response({'error': 'User is already a contact'}, status=400)

        with transaction.atomic():
            req, created = FriendRequest.objects.get_or_create(
                sender=request.user,
                receiver=target_user,
                status='pending',
                deleted_at__isnull=True
            )
            if created:
                SecurityAuditLog.objects.create(
                    event_type='FRIEND_REQUEST_SENT',
                    severity='INFO',
                    category='RELATIONSHIP',
                    user=request.user,
                    metadata={'target_user_id': str(target_user.id), 'request_id': str(req.id)}
                )
                return Response(FriendRequestSerializer(req).data, status=201)
            return Response({'error': 'Pending request already exists'}, status=400)

class FriendRequestRespondView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get('action') # 'accept' or 'reject'
        try:
            req = FriendRequest.objects.get(id=pk, receiver=request.user, status='pending', deleted_at__isnull=True)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Request not found or already processed'}, status=404)

        if action not in ['accept', 'reject']:
            return Response({'error': 'Invalid action'}, status=400)

        with transaction.atomic():
            req.status = action
            req.responded_at = timezone.now()
            req.save()

            if action == 'accept':
                Contact.objects.get_or_create(owner=req.sender, user=req.receiver, deleted_at__isnull=True)
                Contact.objects.get_or_create(owner=req.receiver, user=req.sender, deleted_at__isnull=True)
                
            SecurityAuditLog.objects.create(
                event_type=f'FRIEND_REQUEST_{action.upper()}',
                severity='INFO',
                category='RELATIONSHIP',
                user=request.user,
                metadata={'sender_id': str(req.sender.id), 'request_id': str(req.id)}
            )
            
        return Response({'status': 'success', 'action': action})

class ContactListView(generics.ListAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Contact.objects.filter(owner=self.request.user, deleted_at__isnull=True).select_related('user')

class PendingRequestsView(generics.ListAPIView):
    serializer_class = FriendRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FriendRequest.objects.filter(receiver=self.request.user, status='pending', deleted_at__isnull=True).select_related('sender')


class DeviceListView(generics.ListAPIView):
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Device.objects.filter(user=self.request.user)


class DeviceQrPairView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = base64.b32encode(pyotp.random_bytes(10)).decode('utf-8')
        qr_img = qrcode.make(f"quickchat://pair?token={token}")
        buffer = BytesIO()
        qr_img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return Response({
            'pairing_token': token,
            'qr_code': f"data:image/png;base64,{qr_base64}",
            'expires_in': 180
        })

