import React, { useState, useRef, useCallback, useMemo } from 'react';
import { X, Search, ChevronUp, ChevronDown, Calendar, User as UserIcon } from 'lucide-react';
import { useChatStore } from './chatStore';
import { motion } from 'framer-motion';

interface ChatSearchProps {
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

export const ChatSearch: React.FC<ChatSearchProps> = ({ onClose, onNavigateToMessage }) => {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRecord = useChatStore(state => state.messages);
  const activeConversationId = useChatStore(state => state.activeConversationId);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return Object.values(messagesRecord)
      .filter(m => 
        m.conversation_id === activeConversationId &&
        !m.deleted_at &&
        m.decrypted_text &&
        m.decrypted_text.toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [query, messagesRecord, activeConversationId]);

  const goToResult = useCallback((index: number) => {
    if (results.length === 0) return;
    const safeIndex = ((index % results.length) + results.length) % results.length;
    setCurrentIndex(safeIndex);
    onNavigateToMessage(results[safeIndex].id);
  }, [results, onNavigateToMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToResult(currentIndex - 1);
      } else {
        goToResult(currentIndex + 1);
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (results.length > 0) {
      setCurrentIndex(0);
      onNavigateToMessage(results[0].id);
    }
  }, [query]);

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 px-3 py-2 bg-[#202c33] border-b border-[#222d34] shrink-0"
    >
      <div className="flex-1 flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-1.5">
        <Search size={16} className="text-[#8696a0] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-[#d1d7db] text-sm placeholder-[#8696a0] focus:outline-none"
        />
        {query && (
          <span className="text-[#8696a0] text-xs shrink-0">
            {results.length > 0 ? `${currentIndex + 1}/${results.length}` : '0 results'}
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToResult(currentIndex - 1)}
            className="p-1.5 text-[#aebac1] hover:bg-[#374248] rounded transition-colors"
            aria-label="Previous result"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={() => goToResult(currentIndex + 1)}
            className="p-1.5 text-[#aebac1] hover:bg-[#374248] rounded transition-colors"
            aria-label="Next result"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        className="p-1.5 text-[#aebac1] hover:text-[#d1d7db] hover:bg-[#374248] rounded transition-colors"
        aria-label="Close search"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
};
