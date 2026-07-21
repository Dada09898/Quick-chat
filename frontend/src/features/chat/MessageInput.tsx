import React, { useState, useRef } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { Smile, Paperclip, Send, Mic, Camera, X, Image, FileText, Video, Contact, MapPin, Headphones } from 'lucide-react';
import { UploadManager } from '../media/upload/UploadManager';
import { motion, AnimatePresence } from 'framer-motion';
import { layoutVariants, springPresets } from '../../motion';

const LazyEmojiPicker = React.lazy(() => import('emoji-picker-react'));

export const MessageInput: React.FC = () => {
  const [text, setText] = useState('');
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const activeDraft = useChatStore(state => state.activeConversationId ? state.drafts[state.activeConversationId] : '');
  const setDraft = useChatStore(state => state.setDraft);
  const user = useAuthStore(state => state.user);
  const replyingTo = useChatStore(state => state.replyingTo);
  const setReplyingTo = useChatStore(state => state.setReplyingTo);
  const editingMessageId = useChatStore(state => state.editingMessageId);
  const setEditingMessageId = useChatStore(state => state.setEditingMessageId);
  const messages = useChatStore(state => state.messages);
  const { sendEvent } = useRealtime();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore draft or edit text
  React.useEffect(() => {
    if (editingMessageId) {
      const editMsg = messages[editingMessageId];
      if (editMsg) {
        setText(editMsg.decrypted_text || '');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    } else if (activeConversationId) {
      const draft = activeDraft || '';
      setText(draft);
      if (textareaRef.current) {
        // Reset height then adjust based on text
        textareaRef.current.style.height = '24px';
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
          }
        }, 0);
      }
    }
  }, [activeConversationId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (activeConversationId) {
      setDraft(activeConversationId, val);
    }
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    sendEvent('typing.start', { conversation_id: activeConversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendEvent('typing.stop', { conversation_id: activeConversationId }), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowEmojiPicker(false);
      setShowAttachmentMenu(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
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

    if (editingMessageId) {
      const editMsg = messages[editingMessageId];
      if (editMsg) {
        const updatedMsg = { ...editMsg, ciphertext, decrypted_text: text, is_edited: true };
        enqueueMessage(updatedMsg); // updates locally
        sendEvent('message.edit', {
          id: editingMessageId,
          conversation_id: activeConversationId,
          ciphertext,
          nonce,
          signature,
          key_version: 1,
          algorithm: 'AES-256-GCM',
        });
      }
      setEditingMessageId(null);
    } else {
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
        reply_to: replyingTo
      };

      enqueueMessage(newMsg);
      // 2. Transmit via WebSocket
      sendEvent('message.send', {
        id: msgId,
        conversation_id: activeConversationId,
        ciphertext,
        nonce,
        signature,
        key_version: 1,
        algorithm: 'AES-256-GCM',
        created_at: createdAt,
        reply_to_id: replyingTo
      });
    }

    setText('');
    setReplyingTo(null);
    if (activeConversationId) setDraft(activeConversationId, '');
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

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

  const replyingToMessage = replyingTo ? messages[replyingTo] : null;

  return (
    <div className="relative bg-[#202c33] px-4 py-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-[#222d34] flex flex-col gap-2">
      {/* Edit Preview */}
      {editingMessageId && messages[editingMessageId] && (
        <div className="flex items-center justify-between bg-[#2a3942] p-2 rounded-lg border-l-4 border-[#53bdeb] mb-2">
          <div className="flex flex-col overflow-hidden">
            <span className="text-[#53bdeb] text-xs font-medium mb-1">Editing Message</span>
            <span className="text-[#d1d7db] text-sm truncate">
              {messages[editingMessageId].decrypted_text || 'Media'}
            </span>
          </div>
          <button
            onClick={() => { setEditingMessageId(null); setText(''); }}
            className="text-[#8696a0] hover:text-[#d1d7db] p-1"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Reply Preview */}
      {replyingToMessage && !editingMessageId && (
        <div className="flex items-center justify-between bg-[#2a3942] p-2 rounded-lg border-l-4 border-[#00a884] mb-2">
          <div className="flex flex-col overflow-hidden">
            <span className="text-[#00a884] text-xs font-medium mb-1">
              {replyingToMessage.sender_id === user?.id ? 'You' : 'User'}
            </span>
            <span className="text-[#d1d7db] text-sm truncate">
              {replyingToMessage.decrypted_text || 'Media'}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-[#8696a0] hover:text-[#d1d7db] p-1"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 w-full">
      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="absolute top-0 left-0 w-full h-1 bg-[#202c33] -translate-y-full">
          <div 
            className="h-full bg-[#00a884] transition-all duration-300" 
            style={{ width: `${uploadProgress * 100}%` }}
          />
        </div>
      )}

      {/* Emoji Picker Popover */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div 
            variants={layoutVariants.popoverMenu}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springPresets.fast}
            className="absolute bottom-full left-4 mb-2 z-50 shadow-2xl rounded-lg overflow-hidden border border-[#222d34] bg-[#202c33]"
          >
            <React.Suspense fallback={<div className="w-[350px] h-[400px] flex items-center justify-center text-[#8696a0]">Loading emojis...</div>}>
              <LazyEmojiPicker 
                onEmojiClick={handleEmojiClick} 
                theme={'dark' as any}
                searchDisabled={false}
                skinTonesDisabled
              />
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Menu Popover */}
      <AnimatePresence>
        {showAttachmentMenu && (
          <motion.div 
            variants={layoutVariants.popoverAttachment}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springPresets.fast}
            className="absolute bottom-full left-14 mb-4 z-50 bg-[#2a3942] rounded-2xl shadow-xl border border-[#222d34] p-4 flex gap-4 w-[280px] flex-wrap justify-center"
          >
            <label className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#bf59cf] to-[#9c27b0] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <Image size={24} />
                 <input 
                   type="file" 
                   className="hidden" 
                   accept="image/*,video/*" 
                   onChange={handleFileUpload}
                   disabled={isUploading}
                 />
               </div>
               <span className="text-[12px] text-[#e9edef]">Photos</span>
            </label>
            <div className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#00a884] to-[#008f6f] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                 <Camera size={24} />
               </div>
               <span className="text-[12px] text-[#e9edef]">Camera</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#53bdeb] to-[#3498db] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                 <FileText size={24} />
               </div>
               <span className="text-[12px] text-[#e9edef]">Document</span>
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#ff7a00] to-[#e66a00] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                 <Headphones size={24} />
               </div>
               <span className="text-[12px] text-[#e9edef]">Audio</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        type="button" 
        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachmentMenu(false); }}
        className={`p-2 rounded-full transition ${showEmojiPicker ? 'bg-[#2a3942] text-[#d1d7db]' : 'text-[#8696a0] hover:text-[#d1d7db]'}`}
      >
        <Smile size={24} />
      </button>

      <button 
        type="button" 
        onClick={() => { setShowAttachmentMenu(!showAttachmentMenu); setShowEmojiPicker(false); }}
        className={`p-2 rounded-full transition ${showAttachmentMenu ? 'bg-[#2a3942] text-[#d1d7db]' : 'text-[#8696a0] hover:text-[#d1d7db]'}`}
      >
        <Paperclip size={24} />
      </button>

      <div className="flex-1 bg-[#2a3942] rounded-xl flex items-end px-4 py-2 min-h-[44px]">
        <textarea 
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setShowEmojiPicker(false); setShowAttachmentMenu(false); }}
          placeholder="Type a message"
          rows={1}
          className="w-full bg-transparent text-[#d1d7db] placeholder-[#8696a0] focus:outline-none focus:ring-0 text-[15px] resize-none overflow-y-auto custom-scrollbar"
          style={{ height: '24px', lineHeight: '24px' }}
        />
        {!text.trim() && (
          <button className="p-1 text-[#8696a0] hover:text-[#d1d7db] transition mb-[-2px] ml-2">
            <Camera size={22} />
          </button>
        )}
      </div>
      
      <button 
        onClick={text.trim() ? handleSend : () => { /* Placeholder for Voice Record Start */ }}
        className="p-3 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full transition-colors flex items-center justify-center shrink-0 w-[44px] h-[44px] relative overflow-hidden"
      >
        <AnimatePresence mode="popLayout">
          {text.trim() ? (
            <motion.div
              key="send"
              initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
              transition={springPresets.fab}
            >
              <Send size={20} className="ml-1" />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={springPresets.fab}
            >
              <Mic size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      </div>
    </div>
  );
};
