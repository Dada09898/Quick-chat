import React, { useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';

export const MessageInput: React.FC = () => {
  const [text, setText] = useState('');
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const user = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConversationId || !user) return;

    // UUIDv7 shim (using crypto.randomUUID for demo, in prod use uuidv7 library)
    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // -----------------------------------------------------------------
    // E2EE Compatibility: Until frontend device registration + key
    // exchange is implemented, messages are sent as base64-encoded
    // plaintext with the sentinel signature 'UNVERIFIED'.
    // The backend feature flag REQUIRE_E2EE_SIGNATURES (disabled by
    // default) controls whether this is accepted.
    // Once real E2EE is active, replace btoa(text) with AES-256-GCM
    // ciphertext and 'UNVERIFIED' with a real Ed25519 signature.
    // -----------------------------------------------------------------
    const ciphertext = btoa(unescape(encodeURIComponent(text))); // Supports Unicode
    const signature = 'UNVERIFIED';
    const nonce = 'pending';

    // 1. Optimistic UI update
    const newMsg = {
      id: msgId,
      conversation_id: activeConversationId,
      sender_id: user.id,
      ciphertext,
      nonce,
      signature,
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
      ciphertext,
      nonce,
      signature,
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
        placeholder="Type a message..."
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
