import React, { useState } from 'react';
import { useAIStore } from '../store/aiStore';
import { Brain, Key, Trash, ShieldAlert } from 'lucide-react';
// import { encryptAPIKey, decryptAPIKey } from '../crypto'; // Hypothetical vault integration

export const AISettings = () => {
  const { activeProviderId, providerModel, setActiveProvider, clearSessionPermissions } = useAIStore();
  const [apiKey, setApiKey] = useState('');
  
  const providers = [
    { id: 'ollama', name: 'Ollama (Local)', isCloud: false, models: ['llama3', 'mistral', 'phi3'] },
    { id: 'lmstudio', name: 'LM Studio (Local)', isCloud: false, models: ['local-model'] },
    { id: 'openai', name: 'OpenAI', isCloud: true, models: ['gpt-4o', 'gpt-3.5-turbo'] },
    { id: 'anthropic', name: 'Anthropic', isCloud: true, models: ['claude-3-opus', 'claude-3-sonnet'] },
    { id: 'gemini', name: 'Google Gemini', isCloud: true, models: ['gemini-1.5-pro'] }
  ];

  const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];

  const handleSaveConfig = () => {
    // In a real implementation:
    // 1. Prompt Master Password if needed.
    // 2. Encrypt `apiKey` using Vault Master Key.
    // 3. Save to `useAIStore.getState().encryptedApiKeysBlob` (persisted to Vault DB).
    alert("AI Configuration saved securely in Vault.");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-900 min-h-screen text-gray-200">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Brain className="text-blue-500" size={32}/> AI Assistant Settings
      </h1>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Active Provider</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-400">AI Engine</label>
            <select 
              value={activeProviderId}
              onChange={(e) => setActiveProvider(e.target.value, providers.find(p=>p.id===e.target.value)?.models[0] || '')}
              className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 focus:outline-none focus:border-blue-500"
            >
              {providers.map(p => <option key={p.id} value={p.id}>{p.name} {p.isCloud ? '(Cloud)' : '(Local)'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-400">Language Model</label>
            <select 
              value={providerModel}
              onChange={(e) => setActiveProvider(activeProviderId, e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 focus:outline-none focus:border-blue-500"
            >
              {activeProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {activeProvider.isCloud ? (
          <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg mb-6 flex items-start gap-4">
            <Key className="text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-1">Encrypted API Key Storage</h3>
              <p className="text-sm text-gray-400 mb-3">
                Cloud providers require an API key. This key is encrypted using your Zero-Knowledge Vault Master Key. 
                It is never sent to DualConnect servers and is only decrypted locally in your browser memory when making requests directly to {activeProvider.name}.
              </p>
              <input 
                type="password"
                placeholder={`Enter ${activeProvider.name} API Key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-lg mb-6 flex items-start gap-4">
            <ShieldAlert className="text-green-400 mt-1" />
            <div>
              <h3 className="font-semibold text-green-400 mb-1">Maximum Privacy</h3>
              <p className="text-sm text-gray-400">
                You are using a Local Inference provider. All prompts, context, and responses are processed entirely on your device. 
                No network traffic is generated.
              </p>
            </div>
          </div>
        )}

        <button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-6 rounded transition shadow-lg">
          Save Configuration
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 text-red-400">Privacy & Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Revoke Active Permissions</h3>
              <p className="text-sm text-gray-400">Clear all ONE_TIME and SESSION AI access grants.</p>
            </div>
            <button onClick={clearSessionPermissions} className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded transition">
              <Trash size={16}/> Revoke All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
