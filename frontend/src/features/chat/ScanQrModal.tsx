import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { apiJson, apiClient } from '../../lib/api';
import { QrCode, Camera, Check, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScanQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ScanQrModal: React.FC<ScanQrModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [manualUsername, setManualUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.warn('Camera access error:', err);
        });
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isOpen]);

  const handleResolveAndAdd = async (usernameToAdd: string) => {
    const cleanUsername = usernameToAdd.trim().replace(/^@/, '').toLowerCase();
    if (!cleanUsername) return;
    
    setIsSubmitting(true);
    try {
      // 1. Resolve user ID via backend search
      const searchRes = await apiClient(`/api/auth/search/?q=${encodeURIComponent(cleanUsername)}`);
      if (!searchRes.ok) throw new Error('Failed to resolve user');
      const users = await searchRes.json();
      
      const targetUser = users.find((u: any) => u.username?.toLowerCase() === cleanUsername) || users[0];
      if (!targetUser) {
        toast.error(`User @${cleanUsername} not found.`);
        return;
      }

      // 2. Send friend request via backend API
      const reqRes = await apiJson('/api/auth/friends/request/', {
        method: 'POST',
        body: { target_user_id: targetUser.id }
      });

      if (reqRes.ok) {
        toast.success(`Friend request sent to @${cleanUsername}!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const err = await reqRes.json().catch(() => ({}));
        toast.error(err.error || 'Could not send friend request.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Scan error. Please try manually.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Contact QR Code">
      <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
        
        {/* Camera Video Viewfinder */}
        <div className="relative w-64 h-64 bg-black rounded-2xl overflow-hidden border-2 border-[#00a884] flex items-center justify-center shadow-xl">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
          
          {/* Animated Scanner Reticle Overlay */}
          <div className="absolute inset-4 border-2 border-dashed border-[#00a884]/80 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
            <Camera size={32} className="text-[#00a884]/40" />
          </div>
        </div>

        <p className="text-xs text-[#8696a0]">Point camera at QuickChat QR Code or enter username handle below</p>

        <div className="w-full space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#8696a0]">@</span>
            <input 
              type="text" 
              placeholder="Enter username (e.g. ankit)"
              value={manualUsername}
              onChange={e => setManualUsername(e.target.value)}
              className="flex-1 bg-[#202c33] border border-[#2a3942] rounded-xl p-2.5 text-xs text-[#e9edef] focus:outline-none focus:border-[#00a884]"
            />
            <button
              onClick={() => handleResolveAndAdd(manualUsername)}
              disabled={!manualUsername || isSubmitting}
              className="px-4 py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-[#111b21] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <UserPlus size={16} /> Add
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
