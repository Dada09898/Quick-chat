import os
import uuid
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file'}, status=400)

        ext = file.name.split('.')[-1]
        filename = f"{uuid.uuid4()}.{ext}"

        media_root = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(media_root, exist_ok=True)

        path = os.path.join(media_root, filename)
        with open(path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        relative_url = f"/media/avatars/{filename}"
        absolute_url = request.build_absolute_uri(relative_url)
        request.user.avatar = absolute_url
        request.user.save()

        return Response({'avatar': absolute_url})
