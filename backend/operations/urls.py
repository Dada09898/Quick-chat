from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, IncidentViewSet, MaintenanceViewSet

router = DefaultRouter()
router.register(r'audit', AuditLogViewSet, basename='audit')
router.register(r'incidents', IncidentViewSet, basename='incident')
router.register(r'maintenance', MaintenanceViewSet, basename='maintenance')

urlpatterns = [
    path('', include(router.urls)),
]
