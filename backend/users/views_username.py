from rest_framework import views, permissions
from rest_framework.response import Response
from .serializers import USERNAME_RE
from .models import CustomUser

class UsernameAvailabilityView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        raw = request.query_params.get('u', '').strip().lower()
        if not raw:
            return Response({'available': False, 'reason': 'empty'})
        if not USERNAME_RE.match(raw):
            return Response({'available': False, 'reason': 'invalid_format'})
        taken = CustomUser.objects.filter(username=raw).exists()
        return Response({'available': not taken, 'reason': 'taken' if taken else None})
