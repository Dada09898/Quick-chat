import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from './chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bookmark, BookmarkCheck, Trash2, ChevronDown, CornerUpLeft, CornerUpRight, Copy, Smile, Edit2 } from 'lucide-react';
import { useChatStore } from './chatStore';
import { ClientLinkPreview } from './ClientLinkPreview';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { decryptMediaChunk } from '../media/crypto'; // Mock for actual decryption logic
// Assuming useCryptoStore or similar provides the actual keys
import { layoutVariants, springPresets } from '../../motion';
import { AudioBubble } from './AudioBubble';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, isOwn }) => {
  const [decryptedText, setDecryptedText] = useState<string | null>(message.decrypted_text || null);
  const [isDecrypting, setIsDecrypting] = useState(!message.decrypted_text);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    
    const lazyDecrypt = async () => {
      if (message.decrypted_text) return; // Already decrypted
      
      try {
        // In a real scenario, this fetches the conversation session key, 
        // decrypts the ciphertext payload (AES-GCM), and sets the plaintext.
        // We'll simulate the delay to demonstrate lazy decryption.
        await new Promise(resolve => setTimeout(resolve, 50)); 
        const plain = atob(message.ciphertext); // Mock base64 decryption
        
        if (isMounted) {
          setDecryptedText(plain);
          setIsDecrypting(false);
          // Optional: update chatStore so it doesn't decrypt again during this session
        }
      } catch (err) {
        if (isMounted) setDecryptedText("Decryption failed.");
      }
    };
    
    lazyDecrypt();
    
    return () => { isMounted = false; };
  }, [message.ciphertext, message.decrypted_text, message.deleted_at]);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const { sendEvent } = useRealtime();

  useEffect(() => {
    if (isOwn || message.status === 'read' || message.deleted_at) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        sendEvent('message.read', {
          message_id: message.id,
          conversation_id: message.conversation_id
        });
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    if (bubbleRef.current) {
      observer.observe(bubbleRef.current);
    }

    return () => observer.disconnect();
  }, [isOwn, message.status, message.deleted_at, message.id, message.conversation_id, sendEvent]);

  const { 
    selectedMessageIds, 
    toggleMessageSelection,
    bookmarkedMessageIds,
    toggleBookmark 
  } = useChatStore();
  
  const isSelected = selectedMessageIds.includes(message.id);
  const isBookmarked = bookmarkedMessageIds.includes(message.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendEvent('message.delete', {
      id: message.id,
      conversation_id: message.conversation_id
    });
  };

  const isDeleted = !!message.deleted_at;

  const setReplyingTo = useChatStore(state => state.setReplyingTo);
  const setForwardingMessageIds = useChatStore(state => state.setForwardingMessageIds);
  const setEditingMessageId = useChatStore(state => state.setEditingMessageId);
  const updateMessageReactions = useChatStore(state => state.updateMessageReactions);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleReaction = (emoji: string) => {
    // Optimistic update
    updateMessageReactions(message.id, user?.id || '', emoji);
    sendEvent('message.reaction', {
      message_id: message.id,
      conversation_id: message.conversation_id,
      reaction_ciphertext: emoji ? btoa(unescape(encodeURIComponent(emoji))) : null,
      nonce: 'pending',
      signature: 'UNVERIFIED',
      key_version: 1,
      algorithm: 'AES-256-GCM'
    });
    setShowEmojiPicker(false);
    setIsMenuOpen(false);
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReplyingTo(message.id);
    setIsMenuOpen(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMessageId(message.id);
    setIsMenuOpen(false);
  };

  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    setForwardingMessageIds([message.id]);
    setIsMenuOpen(false);
  };

  const handleSelection = () => {
    toggleMessageSelection(message.id);
  };const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = decryptedText ? Array.from(decryptedText.matchAll(urlRegex)).map(m => m[0]) : [];

  return (
    <motion.div 
      ref={bubbleRef}
      variants={isOwn ? layoutVariants.messageOutgoing : layoutVariants.messageIncoming}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={springPresets.message}
      layout
      onClick={handleSelection}
      className={`group flex flex-col mb-1.5 w-full cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-500/10' : ''
      } ${isOwn ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex flex-col max-w-[85%] md:max-w-[65%] relative ${isOwn ? 'items-end' : 'items-start'}`}>
        <div 
          onMouseLeave={() => { setIsMenuOpen(false); setShowEmojiPicker(false); }}
          className={`px-3 py-1.5 pb-[22px] min-w-[100px] shadow-sm text-[15px] leading-relaxed break-words relative group/bubble
            ${isDeleted ? 'bg-[#202c33] text-[#8696a0] italic rounded-lg border border-[#222d34]' :
              isOwn 
              ? 'bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none' 
              : 'bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none'
            }
          `}
        >
          {/* Context Menu Button */}
          {!isDeleted && (
            <div className={`absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10 bg-gradient-to-l from-[#005c4b] via-[#005c4b]/80 to-transparent ${!isOwn ? 'from-[#202c33] via-[#202c33]/80' : ''}`}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setIsMenuOpen(false); }}
                className="p-1 rounded-full text-[#8696a0] hover:text-[#d1d7db]"
              >
                <Smile size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); setShowEmojiPicker(false); }}
                className="p-1 rounded-full text-[#8696a0] hover:text-[#d1d7db]"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div className="absolute top-8 right-2 bg-[#2a3942] rounded-lg shadow-xl p-2 z-50 border border-[#222d34] flex gap-2">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                  className="hover:scale-125 transition-transform text-xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Context Menu Dropdown */}
          {isMenuOpen && !showEmojiPicker && (
            <motion.div 
              variants={layoutVariants.popoverMenu}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springPresets.fast}
              className="absolute top-8 right-2 w-40 bg-[#2a3942] rounded-lg shadow-xl py-2 z-50 border border-[#222d34]"
            >
              <button
                onClick={handleReply}
                className="w-full px-4 py-2 text-left text-[14px] text-[#e9edef] hover:bg-[#202c33] flex items-center gap-3"
              >
                <CornerUpLeft size={16} /> Reply
              </button>
              <button className="w-full px-4 py-2 text-left text-[14px] text-[#e9edef] hover:bg-[#202c33] flex items-center gap-3">
                <Copy size={16} /> Copy
              </button>
              <button
                onClick={handleForward}
                className="w-full px-4 py-2 text-left text-[14px] text-[#e9edef] hover:bg-[#202c33] flex items-center gap-3"
              >
                <CornerUpRight size={16} /> Forward
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleBookmark(message.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-[14px] text-[#e9edef] hover:bg-[#202c33] flex items-center gap-3"
              >
                {isBookmarked ? <BookmarkCheck size={16} className="text-[#00a884]"/> : <Bookmark size={16} />} 
                {isBookmarked ? 'Unstar' : 'Star'}
              </button>
              {isOwn && (
                <>
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-[14px] text-[#e9edef] hover:bg-[#202c33] flex items-center gap-3"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    onClick={(e) => { handleDelete(e); setIsMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-[14px] text-[#f15c6d] hover:bg-[#202c33] flex items-center gap-3"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* Decryption Loading State */}
          {isDecrypting && !isDeleted && <span className="animate-pulse text-gray-300">Decrypting...</span>}

          <div className="text-sm md:text-base markdown-body">
          {message.deleted_at ? 
            <span className="italic text-gray-400">This message was deleted</span> : 
            (isDecrypting ? <span className="animate-pulse text-gray-300">Decrypting...</span> : 
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        children={String(children).replace(/\n$/, '')}
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                      />
                    ) : (
                      <code {...props} className={`${className} bg-black/20 rounded px-1.5 py-0.5 text-[13px] font-mono`}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {decryptedText || ''}
              </ReactMarkdown>
            )
          }
          </div>

          {/* Deleted State */}
          {isDeleted && (
            <div className="flex items-center gap-2 text-[#8696a0]">
              <Trash2 size={16} />
              <span>This message was deleted</span>
            </div>
          )}

          {!isDeleted && message.is_edited && (
            <div className="text-[11px] text-[#8696a0] italic mt-1">(edited)</div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && !isDeleted && (
            <div className="absolute -bottom-3 right-0 bg-[#2a3942] rounded-full px-1.5 py-0.5 text-sm flex gap-1 border border-[#222d34] shadow-sm cursor-pointer z-10">
              {message.reactions.map((r, i) => {
                const emoji = r.reaction_plaintext || (r.reaction_ciphertext ? decodeURIComponent(escape(atob(r.reaction_ciphertext))) : '');
                return <span key={i}>{emoji}</span>;
              })}
            </div>
          )}

          {/* Timestamp and Read Receipt inside bubble */}
          <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-[#8696a0]">
            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isOwn && !isDeleted && (
              <span className="flex">
                {message.status === 'sending' && <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 10.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm.5-7H7v4l3.5 2 .5-1.25-2.5-1.5v-3.25z"/></svg>}
                {message.status === 'sent' && <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M12.5 4.5l-6 6-2.5-2.5-1 1 3.5 3.5 7-7-1-1z"/></svg>}
                {message.status === 'delivered' && <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M11 4.5l-6 6-2.5-2.5-1 1 3.5 3.5 7-7-1-1zm3.5-1l-7 7-1-1 7-7 1 1z"/></svg>}
                {message.status === 'read' && <svg viewBox="0 0 16 16" width="16" height="16" fill="#53bdeb"><path d="M11 4.5l-6 6-2.5-2.5-1 1 3.5 3.5 7-7-1-1zm3.5-1l-7 7-1-1 7-7 1 1z"/></svg>}
                {message.status === 'failed' && <span className="text-[#f15c6d]">!</span>}
              </span>
            )}
          </div>
        </div>
        
        {/* Media Attachments */}
        {!isDeleted && (message.media_attachments || []).map((media, idx) => (
          <div key={idx} className={`mt-1 rounded-lg overflow-hidden max-w-[280px] ${isOwn ? 'border-[#005c4b]' : 'border-[#202c33]'}`}>
            {media.type === 'audio' ? (
              <AudioBubble url={media.url} isOwn={isOwn} />
            ) : media.type === 'image' ? (
              <img src={media.url || `https://placehold.co/400x300?text=Encrypted+Image`} alt="Attachment" className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" decoding="async" />
            ) : (
              <video src={media.url} controls className="w-full h-auto" preload="metadata" />
            )}
          </div>
        ))}

        {/* Link Previews */}
        {!isDeleted && urls.slice(0, 1).map((url, idx) => (
          <ClientLinkPreview key={idx} url={url} />
        ))}
        
        {/* Reply To Rendering */}
        {!isDeleted && message.reply_to && useChatStore.getState().messages[message.reply_to] && (
          <div className={`mt-1 p-2 rounded bg-black/10 border-l-2 ${isOwn ? 'border-[#e9edef]' : 'border-[#00a884]'} opacity-80 text-sm`}>
            <span className="font-medium">{useChatStore.getState().messages[message.reply_to].sender_id === message.sender_id ? 'You' : 'User'}</span>
            <p className="truncate text-xs">{useChatStore.getState().messages[message.reply_to].decrypted_text}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});
