from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/calls/', include('calls.urls')),
    path('api/vault/', include('vault.urls')),
    path('api/ops/', include('operations.urls')),
    path('api/enterprise/', include('enterprise.urls')),
    path('api/federation/', include('federation.urls')),
    path('health/', include('core.urls')),
]
