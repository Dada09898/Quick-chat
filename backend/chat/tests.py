import pytest
import uuid6
import base64
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from django.utils import timezone as django_timezone

from chat.models import Conversation, ConversationMember
from users.models import CustomUser, Device
from chat.services import ChatService

@pytest.fixture
def test_user_and_device(db):
    user = CustomUser.objects.create_user(email='chat_user@test.com', password='pwd')
    
    # Generate Ed25519 key pair for tests
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    device = Device.objects.create(
        user=user,
        device_name='Test Device',
        public_key_ed25519=base64.b64encode(public_bytes).decode('utf-8'),
        public_key_x25519='mock_x25519',
        is_verified=True
    )
    
    return user, device, private_key

@pytest.fixture
def conversation(test_user_and_device):
    user, _, _ = test_user_and_device
    conv = Conversation.objects.create()
    ConversationMember.objects.create(conversation=conv, user=user)
    return conv

@pytest.mark.django_db
def test_process_incoming_message(test_user_and_device, conversation):
    user, device, private_key = test_user_and_device
    
    msg_id = str(uuid6.uuid7())
    ciphertext = "base64_encrypted_mock"
    
    # Sign: msg_id|ciphertext
    payload_to_verify = f"{msg_id}|{ciphertext}".encode('utf-8')
    signature = private_key.sign(payload_to_verify)
    signature_base64 = base64.b64encode(signature).decode('utf-8')
    
    data = {
        'id': msg_id,
        'conversation_id': str(conversation.id),
        'device_id': str(device.id),
        'ciphertext': ciphertext,
        'nonce': 'mock_nonce',
        'signature': signature_base64,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    msg = ChatService.process_incoming_message(user, data)
    assert str(msg.id) == msg_id
    assert msg.sequence_number == 2 # Initial version=1, +1 = 2
    assert msg.ciphertext == ciphertext

@pytest.mark.django_db
def test_message_rejects_invalid_signature(test_user_and_device, conversation, monkeypatch):
    monkeypatch.setattr('chat.services._is_e2ee_required', lambda: True)
    user, device, private_key = test_user_and_device
    msg_id = str(uuid6.uuid7())
    
    data = {
        'id': msg_id,
        'conversation_id': str(conversation.id),
        'device_id': str(device.id),
        'ciphertext': "text",
        'nonce': 'mock_nonce',
        'signature': "invalid_base64_signature==",
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    with pytest.raises(ValueError, match="Invalid Ed25519 signature"):
        ChatService.process_incoming_message(user, data)

@pytest.mark.django_db
def test_replay_protection_window(test_user_and_device, conversation):
    user, device, private_key = test_user_and_device
    msg_id = str(uuid6.uuid7())
    
    # 48 hours ago - should be rejected by 24 hour window
    old_time = datetime.now(timezone.utc) - django_timezone.timedelta(hours=48)
    
    data = {
        'id': msg_id,
        'conversation_id': str(conversation.id),
        'device_id': str(device.id),
        'ciphertext': "text",
        'nonce': 'mock_nonce',
        'signature': "mock",
        'created_at': old_time.isoformat()
    }
    
    with pytest.raises(ValueError, match="Timestamp outside acceptable window"):
        ChatService.process_incoming_message(user, data)
