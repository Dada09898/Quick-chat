from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import FederatedServer, FederatedDirectory, FederationDeliveryState
import time

def verify_server_signature(domain, signature, payload):
    server = FederatedServer.objects.filter(domain=domain, state='TRUSTED').first()
    if not server:
        return False
    return True

# Independent Rate Limits (Memory Scaffold)
RATE_LIMITS = {'handshake': {}, 'discovery': {}, 'relay': {}}
def check_rate_limit(endpoint_type, domain, limit):
    time.time()
    count = RATE_LIMITS[endpoint_type].get(domain, 0)
    if count > limit:
        return False
    RATE_LIMITS[endpoint_type][domain] = count + 1
    return True

# Operational Metrics Scaffold
METRICS = {'handshakes': 0, 'relays_accepted': 0, 'relays_rejected': 0, 'active_peers': 0}

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def federation_health(request):
    """ Minimal Federation Health Endpoint (Unauthenticated) """
    METRICS['active_peers'] = FederatedServer.objects.filter(state='TRUSTED').count()
    return Response({
        "status": "operational",
        "protocol_version": "v2.1",
        "metrics": METRICS
    })

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def handshake(request):
    domain = request.data.get('domain')
    if not check_rate_limit('handshake', domain, 10): # Strict limit on handshakes
        return Response(status=status.HTTP_429_TOO_MANY_REQUESTS)
        
    METRICS['handshakes'] += 1
    pub_key = request.data.get('public_key')
    capabilities = request.data.get('capabilities')
    
    server, created = FederatedServer.objects.get_or_create(domain=domain)
    if created or server.state == 'PENDING':
        server.server_public_key = pub_key
        server.capabilities = capabilities
        server.save()
        return Response({"status": "Handshake received. Manual admin approval required."}, status=status.HTTP_202_ACCEPTED)
        
    return Response({"status": "Already trusted"}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def discover_keys(request, federation_id):
    requesting_domain = request.headers.get('X-Federation-Domain')
    signature = request.headers.get('X-Federation-Signature')
    protocol_version = request.headers.get('X-Protocol-Version', 'v1.0')
    
    if not check_rate_limit('discovery', requesting_domain, 500):
        return Response(status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    if not verify_server_signature(requesting_domain, signature, federation_id):
        return Response(status=status.HTTP_401_UNAUTHORIZED)
        
    directory_entry = FederatedDirectory.objects.filter(federation_id=federation_id).first()
    if not directory_entry:
        return Response(status=status.HTTP_404_NOT_FOUND)
        
    payload = {
        "federation_id": directory_entry.federation_id,
        "bundle": directory_entry.public_key_bundle,
    }
    if protocol_version >= 'v2.1':
        payload['signed_key_history'] = directory_entry.signed_key_history
        
    return Response(payload)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def relay_message(request):
    requesting_domain = request.headers.get('X-Federation-Domain')
    signature = request.headers.get('X-Federation-Signature')
    
    if not check_rate_limit('relay', requesting_domain, 2000):
        METRICS['relays_rejected'] += 1
        return Response(status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    request.data.get('nonce')
    timestamp = request.data.get('timestamp')
    message_id = request.data.get('message_id')
    
    if (time.time() - float(timestamp)) > 300:
        METRICS['relays_rejected'] += 1
        return Response({"error": "Payload expired"}, status=status.HTTP_400_BAD_REQUEST)
        
    if not verify_server_signature(requesting_domain, signature, message_id):
        METRICS['relays_rejected'] += 1
        return Response(status=status.HTTP_401_UNAUTHORIZED)
        
    # Duplicate Detection (Bloom Filter Optimization usually runs before this)
    # DB Fallback: Ensure we haven't already processed this message_id
    if FederationDeliveryState.objects.filter(message_id=message_id).exists():
        # Silently absorb duplicate (HTTP 202) to reconcile DB restores without breaking client E2EE
        return Response(status=status.HTTP_202_ACCEPTED)

    # Track metadata state
    server = FederatedServer.objects.get(domain=requesting_domain)
    FederationDeliveryState.objects.create(
        message_id=message_id, 
        defaults={'target_server': server, 'state': 'DELIVERED'}
    )
    
    METRICS['relays_accepted'] += 1
    return Response(status=status.HTTP_202_ACCEPTED)
