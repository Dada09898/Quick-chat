import React, { useState } from 'react';
import { X, User, Search, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { apiClient } from '../../lib/api';
import toast from 'react-hot-toast';

interface ContactShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactShareModal: React.FC<ContactShareModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const user = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();

  if (!isOpen) return null;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiClient(`/api/auth/search/?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShareContact = (targetUser: any) => {
    if (!activeConversationId || !user) return;

    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const contactName = targetUser.display_name || targetUser.username || 'Contact';
    const contactEmail = targetUser.email || '';
    const text = `👤 CONTACT CARD: ${contactName}\nEmail: ${contactEmail}`;
    const ciphertext = btoa(unescape(encodeURIComponent(text)));

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
      decrypted_text: text
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
      created_at: createdAt
    });

    toast.success(`Shared contact: ${contactName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <User size={18} className="text-[#00a884]" /> Share Contact
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-[#222d34]">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-[#8696a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search contact by name or email..."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {isSearching ? (
            <p className="text-center py-6 text-xs text-[#8696a0]">Searching contacts...</p>
          ) : searchResults.length > 0 ? (
            searchResults.map(u => (
              <div
                key={u.id}
                onClick={() => handleShareContact(u)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#202c33] cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold text-sm flex items-center justify-center border border-[#00a884]/30">
                    {(u.display_name || u.username || u.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#e9edef]">{u.display_name || u.username || 'User'}</h3>
                    <p className="text-xs text-[#8696a0]">{u.email}</p>
                  </div>
                </div>
                <Send size={16} className="text-[#00a884]" />
              </div>
            ))
          ) : searchQuery.length >= 2 ? (
            <p className="text-center py-6 text-xs text-[#8696a0]">No contacts found.</p>
          ) : (
            <p className="text-center py-6 text-xs text-[#8696a0]">Type at least 2 characters to search directory.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
