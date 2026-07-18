from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceTrustViewSet, scim_users_endpoint, sso_login

router = DefaultRouter()
router.register(r'devices', DeviceTrustViewSet, basename='device')

urlpatterns = [
    path('', include(router.urls)),
    path('scim/v2/Users', scim_users_endpoint, name='scim-users'),
    path('sso/login', sso_login, name='sso-login'),
]
