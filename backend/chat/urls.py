from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UploadStartView, UploadChunkView, UploadCompleteView,
    ConversationViewSet, MessageViewSet
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('api/media/upload/start/', UploadStartView.as_view(), name='media-upload-start'),
    path('api/media/upload/<uuid:session_id>/chunk/', UploadChunkView.as_view(), name='media-upload-chunk'),
    path('api/media/upload/<uuid:session_id>/complete/', UploadCompleteView.as_view(), name='media-upload-complete'),
    path('', include(router.urls)),
]
