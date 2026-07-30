import React from 'react';
import { X, Send, Forward } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import toast from 'react-hot-toast';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({ isOpen, onClose }) => {
  const conversations = useChatStore(state => state.conversations);
  const forwardingMessageIds = useChatStore(state => state.forwardingMessageIds);
  const messagesRecord = useChatStore(state => state.messages);
  const setForwardingMessageIds = useChatStore(state => state.setForwardingMessageIds);
  const upsertMessage = useChatStore(state => state.upsertMessage);

  if (!isOpen || forwardingMessageIds.length === 0) return null;

  const handleForwardTo = (targetConvId: string) => {
    forwardingMessageIds.forEach(id => {
      const orig = messagesRecord[id];
      if (orig) {
        const forwardedMsg = {
          ...orig,
          id: `fwd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          conversation_id: targetConvId,
          created_at: new Date().toISOString(),
          decrypted_text: orig.decrypted_text ? `↪️ Forwarded: ${orig.decrypted_text}` : '↪️ Forwarded media',
          status: 'sent' as const
        };
        upsertMessage(forwardedMsg);
      }
    });

    toast.success(`Message forwarded!`);
    setForwardingMessageIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <Forward size={18} className="text-[#00a884]" /> Forward Message
          </h2>
          <button onClick={() => { setForwardingMessageIds([]); onClose(); }} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 text-xs text-[#8696a0] border-b border-[#222d34] bg-[#111b21]">
          Select a chat to forward {forwardingMessageIds.length} message(s):
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <p className="text-center py-6 text-xs text-[#8696a0]">No active conversations found.</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => handleForwardTo(conv.id)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#202c33] cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold text-xs flex items-center justify-center border border-[#00a884]/30">
                    {(conv.name || conv.display_name || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#e9edef]">{conv.name || conv.display_name || 'Conversation'}</h3>
                    <p className="text-xs text-[#8696a0]">Tap to send</p>
                  </div>
                </div>
                <Send size={16} className="text-[#00a884]" />
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
