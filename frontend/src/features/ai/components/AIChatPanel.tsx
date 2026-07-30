import React, { useState, useMemo } from 'react';
import { X, Send, Loader2, Bot } from 'lucide-react';
import { useAIStore } from '../store/aiStore';
import { useChatStore } from '../../chat/chatStore';
import { getProvider } from '../providers/getProvider';
import { AIConsentModal } from './AIConsentModal';

interface AIChatPanelProps {
  conversationId: string;
  conversationName: string;
  onClose: () => void;
}

interface LocalMsg { role: 'user' | 'assistant' | 'error'; content: string; }

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ conversationId, conversationName, onClose }) => {
  const { activeProviderId, providerModel, apiKeys, hasPermission } = useAIStore();
  const [showConsent, setShowConsent] = useState(!hasPermission(conversationId));
  const [msgs, setMsgs] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const context = useMemo(() => {
    const all = Object.values(useChatStore.getState().messages)
      .filter((m: any) => m.conversation_id === conversationId && m.decrypted_text)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-20);
    return all.map((m: any) => m.decrypted_text).join('\n');
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setMsgs(prev => [...prev, { role: 'user', content: prompt }]);
    setInput('');
    setLoading(true);
    try {
      const provider = getProvider(activeProviderId);
      const res = await provider.generateResponse(prompt, context, {
        model: providerModel,
        apiKey: apiKeys[activeProviderId],
      });
      setMsgs(prev => [...prev, { role: 'assistant', content: res.content }]);
    } catch (e: any) {
      setMsgs(prev => [...prev, { role: 'error', content: e.message || 'AI request failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (showConsent) {
    return (
      <AIConsentModal
        targetId={conversationId}
        targetName={conversationName}
        targetType="CHAT"
        onGrant={() => setShowConsent(false)}
        onDeny={onClose}
      />
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#111b21] border-l border-[#222d34] z-40 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-[#222d34]">
        <div className="flex items-center gap-2 text-[#e9edef] font-semibold">
          <Bot size={20} className="text-[#00a884]" /> AI Assistant
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#222d34] rounded-full text-[#8696a0]">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <p className="text-sm text-[#8696a0]">
            Ask me anything about this conversation with {conversationName}, or anything else.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-lg text-sm ${
            m.role === 'user' ? 'ml-auto bg-[#005c4b] text-[#e9edef]' :
            m.role === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/40' :
            'bg-[#202c33] text-[#e9edef]'
          }`}>
            {m.content}
          </div>
        ))}
        {loading && <Loader2 className="animate-spin text-[#8696a0]" size={20} />}
      </div>

      <div className="p-3 border-t border-[#222d34] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask the AI..."
          className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-sm text-[#e9edef] focus:outline-none"
        />
        <button onClick={handleSend} disabled={loading} className="p-2 bg-[#00a884] rounded-full text-[#111b21] disabled:opacity-50">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
