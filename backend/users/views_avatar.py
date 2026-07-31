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
            return Response({'error': 'No file provided'}, status=400)

        ext = 'jpg'
        if '.' in file.name:
            ext = file.name.split('.')[-1]
        filename = f"{uuid.uuid4()}.{ext}"

        # 1. Save locally
        media_root = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(media_root, exist_ok=True)
        path = os.path.join(media_root, filename)
        with open(path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        relative_url = f"/media/avatars/{filename}"
        avatar_url = request.build_absolute_uri(relative_url)

        # 2. If Cloudinary is configured, upload to Cloudinary for permanent CDN storage
        cloudinary_url = os.getenv('CLOUDINARY_URL')
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME') or os.getenv('Cloud name') or os.getenv('CLOUD_NAME')
        if cloudinary_url or cloud_name:
            try:
                import cloudinary
                import cloudinary.uploader
                upload_res = cloudinary.uploader.upload(
                    path,
                    public_id=f"avatars/{uuid.uuid4()}",
                    resource_type='image',
                    overwrite=True
                )
                avatar_url = upload_res.get('secure_url', upload_res.get('url', avatar_url))
            except Exception as e:
                print(f"Cloudinary avatar upload error: {e}")

        request.user.avatar = avatar_url
        request.user.save()

        return Response({'avatar': avatar_url})
