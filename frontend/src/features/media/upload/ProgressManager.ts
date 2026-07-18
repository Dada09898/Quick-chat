export class ProgressManager {
  private totalBytes: number;
  private uploadedBytes: number = 0;
  private onProgress: (progress: number) => void;

  constructor(totalBytes: number, onProgress: (progress: number) => void) {
    this.totalBytes = totalBytes;
    this.onProgress = onProgress;
  }

  addUploadedBytes(bytes: number) {
    this.uploadedBytes += bytes;
    const progress = Math.min(100, Math.round((this.uploadedBytes / this.totalBytes) * 100));
    this.onProgress(progress);
  }
}
