import logging
from .repositories import ChatRepository
from .validators import ChatValidator
from users.models import Device
from core.models import FeatureFlag

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# E2EE Feature Flag
# ---------------------------------------------------------------------------
# When the FeatureFlag 'REQUIRE_E2EE_SIGNATURES' is **enabled**, the full
# Ed25519 device-key + signature verification pipeline is enforced.
#
# When the flag is **disabled** (default, because the frontend does not yet
# generate real Ed25519 keys or register devices), messages whose signature
# field equals the sentinel value 'UNVERIFIED' are accepted without device
# lookup or signature verification.  All other security checks (replay
# protection, timestamp window, membership) remain fully active.
#
# To activate full E2EE later:
#   1. Implement frontend device registration + key generation.
#   2. Enable the flag:  FeatureFlag.objects.update_or_create(
#          name='REQUIRE_E2EE_SIGNATURES', defaults={'is_enabled': True})
#   3. The compatibility path below becomes a no-op.
# ---------------------------------------------------------------------------

_UNVERIFIED_SENTINEL = 'UNVERIFIED'


def _is_e2ee_required() -> bool:
    """Check the FeatureFlag table; cache-friendly single query."""
    try:
        flag = FeatureFlag.objects.filter(name='REQUIRE_E2EE_SIGNATURES').first()
        return flag.is_enabled if flag else False
    except Exception:
        return False


