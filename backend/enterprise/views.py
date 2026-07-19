from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Organization, OrganizationMember, DeviceTrust

class IsEnterpriseAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Check if user has an elevated role in ANY organization they belong to
        memberships = OrganizationMember.objects.filter(user=request.user)
        elevated = ['OWNER', 'ORG_ADMIN', 'SECURITY_ADMIN', 'IT_ADMIN']
        return memberships.filter(role__in=elevated).exists()

class DeviceTrustViewSet(viewsets.ModelViewSet):
    permission_classes = [IsEnterpriseAdmin]
    queryset = DeviceTrust.objects.all()

    def list(self, request):
        # Scaffold response
        org = OrganizationMember.objects.filter(user=request.user).first().organization
        devices = DeviceTrust.objects.filter(organization=org)
        
        data = [{
            'id': str(d.id),
            'device_id': d.device_id,
            'user': d.user.email,
            'platform': d.platform,
            'state': d.state,
            'last_seen': d.last_seen
        } for d in devices]
        return Response({'results': data})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def scim_users_endpoint(request):
    """
    SCIM 2.0 Mock Endpoint for User Provisioning.
    Validates the bearer token against the Organization.scim_token.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return Response(status=status.HTTP_401_UNAUTHORIZED)
        
    token = auth_header.split(' ')[1]
    org = Organization.objects.filter(scim_token=token).first()
    
    if not org:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    # In reality, we'd parse the SCIM JSON schema payload here
    # email = request.data.get('emails')[0].get('value')
    # and provision a CustomUser and an OrganizationMember.
    
    return Response({
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "id": "mock-scim-id",
        "active": True
    }, status=status.HTTP_201_CREATED)

# Mock endpoint for SSO flow
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def sso_login(request):
    # IdP redirect logic here
    return Response({"redirect_url": "https://idp.example.com/saml2/sso"})
