import pytest
from rest_framework.test import APIClient
from users.models import CustomUser
from chat.models import Conversation, ConversationMember

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return CustomUser.objects.create_user(email='testapi@enterprise.local', password='pwd')

@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

@pytest.mark.django_db
def test_create_conversation(auth_client, user):
    response = auth_client.post('/api/chat/conversations/')
    assert response.status_code == 201
    assert 'id' in response.data
    
    conv_id = response.data['id']
    assert ConversationMember.objects.filter(conversation_id=conv_id, user=user).exists()

@pytest.mark.django_db
def test_list_conversations(auth_client, user):
    conv = Conversation.objects.create()
    ConversationMember.objects.create(conversation=conv, user=user)
    
    response = auth_client.get('/api/chat/conversations/')
    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['id'] == str(conv.id)

@pytest.mark.django_db
def test_list_messages_requires_membership(auth_client, user):
    conv = Conversation.objects.create()
    # User is not a member of conv
    response = auth_client.get(f'/api/chat/messages/?conversation_id={conv.id}')
    assert response.status_code == 200
    assert len(response.data['results']) == 0 # Empty because no membership

@pytest.mark.django_db
def test_create_message_requires_membership(auth_client, user):
    conv = Conversation.objects.create()
    response = auth_client.post('/api/chat/messages/', {
        'conversation_id': str(conv.id),
        'ciphertext': 'test',
        'nonce': 'test',
        'signature': 'test',
        'key_version': 1,
        'algorithm': 'aes-256-gcm'
    })
    assert response.status_code == 403

@pytest.mark.django_db
def test_upload_rejection_invalid_mime(auth_client):
    response = auth_client.post('/api/chat/api/media/upload/start/', {
        'chunk_count': 1,
        'mime_type': 'application/x-msdownload', # .exe
        'file_size': 1024
    })
    assert response.status_code == 400
    assert 'Invalid MIME type' in response.data['error']

@pytest.mark.django_db
def test_upload_rejection_file_too_large(auth_client):
    response = auth_client.post('/api/chat/api/media/upload/start/', {
        'chunk_count': 1,
        'mime_type': 'image/jpeg',
        'file_size': 100 * 1024 * 1024 # 100MB
    })
    assert response.status_code == 400
    assert 'maximum size' in response.data['error']
