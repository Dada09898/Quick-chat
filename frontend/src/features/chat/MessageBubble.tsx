import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from './chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import { useChatStore } from './chatStore';
import { ClientLinkPreview } from './ClientLinkPreview';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { decryptMediaChunk } from '../media/crypto'; // Mock for actual decryption logic
// Assuming useCryptoStore or similar provides the actual keys

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const [decryptedText, setDecryptedText] = useState<string | null>(message.decrypted_text || null);
  const [isDecrypting, setIsDecrypting] = useState(!message.decrypted_text);
  
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

  const handleSelection = () => {
    toggleMessageSelection(message.id);
  };const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = decryptedText ? Array.from(decryptedText.matchAll(urlRegex)).map(m => m[0]) : [];

  return (
    <motion.div 
      ref={bubbleRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      onClick={handleSelection}
      className={`group flex flex-col mb-1.5 w-full cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-500/10' : ''
      } ${isOwn ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex flex-col max-w-[85%] md:max-w-[65%] relative ${isOwn ? 'items-end' : 'items-start'}`}>
        <div 
          className={`px-3 py-1.5 pb-[22px] min-w-[100px] shadow-sm text-[15px] leading-relaxed break-words relative
            ${isDeleted ? 'bg-[#202c33] text-[#8696a0] italic rounded-lg border border-[#222d34]' :
              isOwn 
              ? 'bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none' 
              : 'bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none'
            }
          `}
        >
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

          {/* Deleted State */}
          {isDeleted && (
            <div className="flex items-center gap-2 text-[#8696a0]">
              <Trash2 size={16} />
              <span>This message was deleted</span>
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
            {media.type === 'image' ? (
              <img src={media.url || `https://placehold.co/400x300?text=Encrypted+Image`} alt="Attachment" className="w-full h-auto object-cover" />
            ) : (
              <video src={media.url} controls className="w-full h-auto" />
            )}
          </div>
        ))}

        {/* Link Previews */}
        {!isDeleted && urls.slice(0, 1).map((url, idx) => (
          <ClientLinkPreview key={idx} url={url} />
        ))}
        
        {/* External Actions (Bookmark/Delete outside) */}
        {!isDeleted && (
          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}`}>
            {isOwn && (
              <button 
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-gray-800 text-gray-500 hover:text-red-400"
                aria-label="Delete message"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleBookmark(message.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-gray-800 text-gray-500"
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark message"}
            >
              {isBookmarked ? <BookmarkCheck size={16} className="text-indigo-400" /> : <Bookmark size={16} />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
