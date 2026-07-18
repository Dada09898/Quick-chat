export class ChunkManager {
  private file: File;
  private minChunkSize = 1 * 1024 * 1024; // 1MB
  private maxChunkSize = 8 * 1024 * 1024; // 8MB
  private currentChunkSize = 5 * 1024 * 1024; // 5MB Default

  constructor(file: File) {
    this.file = file;
  }

  getChunkCount(): number {
    // A simplified estimation. Adaptive sizing means chunks might be fewer or more.
    return Math.ceil(this.file.size / this.currentChunkSize);
  }

  async *getChunks(): AsyncGenerator<{ index: number, blob: Blob, isLast: boolean }> {
    let offset = 0;
    let index = 0;

    while (offset < this.file.size) {
      const start = performance.now();
      
      const blob = this.file.slice(offset, offset + this.currentChunkSize);
      const isLast = offset + this.currentChunkSize >= this.file.size;
      
      yield { index, blob, isLast };
      
      const end = performance.now();
      const rtt = end - start;
      
      this.adaptChunkSize(rtt);
      
      offset += blob.size;
      index++;
    }
  }

  private adaptChunkSize(rtt: number) {
    // If chunk uploaded fast (e.g. under 500ms), increase size.
    if (rtt < 500 && this.currentChunkSize < this.maxChunkSize) {
      this.currentChunkSize = Math.min(this.maxChunkSize, this.currentChunkSize * 1.5);
    } 
    // If chunk was slow (over 2000ms), decrease size.
    else if (rtt > 2000 && this.currentChunkSize > this.minChunkSize) {
      this.currentChunkSize = Math.max(this.minChunkSize, this.currentChunkSize / 1.5);
    }
  }
}
