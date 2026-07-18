import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from './chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useChatStore } from './chatStore';
import { ClientLinkPreview } from './ClientLinkPreview';
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
  }, [message.ciphertext, message.decrypted_text]);

  const { 
    selectedMessageIds, 
    toggleMessageSelection,
    bookmarkedMessageIds,
    toggleBookmark 
  } = useChatStore();
  
  const isSelected = selectedMessageIds.includes(message.id);
  const isBookmarked = bookmarkedMessageIds.includes(message.id);

  // Extract URLs for link preview
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = decryptedText ? Array.from(decryptedText.matchAll(urlRegex)).map(m => m[0]) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex flex-col w-full px-2 py-1 ${isSelected ? 'bg-blue-500/10' : ''}`}
      onClick={(e) => {
        if (selectedMessageIds.length > 0) {
          e.preventDefault();
          toggleMessageSelection(message.id);
        }
      }}
    >
      <div className={`flex flex-col max-w-[75%] ${isOwn ? 'self-end' : 'self-start'} mb-4 relative group`}>
        {/* Selection Checkbox */}
        {selectedMessageIds.length > 0 && (
          <div className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2`}>
            <input 
              type="checkbox" 
              checked={isSelected}
              readOnly
              className="w-5 h-5 rounded border-gray-400 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

      <div 
        className={`px-4 py-3 rounded-2xl ${
          isOwn 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-gray-800 text-gray-100 rounded-bl-none'
        }`}
      >
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
        </div>
        
        {/* Link Previews */}
        {urls.slice(0, 1).map((url, idx) => (
          <ClientLinkPreview key={idx} url={url} />
        ))}
      </div>
      
      <div className={`flex items-center mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
