import React, { useState } from 'react';
import { X, Calendar, Clock, Send, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface ScheduledMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (text: string, sendAt: string) => void;
}

export const ScheduledMessageModal: React.FC<ScheduledMessageModalProps> = ({ isOpen, onClose, onSchedule }) => {
  const [text, setText] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');

  if (!isOpen) return null;

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !sendDate || !sendTime) {
      toast.error('Please enter message text, date, and time.');
      return;
    }

    const scheduledDateTime = `${sendDate} ${sendTime}`;
    onSchedule(text.trim(), scheduledDateTime);
    toast.success(`Message scheduled for ${scheduledDateTime}!`);
    setText('');
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
            <Clock size={18} className="text-[#00a884]" /> Schedule Message Delivery
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Message</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              placeholder="Type message to schedule..."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884] resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1 flex items-center gap-1">
                <Calendar size={13} /> Date
              </label>
              <input
                type="date"
                value={sendDate}
                onChange={e => setSendDate(e.target.value)}
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                required
              />
            </div>
            <div>
              <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1 flex items-center gap-1">
                <Clock size={13} /> Time
              </label>
              <input
                type="time"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold py-2.5 px-4 rounded-full transition shadow-md flex items-center justify-center gap-2"
            >
              <Send size={16} /> Schedule Message
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
