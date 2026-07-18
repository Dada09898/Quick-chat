import { EmbeddingProvider, EmbeddingResponse } from './interfaces';
// Using conditional imports or window overrides to prevent SSR/Node crashes, 
// assuming @xenova/transformers is loaded via CDN or dynamic import in production.

export class XenovaEmbeddingProvider implements EmbeddingProvider {
  id = 'xenova';
  name = 'Xenova Transformers (Local Wasm)';
  isCloud = false;

  private pipeline: any = null;

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!this.pipeline) {
      try {
        // Dynamically import to ensure browser execution only
        const { pipeline, env } = await import('@xenova/transformers');
        
        // Disable local model checking (download from HF hub directly into IndexedDB cache)
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        
        this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          quantized: true 
        });
      } catch (e) {
        console.error("Failed to load Xenova WebAssembly:", e);
        throw new Error("Local embedding initialization failed.");
      }
    }

    const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    
    return {
      vector: Array.from(output.data),
      dimensions: output.dims[1]
    };
  }
}
