import os
import hashlib
from abc import ABC, abstractmethod
from django.conf import settings

class StorageProvider(ABC):
    @abstractmethod
    def save_chunk(self, session_id: str, chunk_index: int, data: bytes) -> str:
        pass
        
    @abstractmethod
    def assemble_chunks(self, session_id: str, chunk_count: int, expected_hash: str, extension: str = 'bin') -> str:
        pass
        
    @abstractmethod
    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self):
        self.base_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(self.base_dir, exist_ok=True)
        
    def _get_chunk_path(self, session_id: str, chunk_index: int) -> str:
        session_dir = os.path.join(self.base_dir, session_id)
        os.makedirs(session_dir, exist_ok=True)
        return os.path.join(session_dir, f'chunk_{chunk_index}.bin')

    def save_chunk(self, session_id: str, chunk_index: int, data: bytes) -> str:
        path = self._get_chunk_path(session_id, chunk_index)
        with open(path, 'wb') as f:
            f.write(data)
        return path

    def assemble_chunks(self, session_id: str, chunk_count: int, expected_hash: str, extension: str = 'bin') -> str:
        final_key = f"media/{session_id}.{extension}"
        final_path = os.path.join(settings.MEDIA_ROOT, final_key)
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        
        hasher = hashlib.sha256()
        
        with open(final_path, 'wb') as final_file:
            for i in range(chunk_count):
                chunk_path = self._get_chunk_path(session_id, i)
                if not os.path.exists(chunk_path):
                    raise FileNotFoundError(f"Missing chunk {i}")
                with open(chunk_path, 'rb') as chunk_file:
                    data = chunk_file.read()
                    hasher.update(data)
                    final_file.write(data)
        
        actual_hash = hasher.hexdigest()
        if actual_hash != expected_hash:
            os.remove(final_path)
            raise ValueError("Checksum mismatch. Integrity verification failed.")
            
        # Cleanup chunks
        import shutil
        shutil.rmtree(os.path.join(self.base_dir, session_id), ignore_errors=True)
        
        return final_key

    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        if file_key.startswith('http://') or file_key.startswith('https://'):
            return file_key
        return f"{settings.MEDIA_URL}{file_key}"

class CloudinaryStorageProvider(StorageProvider):
    def __init__(self):
        import cloudinary
        self.local_provider = LocalStorageProvider()

        cloudinary_url = os.getenv('CLOUDINARY_URL')
        if cloudinary_url:
            cloudinary.config(cloudinary_url=cloudinary_url, secure=True)
        else:
            cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME') or os.getenv('Cloud name') or os.getenv('CLOUD_NAME')
            api_key = os.getenv('CLOUDINARY_API_KEY') or os.getenv('cloudnary_api_key') or os.getenv('API_KEY')
            api_secret = os.getenv('CLOUDINARY_API_SECRET') or os.getenv('cloudnary_api_secret') or os.getenv('API_SECRET')
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True
            )

    def save_chunk(self, session_id: str, chunk_index: int, data: bytes) -> str:
        return self.local_provider.save_chunk(session_id, chunk_index, data)

    def assemble_chunks(self, session_id: str, chunk_count: int, expected_hash: str, extension: str = 'bin') -> str:
        local_key = self.local_provider.assemble_chunks(session_id, chunk_count, expected_hash, extension)
        local_path = os.path.join(settings.MEDIA_ROOT, local_key)

        import cloudinary.uploader
        resource_type = 'auto'
        ext_lower = extension.lower()
        if ext_lower in ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'm4a', 'aac']:
            resource_type = 'video'
        elif ext_lower in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']:
            resource_type = 'image'

        upload_result = cloudinary.uploader.upload(
            local_path,
            public_id=f"quickchat/{session_id}",
            resource_type=resource_type,
            overwrite=True
        )

        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception:
                pass

        return upload_result.get('secure_url', upload_result.get('url', local_key))

    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        if file_key.startswith('http://') or file_key.startswith('https://'):
            return file_key
        return f"{settings.MEDIA_URL}{file_key}"

def get_storage_provider() -> StorageProvider:
    cloudinary_url = os.getenv('CLOUDINARY_URL')
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME') or os.getenv('Cloud name') or os.getenv('CLOUD_NAME')
    api_key = os.getenv('CLOUDINARY_API_KEY') or os.getenv('cloudnary_api_key') or os.getenv('API_KEY')
    api_secret = os.getenv('CLOUDINARY_API_SECRET') or os.getenv('cloudnary_api_secret') or os.getenv('API_SECRET')

    if cloudinary_url or (cloud_name and api_key and api_secret):
        try:
            return CloudinaryStorageProvider()
        except Exception as e:
            print(f"Cloudinary initialization error, fallback to LocalStorageProvider: {e}")
            return LocalStorageProvider()
    return LocalStorageProvider()

storage_provider = get_storage_provider()
