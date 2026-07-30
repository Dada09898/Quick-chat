import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from './chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bookmark, BookmarkCheck, Trash2, ChevronDown, CornerUpLeft, CornerUpRight, Copy, Smile, Edit2 } from 'lucide-react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { ClientLinkPreview } from './ClientLinkPreview';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { layoutVariants, springPresets } from '../../motion';
import { AudioBubble } from './AudioBubble';
import { DocumentCard } from './DocumentCard';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, isOwn }) => {
  const [decryptedText, setDecryptedText] = useState<string | null>(message.decrypted_text || null);
  const [isDecrypting, setIsDecrypting] = useState(!message.decrypted_text);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewImageFull, setViewImageFull] = useState<string | null>(null);
  const user = useAuthStore(state => state.user);
  
  useEffect(() => {
    let isMounted = true;
    
    const lazyDecrypt = async () => {
      if (message.decrypted_text) return; // Already decrypted
      
      try {
        await new Promise(resolve => setTimeout(resolve, 50)); 
        const plain = atob(message.ciphertext); // Mock base64 decryption
        
        if (isMounted) {
          setDecryptedText(plain);
          setIsDecrypting(false);
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
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (decryptedText) {
      navigator.clipboard.writeText(decryptedText).catch(console.error);
    }
    setIsMenuOpen(false);
  };

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = decryptedText ? Array.from(decryptedText.matchAll(urlRegex)).map(m => m[0]) : [];

  // Replied-to message
  const replyToMsg = !isDeleted && message.reply_to ? useChatStore.getState().messages[message.reply_to] : null;

  // Normalize attachments (support both media_attachments and backend attachments)
  const rawAttachments: any[] = message.media_attachments || (message as any).attachments || [];

  // Parse file prefix if text starts with emoji (📷, 🎥, 📄, 🎵)
  const mediaEmojiMatch = decryptedText ? decryptedText.match(/^(📷|🎥|📄|🎵)\s+(.*)/) : null;
  const isMediaIndicatorText = !!mediaEmojiMatch;
  const mediaEmojiPrefix = mediaEmojiMatch ? mediaEmojiMatch[1] : '';
  const mediaFilenameText = mediaEmojiMatch ? mediaEmojiMatch[2] : '';

  // Determine media type
  const getMediaType = (mediaItem?: any) => {
    const mime = mediaItem?.mime_type || mediaItem?.type || '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime && mime !== 'application/octet-stream') return 'document';

    const filename = mediaItem?.original_filename || mediaItem?.filename || mediaItem?.s3_key || '';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt'].includes(ext)) return 'document';

    if (mediaEmojiPrefix === '📷') return 'image';
    if (mediaEmojiPrefix === '🎥') return 'video';
    if (mediaEmojiPrefix === '🎵') return 'audio';
    if (mediaEmojiPrefix === '📄') return 'document';
    return 'document';
  };

  // Helper to format attachment media URL
  const getMediaUrl = (mediaItem?: any) => {
    if (mediaItem?.url) return mediaItem.url;
    if (mediaItem?.s3_key) {
      return mediaItem.s3_key.startsWith('http') ? mediaItem.s3_key : `${VITE_API_URL}/media/${mediaItem.s3_key}`;
    }
    return '';
  };

  const hasAttachments = rawAttachments.length > 0;
  const hasFallbackMediaText = isMediaIndicatorText && !hasAttachments;

  return (
    <motion.div 
      ref={bubbleRef}
      variants={isOwn ? layoutVariants.messageOutgoing : layoutVariants.messageIncoming}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={springPresets.message}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 60 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 40) {
          setReplyingTo(message.id);
        }
      }}
      onClick={handleSelection}
      className={`group flex flex-col w-full cursor-pointer transition-colors ${
        isSelected ? 'bg-[#00a884]/5' : ''
      } ${isOwn ? 'items-end' : 'items-start'}`}
      style={{ paddingLeft: isOwn ? '15%' : '0', paddingRight: isOwn ? '0' : '15%' }}
    >
      {/* Image Fullscreen Viewer Overlay */}
      {viewImageFull && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setViewImageFull(null)}
        >
          <img src={viewImageFull} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      <div className={`flex flex-col relative ${isOwn ? 'items-end' : 'items-start'}`} style={{ maxWidth: '100%' }}>
        {/* Bubble with WhatsApp-style tail */}
        <div 
          onMouseLeave={() => { setIsMenuOpen(false); setShowEmojiPicker(false); }}
          style={{
            fontSize: 'var(--chat-font-size, 14.2px)',
            backgroundColor: isOwn && !isDeleted ? 'var(--accent-color, #005c4b)' : undefined
          }}
          className={`relative min-w-[120px] max-w-[340px] md:max-w-[420px] shadow-sm leading-[19px] break-words
            ${isDeleted ? 'bg-[#202c33] text-[#8696a0] italic rounded-[7.5px] border border-[#222d34] px-[9px] py-[6px] pb-[20px]' :
              isOwn 
              ? 'wa-bubble-out text-[#e9edef] rounded-[7.5px] rounded-tr-none px-[9px] py-[6px] pb-[20px]' 
              : 'wa-bubble-in bg-[#202c33] text-[#e9edef] rounded-[7.5px] rounded-tl-none px-[9px] py-[6px] pb-[20px]'
            }
          `}
        >
          {/* Context Menu & Quick Hover Reaction Trigger */}
          {!isDeleted && (
            <div className={`absolute top-[2px] ${isOwn ? 'right-[2px]' : 'right-[2px]'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-[#202c33]/80 rounded-full px-1 py-0.5 backdrop-blur-sm`}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setIsMenuOpen(false); }}
                className="p-[2px] rounded-full hover:bg-white/10 text-[#8696a0] hover:text-[#00a884] transition"
                title="Quick Reaction"
              >
                <Smile size={15} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); setShowEmojiPicker(false); }}
                className="p-[2px] rounded-full hover:bg-white/10 text-[#8696a0] hover:text-[#e9edef] transition"
                title="Message Menu"
              >
                <ChevronDown size={15} />
              </button>
            </div>
          )}

          {/* Quick Reactions */}
          {showEmojiPicker && (
            <div className="absolute -top-10 right-0 bg-[#233138] rounded-full shadow-xl px-2 py-1.5 z-50 border border-[#222d34] flex gap-1.5">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                  className="hover:scale-125 active:scale-90 transition-transform text-[20px] w-8 h-8 flex items-center justify-center"
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
              className={`absolute top-8 ${isOwn ? 'right-0' : 'left-0'} w-[200px] bg-[#233138] rounded-lg shadow-2xl py-1.5 z-50 border border-[#1d2d35]`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(true); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#e9edef] hover:bg-[#182229] flex items-center gap-3"
              >
                <Smile size={18} className="text-[#8696a0]" /> React
              </button>
              <button
                onClick={handleReply}
                className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#e9edef] hover:bg-[#182229] flex items-center gap-3"
              >
                <CornerUpLeft size={18} className="text-[#8696a0]" /> Reply
              </button>
              <button
                onClick={handleCopy}
                className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#e9edef] hover:bg-[#182229] flex items-center gap-3"
              >
                <Copy size={18} className="text-[#8696a0]" /> Copy
              </button>
              <button
                onClick={handleForward}
                className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#e9edef] hover:bg-[#182229] flex items-center gap-3"
              >
                <CornerUpRight size={18} className="text-[#8696a0]" /> Forward
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleBookmark(message.id); setIsMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#e9edef] hover:bg-[#182229] flex items-center gap-3"
              >
                {isBookmarked ? <BookmarkCheck size={18} className="text-[#00a884]"/> : <Bookmark size={18} className="text-[#8696a0]" />} 
                {isBookmarked ? 'Unstar' : 'Star'}
              </button>
              {isOwn && (
                <>
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#e9edef] hover:bg-[#182229] flex items-center gap-3"
                  >
                    <Edit2 size={18} className="text-[#8696a0]" /> Edit
                  </button>
                  <div className="border-t border-[#1d2d35] my-1" />
                  <button
                    onClick={(e) => { handleDelete(e); setIsMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-[14.5px] text-[#ea4335] hover:bg-[#182229] flex items-center gap-3"
                  >
                    <Trash2 size={18} /> Delete
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* Reply Quote (inside bubble, WhatsApp style) */}
          {replyToMsg && (
            <div className={`-mx-[5px] -mt-[2px] mb-[3px] p-[5px] pl-[8px] rounded-[5px] border-l-[4px] cursor-pointer ${
              isOwn 
                ? 'bg-[#025144] border-l-[#06cf9c]' 
                : 'bg-[#1d282f] border-l-[#53bdeb]'
            }`}>
              <span className={`text-[12.5px] font-medium block ${isOwn ? 'text-[#06cf9c]' : 'text-[#53bdeb]'}`}>
                {replyToMsg.sender_id === user?.id ? 'You' : 'User'}
              </span>
              <p className="text-[13px] text-[#8696a0] truncate mt-[1px]">{replyToMsg.decrypted_text || 'Media'}</p>
            </div>
          )}

          {/* Media Attachments Rendering */}
          {!isDeleted && hasAttachments && (
            <div className="-mx-[9px] -mt-[6px] mb-1">
              {rawAttachments.map((media, idx) => {
                const mediaUrl = getMediaUrl(media);
                const type = getMediaType(media);

                if (type === 'audio') {
                  return <AudioBubble key={idx} url={mediaUrl} isOwn={isOwn} />;
                }
                if (type === 'document') {
                  return <DocumentCard key={idx} url={mediaUrl} filename={media.original_filename || mediaFilenameText || 'Document'} isOwn={isOwn} />;
                }
                if (type === 'video') {
                  return (
                    <div key={idx} className="rounded-t-[7.5px] overflow-hidden bg-black">
                      <video src={mediaUrl} controls className="w-full h-auto max-h-[300px]" preload="metadata" />
                    </div>
                  );
                }
                // Image
                return (
                  <div key={idx} className="rounded-t-[7.5px] overflow-hidden">
                    <img 
                      src={mediaUrl} 
                      alt="Attachment" 
                      onClick={() => setViewImageFull(mediaUrl)}
                      className="w-full h-auto max-h-[320px] object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                      loading="lazy" 
                      decoding="async" 
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback Media Indicator (If text starts with 📷, 🎥, 📄, 🎵) */}
          {!isDeleted && hasFallbackMediaText && (
            <div className="-mx-[9px] -mt-[6px] mb-1">
              {(mediaEmojiPrefix === '📷' || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(mediaFilenameText.split('.').pop()?.toLowerCase() || '')) ? (
                <div className="rounded-t-[7.5px] overflow-hidden bg-[#111b21] relative flex items-center justify-center min-h-[160px] border-b border-[#222d34]">
                  <img 
                    src={mediaFilenameText.startsWith('http') || mediaFilenameText.startsWith('blob:') ? mediaFilenameText : `${VITE_API_URL}/media/${mediaFilenameText}`}
                    alt={mediaFilenameText || 'Photo Attachment'} 
                    onError={(e) => {
                      // Fallback if image URL is not available
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="p-4 flex flex-col items-center justify-center gap-2 text-[#8696a0]"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#00a884]"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs font-medium text-[#e9edef]">${mediaFilenameText}</span></div>`;
                      }
                    }}
                    onClick={() => setViewImageFull(`${VITE_API_URL}/media/${mediaFilenameText}`)}
                    className="w-full h-auto max-h-[320px] object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                    loading="lazy" 
                  />
                </div>
              ) : (
                <DocumentCard url={`${VITE_API_URL}/media/${mediaFilenameText}`} filename={mediaFilenameText || 'Document'} isOwn={isOwn} />
              )}
            </div>
          )}

          {/* Deleted Message */}
          {isDeleted && (
            <div className="flex items-center gap-2 text-[#8696a0]">
              <Trash2 size={14} />
              <span className="italic text-[13.5px]">This message was deleted</span>
            </div>
          )}

          {/* Regular Message Text (Hide if it's purely a media header indicator) */}
          {!isDeleted && !isMediaIndicatorText && (
            <div className="wa-msg-text">
              {isDecrypting ? (
                <span className="animate-pulse text-[#8696a0] text-[13px]">Decrypting...</span>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({children}) => <span className="inline">{children}</span>,
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
                        <code {...props} className={`${className} bg-black/20 rounded px-1 py-0.5 text-[13px] font-mono`}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {decryptedText || ''}
                </ReactMarkdown>
              )}
            </div>
          )}

          {!isDeleted && message.is_edited && (
            <span className="text-[11px] text-[#8696a0] italic ml-1">(edited)</span>
          )}

          {/* Timestamp + Read Receipt */}
          <span className="wa-msg-meta float-right ml-[8px] mt-[3px] relative top-[3px]">
            <span className="text-[11px] text-[#ffffff99] leading-none">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && !isDeleted && (
              <span className="inline-flex ml-[3px] align-bottom">
                {message.status === 'sending' && <svg viewBox="0 0 16 16" width="16" height="11" fill="#ffffff80"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 10.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm.5-7H7v4l3.5 2 .5-1.25-2.5-1.5v-3.25z"/></svg>}
                {message.status === 'queued' && <svg viewBox="0 0 16 16" width="16" height="11" fill="#ffffff80"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 10.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm.5-7H7v4l3.5 2 .5-1.25-2.5-1.5v-3.25z"/></svg>}
                {message.status === 'sent' && <svg viewBox="0 0 16 15" width="16" height="11" fill="#ffffff99"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/></svg>}
                {message.status === 'delivered' && <svg viewBox="0 0 16 15" width="16" height="11" fill="#ffffff99"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/><path d="M12.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L5.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/></svg>}
                {message.status === 'read' && <svg viewBox="0 0 16 15" width="16" height="11" fill="#53bdeb"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/><path d="M12.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L5.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/></svg>}
                {message.status === 'failed' && <span className="text-[#ea4335] text-[12px] font-bold">!</span>}
              </span>
            )}
          </span>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && !isDeleted && (
            <div className="absolute -bottom-[14px] right-[4px] bg-[#233138] rounded-full px-[6px] py-[2px] text-[14px] flex gap-[2px] border border-[#1d2d35] shadow-md cursor-pointer z-10">
              {message.reactions.map((r, i) => {
                const emoji = r.reaction_plaintext || (r.reaction_ciphertext ? decodeURIComponent(escape(atob(r.reaction_ciphertext))) : '');
                return <span key={i}>{emoji}</span>;
              })}
              {message.reactions.length > 1 && (
                <span className="text-[11px] text-[#8696a0] ml-[2px]">{message.reactions.length}</span>
              )}
            </div>
          )}
        </div>

        {/* Link Previews */}
        {!isDeleted && urls.slice(0, 1).map((url, idx) => (
          <ClientLinkPreview key={idx} url={url} />
        ))}
      </div>
    </motion.div>
  );
});
