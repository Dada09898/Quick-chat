import pytest
import io
import hashlib
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import CustomUser
from chat.models import UploadSession, MediaAttachment

@pytest.fixture
def api_client(db):
    return APIClient()

@pytest.fixture
def auth_client(api_client, db):
    user = CustomUser.objects.create_user(email='media_test@test.com', password='pwd')
    api_client.force_authenticate(user=user)
    return api_client, user

@pytest.mark.django_db
def test_media_upload_flow(auth_client):
    client, user = auth_client
    
    # 1. Start Upload
    start_resp = client.post(reverse('media-upload-start'), {'chunk_count': 2})
    assert start_resp.status_code == 201
    
    session_id = start_resp.data['session_id']
    session = UploadSession.objects.get(id=session_id)
    assert session.status == 'uploading'
    assert session.chunk_count == 2
    
    # Generate mock encrypted chunks
    chunk_1 = b"encrypted_data_1"
    chunk_2 = b"encrypted_data_2"
    
    # Calculate expected hash of the combined chunks
    hasher = hashlib.sha256()
    hasher.update(chunk_1)
    hasher.update(chunk_2)
    expected_hash = hasher.hexdigest()
    
    # 2. Upload Chunks
    c1_file = io.BytesIO(chunk_1)
    c1_file.name = "chunk_0.bin"
    chunk_resp_1 = client.post(
        reverse('media-upload-chunk', kwargs={'session_id': session_id}),
        {'chunk_index': 0, 'chunk': c1_file},
        format='multipart'
    )
    assert chunk_resp_1.status_code == 200
    
    c2_file = io.BytesIO(chunk_2)
    c2_file.name = "chunk_1.bin"
    chunk_resp_2 = client.post(
        reverse('media-upload-chunk', kwargs={'session_id': session_id}),
        {'chunk_index': 1, 'chunk': c2_file},
        format='multipart'
    )
    assert chunk_resp_2.status_code == 200
    
    session.refresh_from_db()
    assert session.completed_chunks == 2
    
    # 3. Complete Upload
    complete_resp = client.post(
        reverse('media-upload-complete', kwargs={'session_id': session_id}),
        {'file_hash': expected_hash}
    )
    assert complete_resp.status_code == 200
    assert 'attachment_id' in complete_resp.data
    
    session.refresh_from_db()
    assert session.status == 'completed'
    
    attachment = MediaAttachment.objects.get(id=complete_resp.data['attachment_id'])
    assert attachment.file_hash == expected_hash
    assert attachment.status == 'completed'
    assert attachment.chunk_count == 2

@pytest.mark.django_db
def test_media_upload_invalid_hash(auth_client):
    client, user = auth_client
    
    start_resp = client.post(reverse('media-upload-start'), {'chunk_count': 1})
    session_id = start_resp.data['session_id']
    
    c_file = io.BytesIO(b"data")
    c_file.name = "chunk_0.bin"
    client.post(
        reverse('media-upload-chunk', kwargs={'session_id': session_id}),
        {'chunk_index': 0, 'chunk': c_file},
        format='multipart'
    )
    
    # Provide wrong hash
    complete_resp = client.post(
        reverse('media-upload-complete', kwargs={'session_id': session_id}),
        {'file_hash': "wrong_hash"}
    )
    assert complete_resp.status_code == 400
    assert "Checksum mismatch" in complete_resp.data['error']
    
    session = UploadSession.objects.get(id=session_id)
    assert session.status == 'failed'
