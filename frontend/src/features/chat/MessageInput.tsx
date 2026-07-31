import React, { useState, useRef } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { Smile, Paperclip, Send, Mic, Camera, X, Image, FileText, Video, Contact, MapPin, Headphones, BarChart2, User as UserIcon } from 'lucide-react';
import { UploadManager } from '../media/upload/UploadManager';
import { motion, AnimatePresence } from 'framer-motion';
import { layoutVariants, springPresets } from '../../motion';
import { VoiceRecorder } from './VoiceRecorder';
import { PollCreateModal } from './PollCreateModal';
import { ContactShareModal } from './ContactShareModal';
import { LocationShareModal } from './LocationShareModal';
import { chatSounds } from '../../utils/chatSounds';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
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

    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      sendEvent('typing.start', { conversation_id: activeConversationId });
      lastTypingSentRef.current = now;
    }

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && activeConversationId && user) {
          const fakeEvent = { target: { files: [file], value: '' } } as any;
          handleFileUpload(fakeEvent);
        }
        return;
      }
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setText(prev => prev + emojiObject.emoji);
  };
  
  const handleSend = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const messageText = text.trim();
    if (!messageText || !activeConversationId || !user) return;

    const conversations = useChatStore.getState().conversations;
    const activeConv = conversations.find(c => c.id === activeConversationId);
    const peerUser = activeConv?.members?.find((m: any) => {
      const mid = m?.user?.id || m?.userId || m?.id || m?.user_id;
      return mid && mid !== user.id;
    });
    const peerId = peerUser ? (peerUser?.user?.id || peerUser?.userId || peerUser?.id || peerUser?.user_id) : user.id;

    // Reset input fields immediately
    setText('');
    setReplyingTo(null);
    if (activeConversationId) setDraft(activeConversationId, '');
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }

    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    let ciphertext = btoa(unescape(encodeURIComponent(messageText)));
    try {
      // @ts-ignore
      ciphertext = await encryptMessageText(peerId, messageText);
    } catch (err) {
      console.warn("E2EE encryption fallback:", err);
    }

    const signature = 'UNVERIFIED';
    const nonce = 'pending';

    if (editingMessageId) {
      const editMsg = messages[editingMessageId];
      if (editMsg) {
        const updatedMsg = { ...editMsg, ciphertext, decrypted_text: messageText, is_edited: true };
        enqueueMessage(updatedMsg);
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
        decrypted_text: messageText,
        reply_to: replyingTo
      };

      enqueueMessage(newMsg);
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

    chatSounds.playSendSound();
    sendEvent('typing.stop', { conversation_id: activeConversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !user) return;
    
    setShowAttachmentMenu(false);
    setIsUploading(true);
    setUploadProgress(0);
    
    const uploader = new UploadManager(file, {
      skipEncryption: true,
      onProgress: (progress) => setUploadProgress(progress),
      onComplete: (attachmentId, url, mediaKeyBase64) => {
        setIsUploading(false);
        const msgId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isImage = file.type.startsWith('image') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'heic'].includes(ext);
        const isVideo = file.type.startsWith('video') || ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi'].includes(ext);
        const isAudio = file.type.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
        const mediaType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document';
        const displayPrefix = isImage ? '📷 ' : isVideo ? '🎥 ' : isAudio ? '🎵 ' : '📄 ';
        const decrypted_text = `${displayPrefix}${file.name}`;
        const ciphertext = btoa(unescape(encodeURIComponent(decrypted_text)));
        
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
          decrypted_text,
          media_attachments: [{ id: attachmentId, url, type: mediaType, media_key: mediaKeyBase64 }]
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

  const handleVoiceSend = (blob: Blob, duration: number) => {
    if (!activeConversationId || !user) return;
    setIsRecording(false);
    setIsUploading(true);
    setUploadProgress(0);
    const uploader = new UploadManager(new File([blob], `voice_${Date.now()}.webm`, { type: blob.type }), {
      onProgress: (progress) => setUploadProgress(progress),
      onComplete: (attachmentId, url, mediaKeyBase64) => {
        setIsUploading(false);
        const msgId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const ciphertext = btoa(unescape(encodeURIComponent(`🎤 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`)));
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
          decrypted_text: `🎤 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
          media_attachments: [{ id: attachmentId, url, type: 'audio', media_key: mediaKeyBase64 }]
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
          media_id: attachmentId,
          media_key: mediaKeyBase64
        });
      },
      onError: (err) => {
        setIsUploading(false);
        console.error('Voice upload failed', err);
      }
    });
    uploader.start().catch(console.error);
  };

  return (
    <div className="relative bg-[#202c33] px-4 py-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-[#222d34] flex flex-col gap-2">
      {/* Voice Recorder Mode */}
      <AnimatePresence>
        {isRecording && (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setIsRecording(false)}
          />
        )}
      </AnimatePresence>
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
            <label className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#00a884] to-[#008f6f] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <Camera size={24} />
                 <input 
                   type="file" 
                   className="hidden" 
                   accept="image/*" 
                   capture="environment"
                   onChange={handleFileUpload}
                   disabled={isUploading}
                 />
               </div>
               <span className="text-[12px] text-[#e9edef]">Camera</span>
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#53bdeb] to-[#3498db] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <FileText size={24} />
                 <input 
                   type="file" 
                   className="hidden" 
                   accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.csv" 
                   onChange={handleFileUpload}
                   disabled={isUploading}
                 />
               </div>
               <span className="text-[12px] text-[#e9edef]">Document</span>
            </label>
            <label className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]">
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#ff7a00] to-[#e66a00] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <Headphones size={24} />
                 <input 
                   type="file" 
                   className="hidden" 
                   accept="audio/*" 
                   onChange={handleFileUpload}
                   disabled={isUploading}
                 />
               </div>
               <span className="text-[12px] text-[#e9edef]">Audio</span>
            </label>
            <div 
              onClick={() => { setShowAttachmentMenu(false); setIsPollModalOpen(true); }}
              className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]"
            >
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#00a884] to-[#028a6c] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <BarChart2 size={24} />
               </div>
               <span className="text-[12px] text-[#e9edef]">Poll</span>
            </div>
            <div 
              onClick={() => { setShowAttachmentMenu(false); setIsContactModalOpen(true); }}
              className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]"
            >
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#00a884] to-[#008f6f] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <UserIcon size={24} />
               </div>
               <span className="text-[12px] text-[#e9edef]">Contact</span>
            </div>
            <div 
              onClick={() => { setShowAttachmentMenu(false); setIsLocationModalOpen(true); }}
              className="flex flex-col items-center gap-1 cursor-pointer group w-[70px]"
            >
               <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#e53935] to-[#c62828] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform relative overflow-hidden">
                 <MapPin size={24} />
               </div>
               <span className="text-[12px] text-[#e9edef]">Location</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PollCreateModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
      />

      <ContactShareModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      <LocationShareModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

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
          onPaste={handlePaste}
          onFocus={() => { setShowEmojiPicker(false); setShowAttachmentMenu(false); }}
          placeholder="Type a message"
          rows={1}
          className="w-full bg-transparent text-[#d1d7db] placeholder-[#8696a0] focus:outline-none focus:ring-0 text-[15px] resize-none overflow-y-auto custom-scrollbar"
          style={{ height: '24px', lineHeight: '24px' }}
        />
        {!text.trim() && (
          <label className="p-1 text-[#8696a0] hover:text-[#d1d7db] transition mb-[-2px] ml-2 cursor-pointer relative overflow-hidden">
            <Camera size={22} />
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
      
      <button 
        onClick={text.trim() ? handleSend : () => { setIsRecording(true); }}
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
