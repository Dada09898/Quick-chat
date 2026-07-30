import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { User, Settings, Save, MapPin, Camera, Loader2 } from 'lucide-react';
import { apiClient, apiJson } from '../../lib/api';
import toast from 'react-hot-toast';
import { AISettings } from '../ai/components/AISettings';

export const ProfileSettings = () => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  
  const [bio, setBio] = useState(user?.bio || '');
  const [presence, setPresence] = useState(user?.presence_status || 'online');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiClient('/api/auth/me/avatar/', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        if (user) setUser({ ...user, avatar: data.avatar });
        toast.success('Profile picture updated');
      } else {
        toast.error('Failed to upload picture');
      }
    } catch {
      toast.error('Failed to upload picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await apiJson('/api/auth/me/', {
        method: 'PATCH',
        body: { bio, presence_status: presence }
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        toast.success('Profile updated');
      }
    } catch (e) { console.error(e); }
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-950 text-gray-200">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2"><Settings className="text-cyan-400" /> Account Settings</h2>
      
      <div className="max-w-2xl bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div onClick={handleAvatarClick} className="relative cursor-pointer group w-24 h-24">
            {user.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover rounded-full border-2 border-cyan-500/50" alt="Avatar" />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center border-2 border-cyan-500/50">
                <User size={32} className="text-cyan-500" />
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera size={20} className="text-white" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div>
            <h3 className="text-xl font-bold text-white">{user.display_name || user.username || user.email}</h3>
            <p className="text-xs text-cyan-400 font-mono">@{user.username}</p>
            <p className="text-xs text-gray-400 mt-1">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Biography</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none"
              rows={3}
              placeholder="Tell your team about yourself..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Presence</label>
              <select value={presence} onChange={e => setPresence(e.target.value as any)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-200">
                <option value="online">🟢 Online</option>
                <option value="away">🟡 Away</option>
                <option value="dnd">🔴 Do Not Disturb</option>
                <option value="offline">⚫ Offline</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Timezone</label>
              <div className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-gray-500 cursor-not-allowed flex items-center gap-2">
                <MapPin size={16}/> {user.timezone || 'UTC'}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800 flex justify-end">
          <button onClick={handleSave} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-semibold transition">
            <Save size={18}/> Save Changes
          </button>
        </div>
      </div>

      <div className="max-w-2xl mt-8">
        <AISettings />
      </div>
    </div>
  );
};
