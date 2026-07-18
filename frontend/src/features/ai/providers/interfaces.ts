export interface AIResponse {
  content: string;
  provider: string;
  model: string;
}

export interface AIProviderConfig {
  endpoint?: string;
  apiKey?: string; // Should be loaded dynamically from Vault, never stored plaintext
  model: string;
}

export interface AIProvider {
  id: string;
  name: string;
  isCloud: boolean;
  generateResponse(prompt: string, context: string, config: AIProviderConfig): Promise<AIResponse>;
}

export interface EmbeddingResponse {
  vector: number[];
  dimensions: number;
}

export interface EmbeddingProvider {
  id: string;
  name: string;
  isCloud: boolean;
  generateEmbedding(text: string): Promise<EmbeddingResponse>;
}
