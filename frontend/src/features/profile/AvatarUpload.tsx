import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export const AvatarUpload: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (user) {
          setUser({ ...user, avatar: data.avatar });
        }
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      className="relative w-20 h-20 rounded-full cursor-pointer group"
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-10">
        <Camera size={24} />
        <span className="text-[10px] mt-1 text-center font-medium leading-tight">CHANGE<br/>PHOTO</span>
      </div>

      {uploading && (
        <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center z-20">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
    </div>
  );
};
