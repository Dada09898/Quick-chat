import React, { useState } from 'react';
import { X, Clock, Shield, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import toast from 'react-hot-toast';

interface DisappearingMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisappearingMessagesModal: React.FC<DisappearingMessagesModalProps> = ({ isOpen, onClose }) => {
  const [selectedTimer, setSelectedTimer] = useState<'off' | '24h' | '7d' | '90d'>('off');
  const activeConversationId = useChatStore(state => state.activeConversationId);

  if (!isOpen) return null;

  const timerOptions = [
    { id: '24h', label: '24 Hours', desc: 'Messages disappear after 24 hours' },
    { id: '7d', label: '7 Days', desc: 'Messages disappear after 7 days' },
    { id: '90d', label: '90 Days', desc: 'Messages disappear after 90 days' },
    { id: 'off', label: 'Off', desc: 'Messages stay saved permanently' }
  ];

  const handleSaveTimer = () => {
    if (!activeConversationId) return;
    toast.success(selectedTimer === 'off' ? 'Disappearing messages turned off' : `Disappearing messages set to ${selectedTimer}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <Clock size={18} className="text-[#00a884]" /> Disappearing Messages
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[#8696a0] leading-relaxed">
            For more privacy and storage, all new messages in this chat will disappear after the selected duration. Existing messages won't be affected.
          </p>

          <div className="space-y-2">
            {timerOptions.map(opt => (
              <div
                key={opt.id}
                onClick={() => setSelectedTimer(opt.id as any)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedTimer === opt.id
                    ? 'bg-[#00a884]/10 border-[#00a884] text-[#e9edef]'
                    : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                <div>
                  <h4 className="text-sm font-medium text-[#e9edef]">{opt.label}</h4>
                  <p className="text-xs text-[#8696a0]">{opt.desc}</p>
                </div>
                {selectedTimer === opt.id && (
                  <div className="w-5 h-5 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center">
                    <Check size={14} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveTimer}
              className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold py-2.5 px-4 rounded-full transition shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
