from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.views.static import serve
from core.views import TelemetryView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/calls/', include('calls.urls')),
    path('api/vault/', include('vault.urls')),
    path('api/ops/', include('operations.urls')),
    path('api/enterprise/', include('enterprise.urls')),
    path('api/federation/', include('federation.urls')),
    path('api/telemetry/', TelemetryView.as_view(), name='telemetry'),
    path('health/', include('core.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
