from django.db import transaction
from django.db.models import F
from .models import Conversation, Message, ConversationMember

class ChatRepository:
    @staticmethod
    def get_conversation_for_users(user1_id, user2_id):
        # In a 2-user system, there is only one conversation usually,
        # but let's query for one where both users are members.
        convs = Conversation.objects.filter(members__user_id=user1_id).filter(members__user_id=user2_id)
        return convs.first()
        
    @staticmethod
    def get_or_create_conversation(user1_id, user2_id):
        with transaction.atomic():
            conv = ChatRepository.get_conversation_for_users(user1_id, user2_id)
            if not conv:
                conv = Conversation.objects.create()
                ConversationMember.objects.create(conversation=conv, user_id=user1_id)
                if user1_id != user2_id:
                    ConversationMember.objects.create(conversation=conv, user_id=user2_id)
            return conv

    @staticmethod
    def get_next_sequence_number(conversation_id):
        with transaction.atomic():
            conv = Conversation.objects.select_for_update().get(id=conversation_id)
            conv.version = F('version') + 1
            conv.save()
            conv.refresh_from_db()
            return conv.version

    @staticmethod
    def save_message(message_data):
        with transaction.atomic():
            msg = Message.objects.create(**message_data)
            Conversation.objects.filter(id=msg.conversation_id).update(
                last_message_id=msg.id,
                last_activity=msg.created_at
            )
            return msg
