import React, { useState, useRef } from 'react';
import { X, Camera, Edit2, Check, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { apiClient, apiJson } from '../../lib/api';
import toast from 'react-hot-toast';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({ isOpen, onClose }) => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [bio, setBio] = useState(user?.bio || 'Hey there! I am using QuickChat.');
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await apiClient('/api/auth/me/avatar/', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUser({ ...user, avatar: data.avatar });
        toast.success('Profile picture updated successfully!');
      } else {
        toast.error('Failed to upload profile picture.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error uploading image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await apiJson('/api/auth/me/', {
        method: 'PATCH',
        body: { display_name: displayName, bio }
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        toast.success('Profile details saved!');
        setIsEditingName(false);
        setIsEditingBio(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <User size={18} className="text-[#00a884]" /> Profile & Account Info
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center space-y-6">
          {/* Avatar Upload Container */}
          <div className="relative group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#00a884]/40 bg-[#202c33] flex items-center justify-center shadow-xl relative">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-[#00a884]" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow-lg group-hover:scale-110 transition">
              <Camera size={18} />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          {/* Name Field */}
          <div className="w-full space-y-1">
            <label className="text-[12px] font-semibold text-[#00a884] uppercase tracking-wider">Your Name</label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]">
              {isEditingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="bg-transparent text-sm text-[#e9edef] focus:outline-none flex-1 font-medium"
                />
              ) : (
                <span className="text-sm font-medium text-[#e9edef]">{displayName}</span>
              )}
              <button
                onClick={() => {
                  if (isEditingName) handleSaveProfile();
                  else setIsEditingName(true);
                }}
                className="text-[#8696a0] hover:text-[#00a884] p-1 transition"
              >
                {isEditingName ? <Check size={16} className="text-[#00a884]" /> : <Edit2 size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-[#8696a0] px-1">This is not your username or pin. This name will be visible to your contacts.</p>
          </div>

          {/* About Bio Field */}
          <div className="w-full space-y-1">
            <label className="text-[12px] font-semibold text-[#00a884] uppercase tracking-wider">About / Status</label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]">
              {isEditingBio ? (
                <input
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="bg-transparent text-sm text-[#e9edef] focus:outline-none flex-1 font-medium"
                />
              ) : (
                <span className="text-sm font-medium text-[#e9edef]">{bio}</span>
              )}
              <button
                onClick={() => {
                  if (isEditingBio) handleSaveProfile();
                  else setIsEditingBio(true);
                }}
                className="text-[#8696a0] hover:text-[#00a884] p-1 transition"
              >
                {isEditingBio ? <Check size={16} className="text-[#00a884]" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
