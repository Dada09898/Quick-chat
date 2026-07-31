import pytest
from rest_framework.test import APIClient
from users.models import CustomUser

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_user_registration(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'test@enterprise.local',
        'username': 'testuser',
        'display_name': 'Test User',
        'password': 'securepassword123',
        'timezone': 'America/New_York'
    })
    assert response.status_code == 201
    assert 'session_id' in response.data
    assert CustomUser.objects.count() == 1
    
@pytest.mark.django_db
def test_user_login(api_client):
    CustomUser.objects.create_user(email='test@enterprise.local', password='securepassword123')
    response = api_client.post('/api/auth/login/', {
        'email': 'test@enterprise.local',
        'password': 'securepassword123'
    })
    assert response.status_code == 200
    assert 'session_id' in response.data
    
@pytest.mark.django_db
def test_unlimited_users(api_client):
    # Verify the 2-user restriction is lifted
    for i in range(5):
        CustomUser.objects.create_user(email=f'user{i}@enterprise.local', password='password123')
    assert CustomUser.objects.count() == 5
