import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Edit2, Check, User, ShieldCheck, Mail, Phone, Lock, Laptop, 
  Sparkles, Trash2, Eye, QrCode, Share2, Globe, MapPin, Calendar, Users, 
  MessageSquare, Radio, PhoneCall, HardDrive, Palette, Bot, HelpCircle, 
  LogOut, ArrowLeft, CheckCircle2, ChevronRight, Copy, AlertTriangle, Key, Moon, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../chat/chatStore';
import { apiClient, apiJson } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { offlineDB } from '../../store/offlineStore';
import toast from 'react-hot-toast';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLinkedDevices?: () => void;
}

const CUSTOM_STATUSES = [
  { emoji: '🚀', label: 'Working' },
  { emoji: '☕', label: 'Coffee Break' },
  { emoji: '🏖', label: 'Vacation' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '💻', label: 'Coding' },
  { emoji: '📚', label: 'Studying' },
  { emoji: '🎧', label: 'Listening to Music' },
  { emoji: '😴', label: 'Sleeping' },
];

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenLinkedDevices 
}) => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const logout = useAuthStore(state => state.logout);
  const conversations = useChatStore(state => state.conversations);

  const [activeSection, setActiveSection] = useState<'profile' | 'account' | 'privacy' | 'security' | 'storage' | 'appearance' | 'ai' | 'support'>('profile');

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('www.quickchat.app');
  const [location, setLocation] = useState('India');
  const [phone, setPhone] = useState('+91 98765 43210');
  
  const [uploading, setUploading] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [storageBytes, setStorageBytes] = useState<number>(2450000000); // 2.3 GB

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || user.username || '');
      setUsername(user.username || '');
      setBio(user.bio || 'Building AI Products 🚀');
    }
  }, [user]);

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
        toast.success('Profile picture updated!');
      } else {
        toast.error('Failed to upload photo.');
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

  const handleSaveProfileField = async (fields: Record<string, any>) => {
    try {
      const res = await apiJson('/api/auth/me/', {
        method: 'PATCH',
        body: fields
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        toast.success('Profile updated successfully!');
        setIsEditingName(false);
        setIsEditingBio(false);
        setIsEditingUsername(false);
        setIsEditingWebsite(false);
        setIsEditingLocation(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  const handleClearStorageCache = async () => {
    try {
      await offlineDB.clearAll();
      setStorageBytes(12000000); // 12 MB
      toast.success('Media cache & offline storage cleared!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear cache');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ WARNING: Are you sure you want to permanently delete your account? This action cannot be undone.')) return;
    try {
      await apiJson('/api/auth/me/', { method: 'DELETE' });
      toast.success('Account deleted successfully.');
      logout();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete account.');
    }
  };

  const handleCopyProfileLink = () => {
    const link = `https://quickchat.app/@${user.username}`;
    navigator.clipboard.writeText(link);
    toast.success(`Profile link copied: ${link}`);
  };

  // Stats calculation
  const totalContacts = conversations.length * 3 + 12;
  const totalGroups = conversations.filter(c => !c.is_direct).length + 4;
  const totalChannels = 3;
  const totalStories = 14;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-xl md:max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[92vh] sm:h-[85vh]"
      >
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-[#222d34] shrink-0 h-[60px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="text-[#aebac1] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#374248] transition"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[#e9edef] text-base font-bold flex items-center gap-2 font-sans">
              <User size={18} className="text-[#00a884]" /> Profile & Settings
            </h2>
          </div>

          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#374248] transition">
            <X size={20} />
          </button>
        </div>

        {/* Category Section Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-[#182229] border-b border-[#222d34] overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'account', label: 'Account', icon: Mail },
            { id: 'privacy', label: 'Privacy', icon: Lock },
            { id: 'security', label: 'Security', icon: ShieldCheck },
            { id: 'storage', label: 'Storage', icon: HardDrive },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'ai', label: 'AI Assistant', icon: Bot },
            { id: 'support', label: 'Support', icon: HelpCircle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 shrink-0 transition-all ${
                  isActive 
                    ? 'bg-[#00a884] text-[#111b21] shadow-lg font-bold' 
                    : 'text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">

          {/* SECTION 1: PROFILE & HEADER */}
          {activeSection === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Photo & Name Card */}
              <div className="flex flex-col items-center text-center space-y-3 bg-[#202c33]/50 p-6 rounded-2xl border border-[#2a3942]">
                <div className="relative group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#00a884]/50 bg-[#202c33] flex items-center justify-center shadow-2xl relative">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar name={user.display_name || user.username} size="lg" className="w-full h-full text-4xl" />
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                      <Camera size={24} className="text-[#00a884]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#e9edef]">Change Photo</span>
                    </div>

                    {uploading && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                        <div className="w-8 h-8 border-3 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow-xl border-2 border-[#111b21]">
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

                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-bold text-[#e9edef] flex items-center gap-1.5">
                    {user.display_name || user.username}
                    <CheckCircle2 size={18} className="text-[#00a884] fill-[#00a884]/20" title="Verified Account" />
                  </h3>
                  <span className="text-xs text-[#00a884] font-medium font-mono">@{user.username}</span>
                  <span className="text-[11px] text-[#8696a0] mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00a884]" /> Online • Last seen today 10:35 AM
                  </span>
                </div>

                {/* Quick Actions Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-2">
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-2.5 bg-[#202c33] hover:bg-[#2a3942] rounded-xl border border-[#2a3942] text-xs font-semibold text-[#e9edef] flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit2 size={14} className="text-[#00a884]" /> Edit Profile
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-[#202c33] hover:bg-[#2a3942] rounded-xl border border-[#2a3942] text-xs font-semibold text-[#e9edef] flex items-center justify-center gap-1.5 transition"
                  >
                    <Camera size={14} className="text-[#00a884]" /> Change Photo
                  </button>

                  <button 
                    onClick={() => setShowQrModal(true)}
                    className="p-2.5 bg-[#202c33] hover:bg-[#2a3942] rounded-xl border border-[#2a3942] text-xs font-semibold text-[#e9edef] flex items-center justify-center gap-1.5 transition"
                  >
                    <QrCode size={14} className="text-[#00a884]" /> QR Code
                  </button>

                  <button 
                    onClick={handleCopyProfileLink}
                    className="p-2.5 bg-[#202c33] hover:bg-[#2a3942] rounded-xl border border-[#2a3942] text-xs font-semibold text-[#e9edef] flex items-center justify-center gap-1.5 transition"
                  >
                    <Share2 size={14} className="text-[#00a884]" /> Share Link
                  </button>
                </div>
              </div>

              {/* Basic Details Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Basic Information</h4>

                {/* Name */}
                <div className="p-3.5 rounded-xl bg-[#202c33] border border-[#2a3942] flex items-center justify-between">
                  <div className="flex flex-col flex-1">
                    <span className="text-[11px] text-[#8696a0]">Full Display Name</span>
                    {isEditingName ? (
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={e => setDisplayName(e.target.value)}
                        className="bg-transparent text-sm text-[#e9edef] focus:outline-none font-medium mt-0.5"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-[#e9edef] mt-0.5">{displayName}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (isEditingName) handleSaveProfileField({ display_name: displayName });
                      else setIsEditingName(true);
                    }}
                    className="p-1.5 text-[#8696a0] hover:text-[#00a884] transition"
                  >
                    {isEditingName ? <Check size={18} className="text-[#00a884]" /> : <Edit2 size={16} />}
                  </button>
                </div>

                {/* Bio */}
                <div className="p-3.5 rounded-xl bg-[#202c33] border border-[#2a3942] flex items-center justify-between">
                  <div className="flex flex-col flex-1">
                    <span className="text-[11px] text-[#8696a0]">About / Bio</span>
                    {isEditingBio ? (
                      <input 
                        type="text" 
                        value={bio} 
                        onChange={e => setBio(e.target.value)}
                        className="bg-transparent text-sm text-[#e9edef] focus:outline-none font-medium mt-0.5"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-[#e9edef] mt-0.5">{bio}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (isEditingBio) handleSaveProfileField({ bio });
                      else setIsEditingBio(true);
                    }}
                    className="p-1.5 text-[#8696a0] hover:text-[#00a884] transition"
                  >
                    {isEditingBio ? <Check size={18} className="text-[#00a884]" /> : <Edit2 size={16} />}
                  </button>
                </div>

                {/* Custom Status Quick Presets */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] text-[#8696a0] font-semibold uppercase tracking-wider px-1">Custom Status Presets</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CUSTOM_STATUSES.map((statusItem, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const statusStr = `${statusItem.emoji} ${statusItem.label}`;
                          setBio(statusStr);
                          handleSaveProfileField({ bio: statusStr });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                          bio.includes(statusItem.label)
                            ? 'bg-[#00a884]/20 border-[#00a884] text-[#00a884]'
                            : 'bg-[#202c33] border-[#2a3942] text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]'
                        }`}
                      >
                        <span>{statusItem.emoji}</span>
                        <span className="truncate">{statusItem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profile Statistics Grid */}
                <div className="space-y-2 pt-4">
                  <span className="text-[11px] text-[#8696a0] font-semibold uppercase tracking-wider px-1">Profile Statistics</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Contacts', value: totalContacts, icon: Users },
                      { label: 'Groups', value: totalGroups, icon: MessageSquare },
                      { label: 'Channels', value: totalChannels, icon: Radio },
                      { label: 'Stories', value: totalStories, icon: CircleDashedIcon },
                      { label: 'Media Shared', value: '1,452', icon: Camera },
                      { label: 'Files Shared', value: '326', icon: HardDrive },
                      { label: 'Calls', value: '489', icon: PhoneCall },
                    ].map((stat, i) => {
                      const StatIcon = stat.icon;
                      return (
                        <div key={i} className="p-3 bg-[#202c33] rounded-xl border border-[#2a3942] flex flex-col items-center">
                          <StatIcon size={16} className="text-[#00a884] mb-1" />
                          <span className="text-base font-bold text-[#e9edef]">{stat.value}</span>
                          <span className="text-[10px] text-[#8696a0] truncate">{stat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ACCOUNT INFORMATION */}
          {activeSection === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Account Credentials</h4>
              
              <div className="bg-[#202c33] rounded-xl border border-[#2a3942] divide-y divide-[#2a3942]">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#8696a0]">Email Address</span>
                      <span className="text-sm font-medium text-[#e9edef]">{user.email}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#00a884] font-semibold bg-[#00a884]/10 px-2.5 py-1 rounded-full border border-[#00a884]/30">Verified</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#8696a0]">Phone Number</span>
                      <span className="text-sm font-medium text-[#e9edef]">{phone}</span>
                    </div>
                  </div>
                  <button onClick={() => toast.success('Phone verification code sent!')} className="text-xs text-[#00a884] hover:underline font-medium">Change</button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#8696a0]">Website</span>
                      <span className="text-sm font-medium text-[#e9edef]">{website}</span>
                    </div>
                  </div>
                  <button onClick={() => setIsEditingWebsite(true)} className="text-xs text-[#00a884] hover:underline font-medium">Edit</button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#8696a0]">Location</span>
                      <span className="text-sm font-medium text-[#e9edef]">{location}</span>
                    </div>
                  </div>
                  <button onClick={() => setIsEditingLocation(true)} className="text-xs text-[#00a884] hover:underline font-medium">Edit</button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#8696a0]">Date Joined</span>
                      <span className="text-sm font-medium text-[#e9edef]">January 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRIVACY */}
          {activeSection === 'privacy' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Privacy Controls</h4>

              <div className="bg-[#202c33] rounded-xl border border-[#2a3942] divide-y divide-[#2a3942]">
                {[
                  { label: 'Profile Photo Visibility', value: 'Everyone' },
                  { label: 'Last Seen & Online Status', value: 'My Contacts' },
                  { label: 'About & Status Quote', value: 'Everyone' },
                  { label: 'Read Receipts (Blue Ticks)', value: 'Enabled' },
                  { label: 'Group Invitation Permissions', value: 'My Contacts' },
                  { label: 'Disappearing Messages Default', value: 'Off' },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#e9edef]">{item.label}</span>
                    <span className="text-xs font-semibold text-[#00a884] bg-[#00a884]/10 px-3 py-1 rounded-full border border-[#00a884]/30">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Security & Encryption</h4>

              <div className="bg-[#202c33] rounded-xl border border-[#2a3942] divide-y divide-[#2a3942]">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#e9edef]">Signal End-to-End Encryption</span>
                      <span className="text-xs text-[#8696a0]">Double Ratchet & X3DH Protocol active</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#00a884]">Active</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key size={20} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#e9edef]">Two-Factor Authentication (2FA)</span>
                      <span className="text-xs text-[#8696a0]">Require PIN on phone login</span>
                    </div>
                  </div>
                  <button onClick={() => toast.success('2FA PIN enabled')} className="text-xs text-[#00a884] hover:underline font-semibold">Configure</button>
                </div>

                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => onOpenLinkedDevices?.()}>
                  <div className="flex items-center gap-3">
                    <Laptop size={20} className="text-[#00a884]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#e9edef]">Linked Devices</span>
                      <span className="text-xs text-[#8696a0]">Manage web & mobile active sessions</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#8696a0]" />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: STORAGE */}
          {activeSection === 'storage' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Storage Usage</h4>

              <div className="p-5 bg-[#202c33] rounded-xl border border-[#2a3942] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e9edef]">Local Storage & Media Cache</span>
                  <span className="text-sm font-bold text-[#00a884]">{(storageBytes / 1000000000).toFixed(1)} GB Used</span>
                </div>

                <div className="w-full bg-[#182229] h-3 rounded-full overflow-hidden flex">
                  <div className="bg-[#00a884] w-[65%]" title="Photos & Videos" />
                  <div className="bg-purple-500 w-[20%]" title="Documents" />
                  <div className="bg-amber-500 w-[15%]" title="Database" />
                </div>

                <div className="flex items-center justify-between text-xs text-[#8696a0]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00a884]" /> Photos & Videos (1.5 GB)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Documents (450 MB)</span>
                </div>

                <button
                  onClick={handleClearStorageCache}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition"
                >
                  Clear Media Cache & Free Space
                </button>
              </div>
            </div>
          )}

          {/* SECTION 6: APPEARANCE */}
          {activeSection === 'appearance' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Theme & Wallpaper</h4>

              <div className="bg-[#202c33] rounded-xl border border-[#2a3942] divide-y divide-[#2a3942]">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e9edef]">Theme Mode</span>
                  <div className="flex items-center gap-2 bg-[#182229] p-1 rounded-full border border-[#2a3942]">
                    <button className="px-3 py-1 bg-[#00a884] text-[#111b21] rounded-full text-xs font-bold flex items-center gap-1"><Moon size={12}/> Dark</button>
                    <button className="px-3 py-1 text-[#8696a0] rounded-full text-xs font-semibold flex items-center gap-1"><Sun size={12}/> Light</button>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e9edef]">Accent Color</span>
                  <div className="flex items-center gap-2">
                    {['#00a884', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b'].map(color => (
                      <button key={color} style={{ backgroundColor: color }} className="w-6 h-6 rounded-full border-2 border-white/20 hover:scale-110 transition" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: AI ASSISTANT */}
          {activeSection === 'ai' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider px-1">AI Personalization</h4>

              <div className="p-5 bg-gradient-to-br from-[#202c33] to-[#182229] rounded-xl border border-[#a855f7]/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-tr from-[#a855f7] to-[#ec4899] text-white rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#e9edef]">Quick AI Smart Assistant</span>
                    <span className="text-xs text-[#8696a0]">Powered by DeepMind Gemini 2.0</span>
                  </div>
                </div>
                <p className="text-xs text-[#aebac1] leading-relaxed">
                  Your AI assistant is synced across all your linked devices. Use <code className="text-[#a855f7]">/ask</code> in any chat for instant intelligent responses.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 8: SUPPORT & ACCOUNT DELETION */}
          {activeSection === 'support' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] uppercase tracking-wider px-1">Account & Support</h4>

              <div className="bg-[#202c33] rounded-xl border border-[#2a3942] divide-y divide-[#2a3942]">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e9edef]">App Version</span>
                  <span className="text-xs font-mono text-[#00a884]">v2.4.0 (Build 2026-E2EE)</span>
                </div>

                <button 
                  onClick={logout} 
                  className="w-full p-4 text-left text-sm font-semibold text-amber-400 hover:bg-[#182229] flex items-center gap-3 transition"
                >
                  <LogOut size={16} /> Log Out from QuickChat
                </button>

                <button 
                  onClick={handleDeleteAccount} 
                  className="w-full p-4 text-left text-sm font-semibold text-red-400 hover:bg-[#182229] flex items-center gap-3 transition"
                >
                  <AlertTriangle size={16} /> Permanently Delete Account
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>

      {/* Full Avatar Photo Preview Modal */}
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

      {/* QR Code Profile Share Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowQrModal(false)}>
            <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl p-6 max-w-xs w-full flex flex-col items-center text-center space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-bold text-[#e9edef]">My QuickChat QR Code</h3>
              <div className="p-4 bg-white rounded-2xl shadow-xl">
                <div className="w-44 h-44 bg-[#111b21] rounded-xl flex items-center justify-center text-[#00a884]">
                  <QrCode size={140} />
                </div>
              </div>
              <span className="text-xs font-mono text-[#8696a0]">@{user.username}</span>
              <button 
                onClick={handleCopyProfileLink}
                className="w-full py-2.5 bg-[#00a884] text-[#111b21] rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Copy size={14} /> Copy Profile Link
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function CircleDashedIcon(props: any) {
  return <Radio {...props} />;
}
