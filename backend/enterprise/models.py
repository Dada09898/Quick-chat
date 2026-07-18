import uuid
from django.db import models
from users.models import CustomUser

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # SAML / OIDC Settings
    sso_enabled = models.BooleanField(default=False)
    idp_metadata_url = models.URLField(null=True, blank=True)
    scim_token = models.CharField(max_length=255, null=True, blank=True)

class OrganizationMember(models.Model):
    ROLES = [
        ('OWNER', 'Owner'),
        ('ORG_ADMIN', 'Organization Admin'),
        ('SECURITY_ADMIN', 'Security Admin'),
        ('COMPLIANCE_OFFICER', 'Compliance Officer'),
        ('IT_ADMIN', 'IT Administrator'),
        ('HELPDESK', 'Helpdesk'),
        ('AUDITOR', 'Auditor'),
        ('TEAM_ADMIN', 'Team Admin'),
        ('MEMBER', 'Member'),
        ('GUEST', 'Guest')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='enterprise_memberships')
    role = models.CharField(max_length=50, choices=ROLES, default='MEMBER')
    department = models.CharField(max_length=100, null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

class EnterprisePolicy(models.Model):
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='policy')
    
    require_mfa = models.BooleanField(default=False)
    require_biometrics = models.BooleanField(default=False)
    session_timeout_minutes = models.IntegerField(default=1440) # 24 hours
    
    allow_cloud_ai = models.BooleanField(default=True)
    allow_plugins = models.BooleanField(default=True)
    allow_exports = models.BooleanField(default=True)
    allow_clipboard_copy = models.BooleanField(default=True)
    
    require_device_approval = models.BooleanField(default=False)

class DeviceTrust(models.Model):
    STATES = [
        ('TRUSTED', 'Trusted'),
        ('PENDING', 'Pending Approval'),
        ('COMPROMISED', 'Compromised'),
        ('REVOKED', 'Revoked'),
        ('RETIRED', 'Retired')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    
    device_id = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=50) # WEB, DESKTOP, MOBILE
    state = models.CharField(max_length=20, choices=STATES, default='PENDING')
    
    last_seen = models.DateTimeField(auto_now=True)
    registered_at = models.DateTimeField(auto_now_add=True)
