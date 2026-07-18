import pytest
import json
from channels.testing import WebsocketCommunicator
from config.asgi import application
from users.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken
from chat.models import Conversation, ConversationMember

@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(email='ws_sec@enterprise.local', password='pwd')

@pytest.fixture
def get_token(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_rate_limiting(user, get_token):
    headers = [(b"cookie", f"access_token={get_token}".encode('utf-8'))]
    communicator = WebsocketCommunicator(application, "/ws/realtime/", headers=headers)
    connected, _ = await communicator.connect()
    assert connected

    # Send 51 messages quickly (limit is 50/sec)
    for _ in range(51):
        await communicator.send_json_to({
            "type": "heartbeat",
            "id": "123"
        })
    
    # The 51st message should trigger a rate limit error and close the socket
    response = await communicator.receive_json_from()
    while response.get("type") != "error":
         response = await communicator.receive_json_from()
         
    assert response["payload"]["message"] == "Rate limit exceeded"
    await communicator.disconnect()

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_size_limit(user, get_token):
    headers = [(b"cookie", f"access_token={get_token}".encode('utf-8'))]
    communicator = WebsocketCommunicator(application, "/ws/realtime/", headers=headers)
    connected, _ = await communicator.connect()
    assert connected

    large_payload = "A" * 150000 # ~150KB
    await communicator.send_json_to({
        "type": "message.send",
        "payload": large_payload
    })
    
    response = await communicator.receive_json_from()
    assert response["payload"]["message"] == "Message too large"
    await communicator.disconnect()
