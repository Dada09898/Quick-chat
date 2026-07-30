import type { AIProvider } from './interfaces';
import { OpenAIProvider } from './OpenAIProvider';
import { OllamaProvider } from './OllamaProvider';

const providers: Record<string, AIProvider> = {
  openai: new OpenAIProvider(),
  ollama: new OllamaProvider(),
};

export function getProvider(id: string): AIProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`Unknown or unsupported AI provider: ${id}. Try Ollama (local) or OpenAI.`);
  return provider;
}
