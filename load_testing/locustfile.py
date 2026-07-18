import uuid
from locust import HttpUser, task, between

class DualConnectUser(HttpUser):
    wait_time = between(1, 5)
    
    def on_start(self):
        """Register and login user on startup"""
        self.username = f"loaduser_{uuid.uuid4().hex[:8]}"
        self.email = f"{self.username}@enterprise.local"
        self.password = "StrongPassword123!"
        
        # Registration
        self.client.post("/api/auth/register/", json={
            "email": self.email,
            "username": self.username,
            "password": self.password
        })
        
        # Login
        login_res = self.client.post("/api/auth/login/", json={
            "email": self.email,
            "password": self.password
        })
        
        if login_res.status_code == 200:
            # We assume a conversation exists globally for load testing, or we create one
            conv_res = self.client.post("/api/chat/conversations/")
            if conv_res.status_code == 201:
                self.conversation_id = conv_res.json().get("id")
            else:
                self.conversation_id = None

    @task(3)
    def fetch_messages(self):
        if self.conversation_id:
            self.client.get(f"/api/chat/messages/?conversation_id={self.conversation_id}")

    @task(1)
    def send_message(self):
        if self.conversation_id:
            self.client.post("/api/chat/messages/", json={
                "conversation_id": self.conversation_id,
                "ciphertext": "e2ee_blob_mock_data",
                "nonce": "n1",
                "signature": "sig1",
                "key_version": 1,
                "algorithm": "aes-256-gcm",
                "sequence_number": 1
            })

    @task(1)
    def fetch_health(self):
        self.client.get("/health/live/")