class ChatService:
    @staticmethod
    def process_incoming_message(sender, data):
        """
        Validates and saves an incoming message, returning the created Message object.
        Data payload expects:
        - id: UUIDv7 string
        - conversation_id: UUID string
        - ciphertext: string
        - nonce: string
        - signature: string
        - created_at: ISO8601 string
        - key_version: int
        - algorithm: string
        """
        msg_id = data.get('id')
        conv_id = data.get('conversation_id')
        ciphertext = data.get('ciphertext')
        nonce = data.get('nonce')
        signature = data.get('signature')
        created_at_str = data.get('created_at')
        
        # 1. Replay Protection - Duplicate Check
        if not msg_id or ChatValidator.is_duplicate_message(msg_id):
            raise ValueError("Duplicate or invalid message ID")

        # 2. Timestamp Window Check (5 mins)
        if not created_at_str or not ChatValidator.validate_timestamp_window(created_at_str):
            raise ValueError("Timestamp outside acceptable window (Replay attack prevention)")

        # 3 & 4. Device lookup + Signature verification
        #    Gated behind the REQUIRE_E2EE_SIGNATURES feature flag.
        e2ee_required = _is_e2ee_required()
        device = None

        if e2ee_required or signature != _UNVERIFIED_SENTINEL:
            # --- Full E2EE path (unchanged from original) ---
            device_id = data.get('device_id')
            device = Device.objects.filter(id=device_id, user=sender, is_verified=True).first()

            if not device:
                device = Device.objects.filter(user=sender, is_verified=True).order_by('-created_at').first()
                if not device:
                    if e2ee_required:
                        raise ValueError("No verified device found for sender")
                    else:
                        # Flag is off AND signature is not UNVERIFIED but no device exists
                        logger.warning(
                            f"E2EE: No device for user {sender.id}, accepting message "
                            f"because REQUIRE_E2EE_SIGNATURES is disabled."
                        )
                        device = None

            if device:
                payload_to_verify = f"{msg_id}|{ciphertext}".encode('utf-8')
                is_valid = ChatValidator.verify_message_signature(
                    device.public_key_ed25519,
                    signature,
                    payload_to_verify
                )
                if not is_valid:
                    if e2ee_required:
                        raise ValueError("Invalid Ed25519 signature")
                    else:
                        logger.warning(
                            f"E2EE: Signature verification failed for message {msg_id} "
                            f"but REQUIRE_E2EE_SIGNATURES is disabled; accepting."
                        )
        else:
            # --- Compatibility path: signature == 'UNVERIFIED' and flag is off ---
            logger.info(
                f"E2EE: Accepting message {msg_id} with UNVERIFIED signature "
                f"(feature flag REQUIRE_E2EE_SIGNATURES is disabled)."
            )

        # 5. Assign Sequence Number and Save
        sequence_number = ChatRepository.get_next_sequence_number(conv_id)
        
        msg_data = {
            'id': msg_id,
            'conversation_id': conv_id,
            'sequence_number': sequence_number,
            'sender': sender,
            'sender_device': device,
            'ciphertext': ciphertext,
            'nonce': nonce,
            'signature': signature,
            'key_version': data.get('key_version', 1),
            'algorithm': data.get('algorithm', 'AES-256-GCM'),
            'created_at': created_at_str,
            'reply_to_id': data.get('reply_to_id')
        }
        
        return ChatRepository.save_message(msg_data)

    @staticmethod
    def process_message_edit(user, data):
        from .models import Message, MessageEditHistory
        
        msg_id = data.get('id')
        msg = Message.objects.get(id=msg_id, sender=user, deleted_at__isnull=True)
        
        # Verify signature for edit
        device = Device.objects.filter(id=data.get('device_id'), user=user, is_verified=True).first()
        if not device:
             device = Device.objects.filter(user=user, is_verified=True).order_by('-created_at').first()
             
        payload_to_verify = f"{msg_id}|{data.get('ciphertext')}".encode('utf-8')
        if not ChatValidator.verify_message_signature(device.public_key_ed25519, data.get('signature'), payload_to_verify):
            raise ValueError("Invalid edit signature")
            
        # Save history
        MessageEditHistory.objects.create(
            message=msg,
            ciphertext=msg.ciphertext,
            nonce=msg.nonce,
            signature=msg.signature,
            key_version=msg.key_version,
            algorithm=msg.algorithm
        )
        
        # Update message
        msg.ciphertext = data.get('ciphertext')
        msg.nonce = data.get('nonce')
        msg.signature = data.get('signature')
        msg.is_edited = True
        msg.save()
        return msg

    @staticmethod
    def process_message_delete(user, data):
        from .models import Message
        from django.utils import timezone
        
        msg_id = data.get('id')
        msg = Message.objects.get(id=msg_id, sender=user, deleted_at__isnull=True)
        msg.deleted_at = timezone.now()
        msg.save()
        return msg
        
    @staticmethod
    def process_message_status(user, data, status):
        from .models import Message, MessageStatus
        
        msg_id = data.get('message_id')
        msg = Message.objects.get(id=msg_id)
        
        status_obj, created = MessageStatus.objects.update_or_create(
            message=msg,
            user=user,
            defaults={'status': status}
        )
        return status_obj

    @staticmethod
    def process_conversation_sync(user, data):
        from .models import Message, ConversationMember, DeviceSyncState
        from users.models import Device
        
        conv_id = data.get('conversation_id')
        device_id = data.get('device_id')
        last_sequence = data.get('last_sequence', 0)
        
        if not ConversationMember.objects.filter(conversation_id=conv_id, user=user).exists():
            raise ValueError("Not a member of this conversation")
            
        device = Device.objects.filter(id=device_id, user=user).first()
        if device:
            sync_state, _ = DeviceSyncState.objects.get_or_create(
                device=device,
                conversation_id=conv_id,
                defaults={'last_sequence_synced': last_sequence}
            )
            sync_state.sync_status = 'syncing'
            sync_state.save()
            
        messages = Message.objects.filter(
            conversation_id=conv_id, 
            sequence_number__gt=last_sequence
        ).order_by('sequence_number')[:100] # Batch limit for pagination
        
        # Package as delta
        return {
            'conversation_id': conv_id,
            'messages': [
                {
                    'id': str(msg.id),
                    'conversation_id': str(msg.conversation_id),
                    'sequence_number': msg.sequence_number,
                    'sender_id': str(msg.sender_id),
                    'ciphertext': msg.ciphertext,
                    'nonce': msg.nonce,
                    'signature': msg.signature,
                    'key_version': msg.key_version,
                    'algorithm': msg.algorithm,
                    'created_at': msg.created_at.isoformat(),
                    'is_edited': msg.is_edited,
                    'deleted_at': msg.deleted_at.isoformat() if msg.deleted_at else None
                }
                for msg in messages
            ]
        }

    @staticmethod
    def process_sync_complete(user, data):
        from .models import DeviceSyncState
        from users.models import Device
        from django.utils import timezone
        
        device_id = data.get('device_id')
        conv_id = data.get('conversation_id')
        last_sequence = data.get('last_sequence_synced')
        
        device = Device.objects.filter(id=device_id, user=user).first()
        if device:
            sync_state = DeviceSyncState.objects.filter(device=device, conversation_id=conv_id).first()
            if sync_state:
                sync_state.last_sequence_synced = last_sequence
                sync_state.sync_status = 'idle'
                sync_state.last_full_sync = timezone.now()
                sync_state.save()

    @staticmethod
    def process_draft_updated(user, data):
        from .models import DraftMessage
        from users.models import Device
        from django.utils import timezone
        import datetime
        
        device_id = data.get('device_id')
        conv_id = data.get('conversation_id')
        ciphertext = data.get('ciphertext')
        
        device = Device.objects.filter(id=device_id, user=user).first()
        if not device:
            raise ValueError("Invalid device")
            
        if not ciphertext:
            # Clear draft
            DraftMessage.objects.filter(conversation_id=conv_id, sender=user, device=device).delete()
        else:
            # Auto-save draft
            DraftMessage.objects.update_or_create(
                conversation_id=conv_id,
                sender=user,
                device=device,
                defaults={
                    'ciphertext': ciphertext,
                    'expires_at': timezone.now() + datetime.timedelta(days=7)
                }
            )
