import type { AIProvider, AIProviderConfig, AIResponse } from './interfaces';

export class OpenAIProvider implements AIProvider {
  id = 'openai';
  name = 'OpenAI';
  isCloud = true;

  async generateResponse(prompt: string, context: string, config: AIProviderConfig): Promise<AIResponse> {
    if (!config.apiKey) throw new Error("Missing OpenAI API Key");
    
    const model = config.model || 'gpt-4o';

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a helpful, secure AI assistant inside DualConnect. You only analyze the specific context provided." },
            { role: "user", content: `Context:\n${context}\n\nTask:\n${prompt}` }
          ],
        })
      });

      if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
      
      const data = await res.json();
      return {
        content: data.choices[0].message.content,
        provider: this.name,
        model
      };
    } catch (e) {
      console.error(e);
      throw new Error("Failed to connect to OpenAI.");
    }
  }
}
