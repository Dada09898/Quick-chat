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

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_realtime_two_user_message_broadcast():
    from chat.models import Conversation, ConversationMember
    from datetime import datetime, timezone
    import uuid6

    user_a = await sync_to_async(CustomUser.objects.create_user)(email='usera@test.com', password='pwd')
    user_b = await sync_to_async(CustomUser.objects.create_user)(email='userb@test.com', password='pwd')

    conv = await sync_to_async(Conversation.objects.create)(is_direct=True)
    await sync_to_async(ConversationMember.objects.create)(conversation=conv, user=user_a)
    await sync_to_async(ConversationMember.objects.create)(conversation=conv, user=user_b)

    token_a = AccessToken.for_user(user_a)
    token_b = AccessToken.for_user(user_b)

    comm_a = WebsocketCommunicator(application, "/ws/realtime/", headers=[(b'cookie', f'access_token={str(token_a)}'.encode('utf-8'))])
    comm_b = WebsocketCommunicator(application, "/ws/realtime/", headers=[(b'cookie', f'access_token={str(token_b)}'.encode('utf-8'))])

    connected_a, _ = await comm_a.connect()
    connected_b, _ = await comm_b.connect()
    assert connected_a and connected_b

    # Receive initial self-presence
    await comm_a.receive_json_from()
    await comm_b.receive_json_from()

    # User A sends a message event
    msg_id = str(uuid6.uuid7())
    await comm_a.send_json_to({
        "type": "message.send",
        "id": "ack-1",
        "payload": {
            "id": msg_id,
            "conversation_id": str(conv.id),
            "ciphertext": "aGVsbG8=",
            "nonce": "nonce123",
            "signature": "sig123",
            "key_version": 1,
            "algorithm": "AES-256-GCM",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    })

    # User A receives ACK
    ack = await comm_a.receive_json_from()
    assert ack["type"] == "ack"
    assert ack["id"] == "ack-1"

    # User B should receive exactly ONE message.new event
    received_b = await comm_b.receive_json_from(timeout=3)
    assert received_b["type"] == "message.new"
    assert received_b["payload"]["id"] == msg_id
    assert received_b["payload"]["ciphertext"] == "aGVsbG8="

    await comm_a.disconnect()
    await comm_b.disconnect()
