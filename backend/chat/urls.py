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
    path('upload/start/', UploadStartView.as_view(), name='media-upload-start'),
    path('upload/<uuid:session_id>/chunk/', UploadChunkView.as_view(), name='media-upload-chunk'),
    path('upload/<uuid:session_id>/complete/', UploadCompleteView.as_view(), name='media-upload-complete'),
    path('', include(router.urls)),
]
