from django.urls import path
from .views import (
    LoginView, RefreshTokenView, LogoutView, GlobalLogoutView, 
    CurrentUserView, TOTPSetupView, TOTPVerifyView,
    DeviceListView, DeviceRegisterView, DeviceDetailView, DeviceQrPairView, SessionListView,
    RegisterView, ChangePasswordView, PasswordResetView, EmailVerificationView,
    UserSearchView, FriendRequestCreateView, FriendRequestRespondView, ContactListView, PendingRequestsView,
    SupportTicketView, AISettingView
)
from .views_avatar import AvatarUploadView
from .views_keybundle import KeyBundleUploadView, KeyBundleFetchView, PreKeyCountView
from .views_username import UsernameAvailabilityView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('logout/global/', GlobalLogoutView.as_view(), name='global_logout'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('me/avatar/', AvatarUploadView.as_view(), name='avatar_upload'),
    path('password/change/', ChangePasswordView.as_view(), name='change_password'),
    path('password/reset/', PasswordResetView.as_view(), name='password_reset'),
    path('verify-email/', EmailVerificationView.as_view(), name='verify_email'),
    path('totp/setup/', TOTPSetupView.as_view(), name='totp_setup'),
    path('totp/verify/', TOTPVerifyView.as_view(), name='totp_verify'),
    path('devices/', DeviceListView.as_view(), name='device_list'),
    path('devices/qr/', DeviceQrPairView.as_view(), name='device_qr_pair'),
    path('devices/register/', DeviceRegisterView.as_view(), name='device_register'),
    path('devices/<uuid:pk>/', DeviceDetailView.as_view(), name='device_detail'),
    path('devices/keys/upload/', KeyBundleUploadView.as_view(), name='key_bundle_upload'),
    path('devices/keys/count/', PreKeyCountView.as_view(), name='prekey_count'),
    path('devices/keys/<uuid:user_id>/', KeyBundleFetchView.as_view(), name='key_bundle_fetch'),
    path('sessions/', SessionListView.as_view(), name='session_list'),
    path('search/', UserSearchView.as_view(), name='user_search'),
    path('username/available/', UsernameAvailabilityView.as_view(), name='username_available'),
    path('friends/requests/', PendingRequestsView.as_view(), name='pending_requests'),
    path('friends/request/', FriendRequestCreateView.as_view(), name='send_request'),
    path('friends/request/<uuid:pk>/respond/', FriendRequestRespondView.as_view(), name='respond_request'),
    path('contacts/', ContactListView.as_view(), name='contact_list'),
    path('support/tickets/', SupportTicketView.as_view(), name='support_tickets'),
    path('ai/settings/', AISettingView.as_view(), name='ai_settings'),
]
