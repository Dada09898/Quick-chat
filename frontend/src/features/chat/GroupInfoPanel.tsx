import React, { useState } from 'react';
import { X, Users, UserPlus, Shield, UserMinus, LogOut, Trash2, Edit3, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/api';
import toast from 'react-hot-toast';

interface GroupInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({ isOpen, onClose }) => {
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const conversations = useChatStore(state => state.conversations);
  const currentUser = useAuthStore(state => state.user);
  const setConversations = useChatStore(state => state.setConversations);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);

  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminOnlyMessages, setIsAdminOnlyMessages] = useState(false);

  const conversation = conversations.find(c => c.id === activeConversationId);
  if (!isOpen || !conversation || conversation.is_direct) return null;

  const members = conversation.members || [];
  const currentMember = members.find((m: any) => m.user?.id === currentUser?.id || m.user_id === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin' || currentMember?.role === 'owner';

  const handleSaveInfo = async () => {
    if (!groupName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient(`/api/chat/conversations/${conversation.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), description: description.trim() })
      });
      if (res.ok) {
        toast.success('Group info updated');
        const listRes = await apiClient('/api/chat/conversations/');
        if (listRes.ok) setConversations(await listRes.json());
        setIsEditing(false);
      }
    } catch (err) {
      toast.error('Failed to update group info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await apiClient(`/api/chat/conversations/${conversation.id}/leave/`, { method: 'POST' });
      if (res.ok) {
        toast.success('Left group');
        setActiveConversation(null);
        onClose();
      }
    } catch (err) {
      toast.error('Failed to leave group');
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="fixed inset-0 z-40 bg-[#111b21] flex flex-col xl:static xl:w-[360px] xl:border-l xl:border-[#222d34]"
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#202c33] border-b border-[#222d34] shrink-0">
        <button onClick={onClose} className="text-[#aebac1] hover:text-[#d1d7db] p-1" aria-label="Close group info">
          <X size={24} />
        </button>
        <h2 className="text-[#e9edef] font-medium text-base">Group Info</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center space-y-3 pt-4">
          <div className="w-24 h-24 rounded-full bg-[#00a884]/20 border-2 border-[#00a884] flex items-center justify-center text-[#00a884] text-3xl font-bold">
            {(conversation.name || 'G')[0].toUpperCase()}
          </div>

          {!isEditing ? (
            <div>
              <div className="flex items-center gap-2 justify-center">
                <h3 className="text-[#e9edef] text-xl font-semibold">{conversation.name || 'Group'}</h3>
                {isAdmin && (
                  <button onClick={() => { setGroupName(conversation.name || ''); setDescription(conversation.description || ''); setIsEditing(true); }} className="text-[#8696a0] hover:text-[#d1d7db] p-1">
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
              <p className="text-[#8696a0] text-sm mt-1">{conversation.description || 'No description'}</p>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full bg-[#202c33] border border-[#222d34] rounded-lg px-3 py-2 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884]"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-[#202c33] border border-[#222d34] rounded-lg px-3 py-2 text-[#e9edef] text-sm focus:outline-none focus:border-[#00a884] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs text-[#8696a0] hover:text-[#d1d7db]">Cancel</button>
                <button onClick={handleSaveInfo} disabled={isSubmitting} className="px-3 py-1 text-xs bg-[#00a884] text-[#111b21] rounded-lg font-medium">Save</button>
              </div>
            </div>
          )}
        </div>

        {/* Member List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[#8696a0] text-xs font-semibold uppercase tracking-wider">
              Members ({members.length})
            </h4>
          </div>

          <div className="space-y-2">
            {members.map((member: any, idx: number) => {
              const u = member.user || member;
              const name = u.display_name || u.username || u.email || 'Member';
              const memberIsAdmin = member.role === 'admin' || member.role === 'owner';
              return (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-[#e9edef] text-xs font-semibold">
                      {name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[#e9edef] text-sm font-medium flex items-center gap-1.5">
                        {name}
                        {u.id === currentUser?.id && <span className="text-[10px] text-[#00a884] bg-[#00a884]/15 px-1.5 py-0.5 rounded">(You)</span>}
                      </p>
                      <p className="text-[#8696a0] text-xs">{u.email}</p>
                    </div>
                  </div>
                  {memberIsAdmin && (
                    <span className="text-[11px] text-[#00a884] bg-[#00a884]/20 border border-[#00a884]/30 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                      <Shield size={12} /> Admin
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Group Permissions */}
        {isAdmin && (
          <section className="pt-2 border-t border-[#222d34] space-y-3">
            <h4 className="text-[#8696a0] text-xs font-semibold uppercase tracking-wider">Group Settings</h4>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]">
              <div>
                <h5 className="text-sm font-medium text-[#e9edef]">Send Messages</h5>
                <p className="text-xs text-[#8696a0]">
                  {isAdminOnlyMessages ? 'Only Admins' : 'All Members'}
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !isAdminOnlyMessages;
                  setIsAdminOnlyMessages(next);
                  toast.success(next ? 'Set group mode to Only Admins Can Send Messages' : 'All members can send messages');
                }}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  isAdminOnlyMessages ? 'bg-[#00a884]' : 'bg-[#374248]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isAdminOnlyMessages ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="pt-2 border-t border-[#222d34] space-y-2">
          <button
            onClick={() => {
              const inviteLink = `${window.location.origin}/join/${conversation.id}`;
              navigator.clipboard.writeText(inviteLink);
              toast.success('Group invite link copied to clipboard!');
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#00a884]/15 text-[#00a884] hover:bg-[#00a884]/25 transition-colors text-sm font-medium border border-[#00a884]/30"
          >
            <UserPlus size={18} /> Invite to Group via Link
          </button>

          <button
            onClick={handleLeaveGroup}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#f15c6d]/10 text-[#f15c6d] hover:bg-[#f15c6d]/20 transition-colors text-sm font-medium"
          >
            <LogOut size={18} /> Leave Group
          </button>
        </section>
      </div>
    </motion.div>
  );
};
