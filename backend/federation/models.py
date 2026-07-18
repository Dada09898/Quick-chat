import uuid
from django.db import models

class FederatedServer(models.Model):
    STATES = [
        ('PENDING', 'Handshake Pending'),
        ('TRUSTED', 'Trusted'),
        ('REVOKED', 'Trust Revoked')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain = models.CharField(max_length=255, unique=True, db_index=True)
    
    # Active Identity Key
    server_public_key = models.CharField(max_length=255) 
    
    # Signed Key History for seamless rotation verification
    key_history = models.JSONField(default=list, help_text="List of previous keys signed by their successors")
    
    state = models.CharField(max_length=20, choices=STATES, default='PENDING')
    
    # Capability Negotiation (Protocol Version, Voice, Video, AI, Plugins, Attachments)
    capabilities = models.JSONField(default=dict)
    negotiated_policy = models.JSONField(default=dict)
    
    protocol_version = models.CharField(max_length=10, default='v2.1')
    
    last_handshake = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

class FederatedDirectory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    federation_id = models.CharField(max_length=255, unique=True, db_index=True) 
    display_name = models.CharField(max_length=255, null=True, blank=True)
    server = models.ForeignKey(FederatedServer, on_delete=models.CASCADE)
    
    public_key_bundle = models.JSONField() 
    # Key Transparency History
    signed_key_history = models.JSONField(default=list)
    
    updated_at = models.DateTimeField(auto_now=True)

class FederationDeliveryState(models.Model):
    """ Tracks the delivery lifecycle of cross-server messages (Metadata only) """
    STATES = [
        ('ACCEPTED', 'Accepted by Local Server'),
        ('QUEUED', 'Queued for Remote Transmission'),
        ('DELIVERED', 'Delivered to Remote Server'),
        ('CLIENT_RECEIVED', 'Received by Remote Client'),
        ('READ', 'Read by Remote Client'),
        ('FAILED', 'Delivery Failed'),
        ('EXPIRED', 'Delivery Expired'),
        ('REJECTED', 'Delivery Rejected by Policy')
    ]
    
    message_id = models.CharField(max_length=255, primary_key=True)
    target_server = models.ForeignKey(FederatedServer, on_delete=models.CASCADE)
    state = models.CharField(max_length=20, choices=STATES, default='ACCEPTED')
    updated_at = models.DateTimeField(auto_now=True)

class SignedRevocationRecord(models.Model):
    """ Immutable ledger of cryptographic revocations for audit metadata """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    server = models.ForeignKey(FederatedServer, on_delete=models.CASCADE)
    revoked_key = models.CharField(max_length=255)
    
    # The cryptographic signature proving authorization of the revocation
    revocation_signature = models.TextField() 
    
    reason = models.CharField(max_length=255)
    revoked_at = models.DateTimeField(auto_now_add=True)

