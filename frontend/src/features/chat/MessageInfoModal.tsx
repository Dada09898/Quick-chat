import React from 'react';
import { X, CheckCheck, Check, Clock, ShieldCheck, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ChatMessage } from './chatStore';

interface MessageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen || !message) return null;

  const createdAtDate = new Date(message.created_at);
  const formattedCreated = createdAtDate.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const deliveredDate = new Date(createdAtDate.getTime() + 1200); // 1.2s delay mock
  const formattedDelivered = deliveredDate.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const readDate = new Date(createdAtDate.getTime() + 4500); // 4.5s delay mock
  const formattedRead = readDate.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <Info size={18} className="text-[#00a884]" /> Message Info
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Message Preview Bubble */}
          <div className="bg-[#005c4b] text-[#e9edef] p-3.5 rounded-xl border border-[#00a884]/30 shadow-md text-sm leading-relaxed break-words">
            {message.decrypted_text || message.ciphertext || '[Media Attachment]'}
          </div>

          {/* Timestamps & Status Timeline */}
          <div className="bg-[#202c33] rounded-2xl p-4 border border-[#2a3942] space-y-4">
            {/* Read Status */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#53bdeb]/20 flex items-center justify-center text-[#53bdeb] mt-0.5">
                <CheckCheck size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#e9edef] font-medium text-sm">Read</span>
                  <span className="text-xs text-[#8696a0]">{formattedRead}</span>
                </div>
                <p className="text-xs text-[#8696a0] mt-0.5">Read by recipient</p>
              </div>
            </div>

            <div className="h-px bg-[#2a3942]" />

            {/* Delivered Status */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8696a0]/20 flex items-center justify-center text-[#8696a0] mt-0.5">
                <CheckCheck size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#e9edef] font-medium text-sm">Delivered</span>
                  <span className="text-xs text-[#8696a0]">{formattedDelivered}</span>
                </div>
                <p className="text-xs text-[#8696a0] mt-0.5">Delivered to device</p>
              </div>
            </div>

            <div className="h-px bg-[#2a3942]" />

            {/* Sent Status */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8696a0]/20 flex items-center justify-center text-[#8696a0] mt-0.5">
                <Check size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#e9edef] font-medium text-sm">Sent</span>
                  <span className="text-xs text-[#8696a0]">{formattedCreated}</span>
                </div>
                <p className="text-xs text-[#8696a0] mt-0.5">Dispatched from your device</p>
              </div>
            </div>
          </div>

          {/* Security & Algorithm badge */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#182229] rounded-xl text-xs text-[#8696a0]">
            <span className="flex items-center gap-1.5 text-[#00a884] font-medium">
              <ShieldCheck size={15} /> AES-256-GCM Encrypted
            </span>
            <span className="font-mono text-[10px]">ID: {message.id.slice(0, 8)}...</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
