from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include
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
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
