import base64
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from .models import Message

class ChatValidator:
    @staticmethod
    def verify_message_signature(public_key_base64: str, signature_base64: str, payload_bytes: bytes) -> bool:
        try:
            public_key_bytes = base64.b64decode(public_key_base64)
            signature_bytes = base64.b64decode(signature_base64)
            
            # The Web Crypto API SPKI base64 includes ASN.1 headers.
            # cryptography's load_der_public_key can handle SPKI.
            from cryptography.hazmat.primitives.serialization import load_der_public_key
            public_key = load_der_public_key(public_key_bytes)
            
            if not isinstance(public_key, Ed25519PublicKey):
                return False
                
            public_key.verify(signature_bytes, payload_bytes)
            return True
        except Exception:
            return False

    @staticmethod
    def validate_timestamp_window(client_timestamp_str: str, window_minutes: int = 1440) -> bool:
        try:
            # Assuming ISO format from client
            client_time = datetime.fromisoformat(client_timestamp_str.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            delta = abs((now - client_time).total_seconds())
            return delta <= (window_minutes * 60)
        except Exception:
            return False

    @staticmethod
    def is_duplicate_message(message_id: str) -> bool:
        return Message.objects.filter(id=message_id).exists()
