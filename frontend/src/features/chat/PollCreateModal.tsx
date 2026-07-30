import React, { useState } from 'react';
import { X, BarChart2, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import toast from 'react-hot-toast';

interface PollCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PollCreateModal: React.FC<PollCreateModalProps> = ({ isOpen, onClose }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const user = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions(prev => [...prev, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptions(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Poll question is required');
      return;
    }
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      toast.error('Add at least 2 options');
      return;
    }

    if (!activeConversationId || !user) return;

    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const pollData = {
      type: 'poll',
      question: question.trim(),
      options: validOptions.map(opt => ({ text: opt, votes: [] }))
    };

    const text = `📊 POLL: ${question.trim()}\n` + validOptions.map((o, i) => `${i + 1}. ${o}`).join('\n');
    const ciphertext = btoa(unescape(encodeURIComponent(JSON.stringify(pollData))));

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

    toast.success('Poll created!');
    setQuestion('');
    setOptions(['', '']);
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
            <BarChart2 size={18} className="text-[#00a884]" /> Create a Poll
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreatePoll} className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Question</label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884]"
              required
            />
          </div>

          <div className="space-y-2.5">
            <label className="block text-[#8696a0] text-xs font-medium uppercase">Options</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884]"
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-[#8696a0] hover:text-red-400 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 6 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-[#00a884] hover:underline text-xs font-medium flex items-center gap-1.5 pt-1"
            >
              <Plus size={16} /> Add Option
            </button>
          )}

          <div className="pt-3">
            <button
              type="submit"
              className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold py-2.5 px-4 rounded-full transition"
            >
              Create Poll
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
