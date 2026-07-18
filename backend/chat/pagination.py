from rest_framework.pagination import CursorPagination

class MessageCursorPagination(CursorPagination):
    page_size = 50
    ordering = '-sequence_number'
    
class ConversationPagination(CursorPagination):
    page_size = 20
    ordering = '-last_activity'
