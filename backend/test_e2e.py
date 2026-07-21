import os
import json
import uuid
import asyncio
import base64
import urllib.parse
import requests
import websockets
from datetime import datetime, timezone

# Use local for now
BASE_URL = os.environ.get("TEST_API_URL", "http://127.0.0.1:8000")
WS_URL = BASE_URL.replace("http", "ws") + "/ws/realtime/"

def print_step(msg):
    print(f"\n---> {msg}")

async def test_e2e_websockets():
    print_step(f"Testing against {BASE_URL}")
    
    def get_token(res):
        for cookie in res.headers.get('Set-Cookie', '').split(','):
            if 'access_token=' in cookie:
                return cookie.split('access_token=')[1].split(';')[0]
        return None

    # 1. Register User A
    user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@test.com"
    res = requests.post(f"{BASE_URL}/api/auth/register/", json={
        "email": user_a_email,
        "password": "Password123!",
        "timezone": "UTC",
        "preferred_language": "en"
    })
    assert res.status_code == 201, f"Failed to register User A: {res.text}"
    user_a_token = get_token(res)
    res.json()['user']['id']
    print("User A registered:", user_a_email)

    # 2. Register User B
    user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@test.com"
    res = requests.post(f"{BASE_URL}/api/auth/register/", json={
        "email": user_b_email,
        "password": "Password123!",
        "timezone": "UTC",
        "preferred_language": "en"
    })
    assert res.status_code == 201, f"Failed to register User B: {res.text}"
    user_b_token = get_token(res)
    user_b_id = res.json()['user']['id']
    print("User B registered:", user_b_email)

    headers_a = {"Authorization": f"Bearer {user_a_token}"}

    # 3. User A Creates Conversation
    res = requests.post(f"{BASE_URL}/api/chat/conversations/", json={}, headers=headers_a)
    assert res.status_code == 201, f"Failed to create conversation: {res.text}"
    conv_id = res.json()['id']
    print("Conversation created:", conv_id)
    
    # User A adds User B
    res = requests.post(f"{BASE_URL}/api/chat/conversations/{conv_id}/add_member/", json={"user_id": user_b_id}, headers=headers_a)
    assert res.status_code == 200, f"Failed to add member: {res.text}"
    print("User B added to conversation")

    # 4. Connect WebSockets
    ws_headers_a = {"Cookie": f"access_token={user_a_token}"}
    ws_headers_b = {"Cookie": f"access_token={user_b_token}"}
    
    async with websockets.connect(WS_URL, additional_headers=ws_headers_a) as ws_a, \
               websockets.connect(WS_URL, additional_headers=ws_headers_b) as ws_b:
        
        print_step("WebSockets connected for both users")
        
        # Helper to encode ciphertext
        def encode_msg(text):
            return base64.b64encode(urllib.parse.quote(text).encode('utf-8')).decode('utf-8')
            
        def decode_msg(ciphertext):
            return urllib.parse.unquote(base64.b64decode(ciphertext).decode('utf-8'))

        # 5. User A sends message
        msg_id = str(uuid.uuid7() if hasattr(uuid, 'uuid7') else uuid.uuid4())
        text_a = "Hello User B! Test unicode: 😎🚀✓"
        payload = {
            "type": "message.send",
            "id": "req-1",
            "payload": {
                "id": msg_id,
                "conversation_id": conv_id,
                "ciphertext": encode_msg(text_a),
                "nonce": "pending",
                "signature": "UNVERIFIED",
                "key_version": 1,
                "algorithm": "AES-256-GCM",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        await ws_a.send(json.dumps(payload))
        print("User A sent message.")
        
        # Receive ACK on A
        res_a = await asyncio.wait_for(ws_a.recv(), timeout=5)
        ack_data = json.loads(res_a)
        assert ack_data['type'] == 'ack', f"Expected ack, got {ack_data}"
        print("User A received ACK")
        
        # Receive message on B
        while True:
            res_b = await asyncio.wait_for(ws_b.recv(), timeout=5)
            new_msg_data = json.loads(res_b)
            if new_msg_data.get('type') == 'message.new':
                print("User B received message.new")
                decrypted = decode_msg(new_msg_data['payload']['ciphertext'])
                print(f"User B decoded: {decrypted}")
                assert decrypted == text_a, "Decoded text mismatch"
                break
        
        # User B sends delivered
        payload_delivered = {
            "type": "message.delivered",
            "id": "req-2",
            "payload": {
                "message_id": msg_id,
                "conversation_id": conv_id
            }
        }
        await ws_b.send(json.dumps(payload_delivered))
        print("User B sent delivered receipt")
        
        # Receive delivered on A
        while True:
            res_a = await asyncio.wait_for(ws_a.recv(), timeout=5)
            delivery_data = json.loads(res_a)
            if delivery_data.get('type') == 'message.delivered':
                print("User A received delivery receipt")
                assert delivery_data['payload']['message_id'] == msg_id
                break

        print_step("E2E Test Passed Successfully! ✅")

if __name__ == "__main__":
    asyncio.run(test_e2e_websockets())
