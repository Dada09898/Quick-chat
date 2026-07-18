from django.urls import path
from .views import (
    LoginView, RefreshTokenView, LogoutView, GlobalLogoutView, 
    CurrentUserView, TOTPSetupView, TOTPVerifyView,
    DeviceListView, DeviceRegisterView, DeviceDetailView, SessionListView,
    RegisterView, ChangePasswordView, PasswordResetView, EmailVerificationView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('logout/global/', GlobalLogoutView.as_view(), name='global_logout'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('password/change/', ChangePasswordView.as_view(), name='change_password'),
    path('password/reset/', PasswordResetView.as_view(), name='password_reset'),
    path('verify-email/', EmailVerificationView.as_view(), name='verify_email'),
    path('totp/setup/', TOTPSetupView.as_view(), name='totp_setup'),
    path('totp/verify/', TOTPVerifyView.as_view(), name='totp_verify'),
    path('devices/', DeviceListView.as_view(), name='device_list'),
    path('devices/register/', DeviceRegisterView.as_view(), name='device_register'),
    path('devices/<uuid:pk>/', DeviceDetailView.as_view(), name='device_detail'),
    path('sessions/', SessionListView.as_view(), name='session_list'),
]
