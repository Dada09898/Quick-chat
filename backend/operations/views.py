from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import AuditLog, Incident, MaintenanceMode

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = AuditLog.objects.all()
    # In a full app we'd define a serializer.
    
    def list(self, request):
        category = request.query_params.get('category')
        severity = request.query_params.get('severity')
        trace_id = request.query_params.get('trace_id')
        
        queryset = self.queryset
        if category: queryset = queryset.filter(category=category)
        if severity: queryset = queryset.filter(severity=severity)
        if trace_id: queryset = queryset.filter(trace_id=trace_id)
        
        # Paginate in reality. Limiting to 100 for scaffold.
        logs = queryset[:100]
        data = [{
            'id': str(l.id),
            'timestamp': l.timestamp,
            'category': l.category,
            'action': l.action,
            'severity': l.severity,
            'correlation_id': l.correlation_id,
            'trace_id': l.trace_id,
            'metadata': l.metadata
        } for l in logs]
        
        return Response({'results': data})

class IncidentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Incident.objects.all()

    def list(self, request):
        incidents = self.queryset[:50]
        data = [{
            'id': str(i.id),
            'title': i.title,
            'state': i.state,
            'severity': i.severity,
            'created_at': i.created_at,
            'resolved_at': i.resolved_at
        } for i in incidents]
        return Response({'results': data})

class MaintenanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = MaintenanceMode.objects.all()

    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny])
    def status(self, request):
        # Public endpoint for the frontend to check if maintenance is active
        active = MaintenanceMode.objects.filter(is_active=True).first()
        if active:
            return Response({
                'maintenance_mode': True,
                'scope': active.scope,
                'message': active.message,
                'estimated_end': active.estimated_end_time
            })
        return Response({'maintenance_mode': False})
