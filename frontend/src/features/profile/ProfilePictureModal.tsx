import React, { useState, useRef } from 'react';
import { X, Camera, Edit2, Check, User, ShieldCheck, Mail, Phone, Lock, Laptop, Sparkles, Trash2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { apiClient, apiJson } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import toast from 'react-hot-toast';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLinkedDevices?: () => void;
}

const STATUS_PRESETS = [
  'Available',
  'Busy',
  'At school',
  'At the movies',
  'At work',
  'Battery about to die',
  'In a meeting',
  'Urgent calls only',
  'Sleeping',
  'Hey there! I am using QuickChat.'
];

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenLinkedDevices 
}) => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [bio, setBio] = useState(user?.bio || 'Hey there! I am using QuickChat.');
  const [uploading, setUploading] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  
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

  const handleRemoveAvatar = async () => {
    try {
      const res = await apiJson('/api/auth/me/', {
        method: 'PATCH',
        body: { avatar: null }
      });
      if (res.ok) {
        setUser({ ...user, avatar: undefined });
        toast.success('Profile picture removed');
      }
    } catch (err) {
      console.error(err);
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
      toast.error('Failed to save profile');
    }
  };

  const handleSelectPreset = async (presetText: string) => {
    setBio(presetText);
    try {
      const res = await apiJson('/api/auth/me/', {
        method: 'PATCH',
        body: { bio: presetText }
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        toast.success('Status quote updated!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34] shrink-0">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <User size={18} className="text-[#00a884]" /> Profile & Account Settings
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#374248] transition">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 flex flex-col items-center space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Avatar Profile Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[#00a884]/40 bg-[#202c33] flex items-center justify-center shadow-2xl relative">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Avatar name={user.display_name || user.username} size="lg" className="w-full h-full text-4xl" />
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                  <Camera size={24} className="text-[#00a884]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#e9edef]">Change Photo</span>
                </div>

                {uploading && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-3 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Badge Icon */}
              <div 
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow-xl group-hover:scale-110 transition border-2 border-[#111b21]"
                title="Upload Profile Picture"
              >
                <Camera size={20} />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </div>

            {/* Photo Quick Actions */}
            <div className="flex items-center gap-3 text-xs text-[#8696a0]">
              {user.avatar && (
                <>
                  <button
                    onClick={() => setShowFullPhoto(true)}
                    className="flex items-center gap-1 hover:text-[#00a884] transition"
                  >
                    <Eye size={14} /> View Photo
                  </button>
                  <span>•</span>
                  <button
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} /> Remove Photo
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div className="w-full space-y-1.5">
            <label className="text-[12px] font-semibold text-[#00a884] uppercase tracking-wider">Your Name</label>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#202c33] border border-[#2a3942] focus-within:border-[#00a884] transition">
              {isEditingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={25}
                  autoFocus
                  className="bg-transparent text-sm text-[#e9edef] focus:outline-none flex-1 font-medium"
                />
              ) : (
                <span className="text-sm font-medium text-[#e9edef] truncate">{displayName}</span>
              )}
              <button
                onClick={() => {
                  if (isEditingName) handleSaveProfile();
                  else setIsEditingName(true);
                }}
                className="text-[#8696a0] hover:text-[#00a884] p-1 transition ml-2 shrink-0"
                title={isEditingName ? "Save Name" : "Edit Name"}
              >
                {isEditingName ? <Check size={18} className="text-[#00a884]" /> : <Edit2 size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-[#8696a0] leading-relaxed px-1">
              This is not your username or PIN. This name will be visible to your WhatsApp contacts.
            </p>
          </div>

          {/* About / Status Quote Field */}
          <div className="w-full space-y-1.5">
            <label className="text-[12px] font-semibold text-[#00a884] uppercase tracking-wider">About / Status Quote</label>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#202c33] border border-[#2a3942] focus-within:border-[#00a884] transition">
              {isEditingBio ? (
                <input
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={120}
                  autoFocus
                  className="bg-transparent text-sm text-[#e9edef] focus:outline-none flex-1 font-medium"
                />
              ) : (
                <span className="text-sm font-medium text-[#e9edef] leading-snug">{bio}</span>
              )}
              <button
                onClick={() => {
                  if (isEditingBio) handleSaveProfile();
                  else setIsEditingBio(true);
                }}
                className="text-[#8696a0] hover:text-[#00a884] p-1 transition ml-2 shrink-0"
                title={isEditingBio ? "Save Status" : "Edit Status"}
              >
                {isEditingBio ? <Check size={18} className="text-[#00a884]" /> : <Edit2 size={18} />}
              </button>
            </div>

            {/* Presets List */}
            <div className="pt-2">
              <span className="text-[11px] text-[#8696a0] font-semibold uppercase tracking-wider px-1">Select Status Preset</span>
              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto custom-scrollbar border border-[#2a3942] rounded-xl p-1 bg-[#182229]">
                {STATUS_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition flex items-center justify-between ${
                      bio === preset ? 'bg-[#00a884]/20 text-[#00a884] font-semibold' : 'text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef]'
                    }`}
                  >
                    <span>{preset}</span>
                    {bio === preset && <Check size={14} className="text-[#00a884]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Account Info Details Card */}
          <div className="w-full space-y-2 pt-2 border-t border-[#222d34]">
            <label className="text-[12px] font-semibold text-[#00a884] uppercase tracking-wider">Account Credentials</label>
            
            <div className="bg-[#202c33] rounded-xl border border-[#2a3942] divide-y divide-[#2a3942] text-xs">
              <div className="p-3 flex items-center justify-between">
                <span className="text-[#8696a0] flex items-center gap-2">
                  <User size={14} className="text-[#00a884]" /> Username
                </span>
                <span className="text-[#e9edef] font-mono font-medium">@{user.username}</span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-[#8696a0] flex items-center gap-2">
                  <Mail size={14} className="text-[#00a884]" /> Email Address
                </span>
                <span className="text-[#e9edef] font-medium">{user.email}</span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-[#8696a0] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#00a884]" /> Security
                </span>
                <span className="text-[#00a884] font-medium flex items-center gap-1">
                  <Lock size={12} /> E2EE Verified
                </span>
              </div>
            </div>
          </div>

          {/* Linked Devices Action Shortcut */}
          {onOpenLinkedDevices && (
            <button
              onClick={() => {
                onClose();
                onOpenLinkedDevices();
              }}
              className="w-full py-3 bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] rounded-xl text-xs font-semibold text-[#00a884] flex items-center justify-center gap-2 transition"
            >
              <Laptop size={16} /> Manage Linked Devices & QR Sessions
            </button>
          )}

        </div>
      </motion.div>

      {/* Full Photo Modal Preview */}
      <AnimatePresence>
        {showFullPhoto && user.avatar && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowFullPhoto(false)}>
            <div className="relative max-w-md w-full flex flex-col items-center">
              <button 
                onClick={() => setShowFullPhoto(false)}
                className="absolute -top-10 right-0 text-white p-2"
              >
                <X size={24} />
              </button>
              <img src={user.avatar} alt="Profile Full" className="w-full h-auto max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-[#2a3942]" />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
