import type { AIProvider, AIProviderConfig, AIResponse } from './interfaces';

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Ollama (Local)';
  isCloud = false;

  async generateResponse(prompt: string, context: string, config: AIProviderConfig): Promise<AIResponse> {
    const endpoint = config.endpoint || 'http://localhost:11434';
    const model = config.model || 'llama3';

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: `Context: ${context}\n\nTask: ${prompt}`,
          stream: false
        })
      });

      if (!res.ok) throw new Error(`Ollama API error: ${res.statusText}`);
      
      const data = await res.json();
      return {
        content: data.response,
        provider: this.name,
        model
      };
    } catch (e) {
      console.error(e);
      throw new Error("Failed to connect to Local Ollama instance.");
    }
  }
}
