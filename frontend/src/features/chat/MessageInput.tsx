import React, { useState, useRef } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { Smile, Paperclip } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { UploadManager } from '../media/upload/UploadManager';

export const MessageInput: React.FC = () => {
  const [text, setText] = useState('');
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const user = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    sendEvent('typing.start', { conversation_id: activeConversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendEvent('typing.stop', { conversation_id: activeConversationId }), 2000);
  };

  const handleEmojiClick = (emojiObject: any) => {
    setText(prev => prev + emojiObject.emoji);
  };
  
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

    sendEvent('typing.stop', { conversation_id: activeConversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !user) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const uploader = new UploadManager(file, {
      onProgress: (progress) => setUploadProgress(progress),
      onComplete: (attachmentId, url, mediaKeyBase64) => {
        setIsUploading(false);
        const msgId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const ciphertext = btoa(unescape(encodeURIComponent("📷 Media attachment")));
        
        const newMsg = {
          id: msgId,
          conversation_id: activeConversationId,
          sender_id: user.id,
          ciphertext,
          nonce: 'pending',
          signature: 'UNVERIFIED',
          key_version: 1,
          algorithm: 'AES-256-GCM',
          created_at: createdAt,
          is_edited: false,
          deleted_at: null,
          status: 'queued' as const,
          decrypted_text: "📷 Media attachment",
          media_attachments: [{ id: attachmentId, url, type: file.type.startsWith('video') ? 'video' : 'image', media_key: mediaKeyBase64 }]
        };
        enqueueMessage(newMsg);
        
        sendEvent('message.send', {
          id: msgId,
          conversation_id: activeConversationId,
          ciphertext,
          nonce: 'pending',
          signature: 'UNVERIFIED',
          key_version: 1,
          algorithm: 'AES-256-GCM',
          created_at: createdAt,
          media_id: attachmentId, // Using media_id per backend schema
          media_key: mediaKeyBase64
        });
      },
      onError: (err) => {
        setIsUploading(false);
        console.error("Upload failed", err);
      }
    });
    
    uploader.start().catch(console.error);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="relative">
      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-800 -translate-y-full">
          <div 
            className="h-full bg-blue-500 transition-all duration-300" 
            style={{ width: `${uploadProgress * 100}%` }}
          />
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-4 mb-2 z-50 shadow-2xl rounded-lg overflow-hidden border border-gray-700">
          <EmojiPicker 
            onEmojiClick={handleEmojiClick} 
            theme={'dark' as any}
            searchDisabled={false}
            skinTonesDisabled
          />
        </div>
      )}

      <form onSubmit={handleSend} className="p-4 bg-gray-900 border-t border-gray-800 flex items-center gap-3">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-full transition ${showEmojiPicker ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
        >
          <Smile size={24} />
        </button>

        <label className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer">
          <Paperclip size={24} />
          <input 
            type="file" 
            className="hidden" 
            accept="image/*,video/*" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>

        <input 
          type="text" 
          value={text}
          onChange={handleTextChange}
          onFocus={() => setShowEmojiPicker(false)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
        />
        <button 
          type="submit"
          disabled={!text.trim() || isUploading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-6 py-3 font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};
