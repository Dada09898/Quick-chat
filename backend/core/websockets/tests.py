import pytest
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken
from config.asgi import application
from users.models import CustomUser
from asgiref.sync import sync_to_async

@pytest.fixture
def create_test_user(db):
    user = CustomUser.objects.create_user(email='wsuser@test.com', password='pwd')
    return user

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_websocket_rejects_unauthenticated():
    communicator = WebsocketCommunicator(application, "/ws/realtime/")
    connected, subprotocol = await communicator.connect()
    
    # Should reject the connection because of AnonymousUser
    assert not connected
    await communicator.disconnect()

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_websocket_accepts_authenticated(create_test_user):
    user = await sync_to_async(CustomUser.objects.get)(email='wsuser@test.com')
    token = AccessToken.for_user(user)
    
    # Simulate HttpOnly cookie being passed in headers
    headers = [(b'cookie', f'access_token={str(token)}'.encode('utf-8'))]
    
    communicator = WebsocketCommunicator(application, "/ws/realtime/", headers=headers)
    connected, subprotocol = await communicator.connect()
    
    assert connected
    
    # The first message received should be the presence broadcast
    presence_msg = await communicator.receive_json_from()
    assert presence_msg["type"] == "presence.online"
    
    # Heartbeat test
    await communicator.send_json_to({"type": "heartbeat", "id": "123"})
    response = await communicator.receive_json_from()
    
    assert response["type"] == "ack"
    assert response["id"] == "123"
    
    await communicator.disconnect()
