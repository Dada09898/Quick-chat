import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { User, Settings, Save, MapPin, Globe, Moon } from 'lucide-react';
import { apiJson } from '../../lib/api';

export const ProfileSettings = () => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  
  const [bio, setBio] = useState(user?.bio || '');
  const [presence, setPresence] = useState(user?.presence_status || 'online');
  
  const handleSave = async () => {
    try {
      const res = await apiJson('/api/auth/me/', {
        method: 'PATCH',
        body: { bio, presence_status: presence }
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        alert('Profile updated');
      }
    } catch (e) { console.error(e); }
  };

  if (!user) return null;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-950 text-gray-200">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2"><Settings className="text-cyan-400" /> Account Settings</h2>
      
      <div className="max-w-2xl bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-2 border-cyan-500/50">
            {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full" alt="Avatar"/> : <User size={32} className="text-cyan-500"/>}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{user.email}</h3>
            <p className="text-sm text-gray-400">Enterprise User ID: {user.id}</p>
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
    </div>
  );
};
