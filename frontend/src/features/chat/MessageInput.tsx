import React, { useState } from 'react';
import { useChatStore } from './chatStore';
import { useRealtime } from '../../realtime/RealtimeProvider';

export const MessageInput: React.FC = () => {
  const [text, setText] = useState('');
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const { sendEvent } = useRealtime();
  
  // Assume keys are available in a real app context
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConversationId) return;

    // UUIDv7 shim (using crypto.randomUUID for demo, in prod use uuidv7 library)
    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 1. Optimistic UI update
    const newMsg = {
      id: msgId,
      conversation_id: activeConversationId,
      sender_id: 'me', // placeholder
      ciphertext: btoa(text), // placeholder encryption
      nonce: 'nonce',
      signature: 'sig',
      key_version: 1,
      algorithm: 'AES-256-GCM',
      created_at: createdAt,
      is_edited: false,
      deleted_at: null,
      status: 'queued' as const,
      decrypted_text: text,
    };
    
    enqueueMessage(newMsg);
    setText('');
    
    // 2. Transmit via WebSocket
    sendEvent('message.send', {
      id: msgId,
      conversation_id: activeConversationId,
      device_id: 'device-123',
      ciphertext: btoa(text),
      nonce: 'nonce',
      signature: 'sig',
      key_version: 1,
      algorithm: 'AES-256-GCM',
      created_at: createdAt
    });
  };

  return (
    <form onSubmit={handleSend} className="p-4 bg-gray-900 border-t border-gray-800 flex items-center gap-4">
      <input 
        type="text" 
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type an encrypted message..."
        className="flex-1 bg-gray-800 text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      />
      <button 
        type="submit"
        disabled={!text.trim()}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-6 py-3 font-medium transition-colors"
      >
        Send
      </button>
    </form>
  );
};
