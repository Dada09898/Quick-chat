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
      className={`group flex flex-col mb-1 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-500/10 -mx-4 px-4 py-1' : ''
      } ${isOwn ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div 
          className={`px-4 py-2 rounded-2xl relative shadow-sm text-[15px] leading-relaxed break-words
            ${isDeleted ? 'bg-gray-800 text-gray-500 italic border border-gray-700' :
              isOwn 
              ? 'bg-blue-600 text-white rounded-br-sm' 
              : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
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
                      <code {...props} className={`${className} bg-black/20 rounded px-1 py-0.5`}>
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
            <div className="flex items-center gap-2">
              <Trash2 size={16} />
              <span>This message was deleted</span>
            </div>
          )}
        </div>
        
        {/* Media Attachments */}
        {!isDeleted && (message.media_attachments || []).map((media, idx) => (
          <div key={idx} className="mt-2 rounded-lg overflow-hidden border border-gray-700 max-w-sm">
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
      </div>
      
      <div className={`flex items-center mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        {!isDeleted && isOwn && (
          <button 
            onClick={handleDelete}
            className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 text-gray-400 hover:text-red-400"
            aria-label="Delete message"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleBookmark(message.id); }}
          className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark message"}
        >
          {isBookmarked ? <BookmarkCheck size={14} className="text-accent" /> : <Bookmark size={14} />}
        </button>
        
        <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        
        {isOwn && (
          <span className="ml-2">
            {message.status === 'sending' && '•'}
            {message.status === 'sent' && '✓'}
            {message.status === 'delivered' && '✓✓'}
            {message.status === 'read' && <span className="text-blue-400">✓✓</span>}
            {message.status === 'failed' && <span className="text-red-500">!</span>}
          </span>
        )}
      </div>
      </div>
    </motion.div>
  );
};
