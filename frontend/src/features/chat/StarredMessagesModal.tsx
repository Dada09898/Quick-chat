import React from 'react';
import { X, Star, ArrowRight, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import toast from 'react-hot-toast';

interface StarredMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({ isOpen, onClose }) => {
  const starredMessageIds = useChatStore(state => state.starredMessageIds);
  const messagesRecord = useChatStore(state => state.messages);
  const toggleStar = useChatStore(state => state.toggleStar);
  const setScrollToMessageId = useChatStore(state => state.setScrollToMessageId);

  if (!isOpen) return null;

  const starredMsgs = starredMessageIds
    .map(id => messagesRecord[id])
    .filter(Boolean);

  const handleJumpToMessage = (msgId: string) => {
    setScrollToMessageId(msgId);
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
            <Star size={18} className="text-yellow-400 fill-yellow-400" /> Starred Messages ({starredMsgs.length})
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {starredMsgs.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center mx-auto text-[#8696a0]">
                <Star size={24} />
              </div>
              <p className="text-sm text-[#e9edef] font-medium">No Starred Messages</p>
              <p className="text-xs text-[#8696a0]">Tap and hold any message in a chat and select Star to save it here for quick access.</p>
            </div>
          ) : (
            starredMsgs.map(msg => (
              <div
                key={msg.id}
                className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3 space-y-2 text-xs relative group"
              >
                <div className="flex items-center justify-between text-[#8696a0]">
                  <span className="font-medium text-[#00a884]">{msg.sender_id || 'User'}</span>
                  <span>{new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <p className="text-[#e9edef] text-sm leading-snug break-words">
                  {msg.decrypted_text || msg.ciphertext || '[Media Attachment]'}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#2a3942]/60">
                  <button
                    onClick={() => handleJumpToMessage(msg.id)}
                    className="text-[#53bdeb] hover:underline flex items-center gap-1 font-medium"
                  >
                    Jump to message <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => { toggleStar(msg.id); toast.success('Unstarred'); }}
                    className="text-[#8696a0] hover:text-red-400 p-1 transition"
                    title="Remove Star"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
