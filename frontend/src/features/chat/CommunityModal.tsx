import React, { useState } from 'react';
import { X, Users, Megaphone, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import toast from 'react-hot-toast';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({ isOpen, onClose }) => {
  const [communityName, setCommunityName] = useState('');
  const [description, setDescription] = useState('');
  const [subGroups, setSubGroups] = useState(['General Updates', 'Announcements']);

  if (!isOpen) return null;

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim()) return;

    try {
      const { apiJson } = await import('../../lib/api');
      const res = await apiJson('/api/chat/communities/', {
        method: 'POST',
        body: {
          name: communityName.trim(),
          description: description.trim(),
          sub_groups: subGroups
        }
      });

      if (res.ok) {
        toast.success(`Community "${communityName.trim()}" created successfully!`);
        setCommunityName('');
        setDescription('');
        // Refresh conversations in chat store
        const { apiClient } = await import('../../lib/api');
        const convRes = await apiClient('/api/chat/conversations/');
        if (convRes.ok) {
          const convData = await convRes.json();
          useChatStore.getState().setConversations(convData.results || []);
        }
      } else {
        toast.error('Failed to create community.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error creating community.');
    } finally {
      onClose();
    }
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
            <Users size={18} className="text-[#00a884]" /> Create a Community
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreateCommunity} className="p-5 space-y-4">
          <p className="text-xs text-[#8696a0] leading-relaxed">
            Communities bring members together in topic-based groups, and make it easy to send community-wide announcements.
          </p>

          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Community Name</label>
            <input
              type="text"
              value={communityName}
              onChange={e => setCommunityName(e.target.value)}
              placeholder="e.g. Kryozen Developers Network"
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
              required
            />
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this community about?"
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[#8696a0] text-xs font-medium uppercase">Included Groups</label>
            {subGroups.map((grp, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#202c33] border border-[#2a3942]">
                <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center">
                  <Megaphone size={16} />
                </div>
                <span className="text-sm text-[#e9edef] font-medium">{grp}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold py-2.5 px-4 rounded-full transition shadow-md flex items-center justify-center gap-1.5"
            >
              Create Community <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
