import pytest
from rest_framework.test import APIClient
from chat.models import Conversation, Message

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_full_user_journey(api_client):
    # 1. Register
    reg_res = api_client.post('/api/auth/register/', {
        'email': 'integration@enterprise.local',
        'password': 'StrongPassword123!',
        'username': 'integration'
    })
    assert reg_res.status_code == 201
    
    # 2. Login
    login_res = api_client.post('/api/auth/login/', {
        'email': 'integration@enterprise.local',
        'password': 'StrongPassword123!'
    })
    assert login_res.status_code == 200
    
    # Extract JWT cookie/header (SimpleJWT auth relies on cookies normally, but DRF test client handles cookies if we just let it flow, but let's force auth)
    # Actually, in our Custom auth CookieJWTAuthentication, cookies are used. The test client will automatically store cookies set in the response.
    
    # 3. Create Conversation
    conv_res = api_client.post('/api/chat/conversations/')
    assert conv_res.status_code == 201
    conv_id = conv_res.data['id']
    
    # 4. Send Message
    msg_res = api_client.post('/api/chat/messages/', {
        'conversation_id': conv_id,
        'ciphertext': 'e2ee_blob',
        'nonce': 'n1',
        'signature': 'sig1',
        'key_version': 1,
        'algorithm': 'aes-256-gcm'
    })
    assert msg_res.status_code == 201
    msg_id = msg_res.data['id']
    
    # 5. Fetch Messages (Receive)
    fetch_res = api_client.get(f'/api/chat/messages/?conversation_id={conv_id}')
    assert fetch_res.status_code == 200
    assert len(fetch_res.data['results']) == 1
    assert fetch_res.data['results'][0]['id'] == msg_id
    
    # 6. Logout
    logout_res = api_client.post('/api/auth/logout/')
    assert logout_res.status_code == 200
