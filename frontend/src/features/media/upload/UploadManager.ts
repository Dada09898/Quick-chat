import { ChunkManager } from './ChunkManager';
import { RetryManager } from './RetryManager';
import { ProgressManager } from './ProgressManager';
import { encryptMediaChunk, generateMediaKey } from '../crypto';
import { stripExif } from '../exif';
import { apiClient, apiJson } from '../../../lib/api';

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (attachmentId: string, url: string, mediaKeyBase64: string) => void;
  onError?: (error: string) => void;
}

export class UploadManager {
  private file: File;
  private options: UploadOptions;
  private isCancelled = false;
  private mediaKey: CryptoKey | null = null;
  private ivBase64: string = "";

  constructor(file: File, options: UploadOptions) {
    this.file = file;
    this.options = options;
  }

  cancel() {
    this.isCancelled = true;
  }

  async start() {
    try {
      // 1. Strip EXIF
      const processedBlob = await stripExif(this.file);
      const processedFile = new File([processedBlob], this.file.name, { type: this.file.type });

      // 2. Generate E2EE Media Key
      const { key, rawKey, iv } = await generateMediaKey();
      this.mediaKey = key;
      this.ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

      // 3. Initialize Upload Session via API
      const chunkManager = new ChunkManager(processedFile);
      const startRes = await apiJson('/api/chat/upload/start/', {
        method: 'POST',
        body: { 
          chunk_count: chunkManager.getChunkCount(),
          mime_type: processedFile.type || 'application/octet-stream',
          file_size: processedFile.size
        }
      });
      const { session_id } = await startRes.json();

      const progressManager = new ProgressManager(processedFile.size, this.options.onProgress || (() => {}));
      const retryManager = new RetryManager();

      // 4. Chunk & Encrypt & Upload
      let fileHashInput = new Uint8Array(0); // In real app, calculate SHA-256 incrementally

      for await (const { index, blob } of chunkManager.getChunks()) {
        if (this.isCancelled) throw new Error("Upload cancelled");

        const chunkBuffer = await blob.arrayBuffer();
        const encryptedChunk = await encryptMediaChunk(this.mediaKey, iv, chunkBuffer);

        // Concatenate for hash (simplified for Sprint 6 demo, actual app uses SubtleCrypto.digest in chunks if supported)
        const newHashInput = new Uint8Array(fileHashInput.length + encryptedChunk.byteLength);
        newHashInput.set(fileHashInput, 0);
        newHashInput.set(new Uint8Array(encryptedChunk), fileHashInput.length);
        fileHashInput = newHashInput;

        await retryManager.execute(async () => {
          const formData = new FormData();
          formData.append('chunk_index', index.toString());
          formData.append('chunk', new Blob([encryptedChunk]));

          const res = await apiClient(`/api/chat/upload/${session_id}/chunk/`, {
            method: 'POST',
            body: formData
          });
          if (!res.ok) throw new Error(`Chunk ${index} failed`);
        });

        progressManager.addUploadedBytes(blob.size);
      }

      // 5. Calculate File Hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileHashInput);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // 6. Complete Upload
      const completeRes = await apiJson(`/api/chat/upload/${session_id}/complete/`, {
        method: 'POST',
        body: { file_hash: fileHashHex }
      });
      const { attachment_id, url } = await completeRes.json();

      const mediaKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));

      if (this.options.onComplete) {
        this.options.onComplete(attachment_id, url, mediaKeyBase64);
      }

    } catch (error: any) {
      if (this.options.onError) {
        this.options.onError(error.message);
      }
    }
  }
}
