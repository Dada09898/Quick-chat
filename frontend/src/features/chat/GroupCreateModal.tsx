import React, { useState } from 'react';
import { X, Users, Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import { apiClient } from '../../lib/api';
import toast from 'react-hot-toast';

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const setConversations = useChatStore(state => state.setConversations);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);

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
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Select at least one member');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient('/api/chat/conversations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_direct: false,
          name: groupName.trim(),
          description: description.trim(),
          member_ids: selectedUserIds
        })
      });

      if (res.ok) {
        const newGroup = await res.json();
        toast.success('Group created successfully!');
        const listRes = await apiClient('/api/chat/conversations/');
        if (listRes.ok) {
          const listData = await listRes.json();
          setConversations(listData.results || listData);
        }
        setActiveConversation(newGroup.id);
        onClose();
        setGroupName('');
        setDescription('');
        setSelectedUserIds([]);
      } else {
        const errData = await res.json();
        toast.error(errData.detail || errData.error || 'Failed to create group');
      }
    } catch (err) {
      toast.error('Network error creating group');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Create New Group"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-[#00a884]" /> Create New Group
          </h2>
          <button
            onClick={onClose}
            className="text-[#aebac1] hover:text-[#d1d7db] p-2 rounded-lg hover:bg-[#374248] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Group Name *</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Project Alpha Team"
              className="w-full bg-[#111b21] border border-[#222d34] rounded-lg px-3 py-2 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884]"
              required
            />
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Group topic or rules..."
              rows={2}
              className="w-full bg-[#111b21] border border-[#222d34] rounded-lg px-3 py-2 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884] resize-none"
            />
          </div>

          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Add Members ({selectedUserIds.length})</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full bg-[#111b21] border border-[#222d34] rounded-lg pl-9 pr-3 py-2 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {isSearching ? (
              <div className="text-center py-4 text-[#8696a0] text-xs">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#00a884]/20 border border-[#00a884]/30' : 'hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-[#e9edef] text-xs font-semibold">
                        {(user.display_name || user.username || user.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[#e9edef] text-sm font-medium">{user.display_name || user.username || 'User'}</p>
                        <p className="text-[#8696a0] text-xs">{user.email}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                      isSelected ? 'bg-[#00a884] border-[#00a884] text-[#111b21]' : 'border-[#8696a0]'
                    }`}>
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                );
              })
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-4 text-[#8696a0] text-xs">No users found</div>
            ) : null}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
              className="w-full bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 text-[#111b21] font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? 'Creating Group...' : `Create Group (${selectedUserIds.length} members)`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
