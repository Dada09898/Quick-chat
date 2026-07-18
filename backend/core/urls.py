from django.urls import path
from .views import HealthLiveView, HealthReadyView, HealthDeepView

urlpatterns = [
    path('live/', HealthLiveView.as_view(), name='health_live'),
    path('ready/', HealthReadyView.as_view(), name='health_ready'),
    path('deep/', HealthDeepView.as_view(), name='health_deep'),
]
