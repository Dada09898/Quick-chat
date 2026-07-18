from django.urls import path
from .views import discover_keys, relay_message, handshake, federation_health

urlpatterns = [
    path('v1/keys/<str:federation_id>', discover_keys, name='federation-keys'),
    path('v1/relay', relay_message, name='federation-relay'),
    path('v1/handshake', handshake, name='federation-handshake'),
    path('v1/health', federation_health, name='federation-health'),
]
