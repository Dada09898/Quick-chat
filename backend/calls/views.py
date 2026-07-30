from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import CallSession
from .serializers import CallHistorySerializer


class CallHistoryView(generics.ListAPIView):
    serializer_class = CallHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return CallSession.objects.filter(
            Q(caller=user) | Q(participants__user=user)
        ).distinct().order_by('-started_at')[:50]
