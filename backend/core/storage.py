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
        # In a real S3 provider, this generates a presigned URL.
        # For local dev, we just return a local URL
        return f"{settings.MEDIA_URL}{file_key}"
