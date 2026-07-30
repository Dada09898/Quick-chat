import React, { useState } from 'react';
import { X, MapPin, Navigation, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import toast from 'react-hot-toast';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({ isOpen, onClose }) => {
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const activeConversationId = useChatStore(state => state.activeConversationId);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const user = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();

  if (!isOpen) return null;

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocationName(`Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        toast.success('Location captured!');
      },
      (err) => {
        setIsLocating(false);
        toast.error('Could not fetch location. Please type location name manually.');
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleShareLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() && !coords) {
      toast.error('Enter a location name or use GPS');
      return;
    }

    if (!activeConversationId || !user) return;

    const msgId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const mapUrl = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : '';
    const text = `📍 LOCATION: ${locationName.trim()}\n${mapUrl}`;
    const ciphertext = btoa(unescape(encodeURIComponent(text)));

    const newMsg = {
      id: msgId,
      conversation_id: activeConversationId,
      sender_id: user.id,
      ciphertext,
      nonce: 'pending',
      signature: 'UNVERIFIED',
      key_version: 1,
      algorithm: 'AES-256-GCM',
      created_at: createdAt,
      is_edited: false,
      deleted_at: null,
      status: 'queued' as const,
      decrypted_text: text
    };

    enqueueMessage(newMsg);
    sendEvent('message.send', {
      id: msgId,
      conversation_id: activeConversationId,
      ciphertext,
      nonce: 'pending',
      signature: 'UNVERIFIED',
      key_version: 1,
      algorithm: 'AES-256-GCM',
      created_at: createdAt
    });

    toast.success('Location shared!');
    setLocationName('');
    setCoords(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <MapPin size={18} className="text-[#00a884]" /> Share Location
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleShareLocation} className="p-5 space-y-4">
          <button
            type="button"
            onClick={handleGetGps}
            disabled={isLocating}
            className="w-full py-3 bg-[#00a884]/20 hover:bg-[#00a884]/30 text-[#00a884] border border-[#00a884]/40 font-medium text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <Navigation size={16} className={isLocating ? 'animate-spin' : ''} />
            {isLocating ? 'Capturing GPS Location...' : 'Use Current GPS Location'}
          </button>

          <div>
            <label className="block text-[#8696a0] text-xs font-medium uppercase mb-1">Location / Address Name</label>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              placeholder="e.g. Connaught Place, New Delhi"
              className="w-full bg-[#202c33] border border-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
              required
            />
          </div>

          {coords && (
            <div className="p-3 bg-[#202c33] rounded-xl border border-[#2a3942] text-xs text-[#8696a0] space-y-1">
              <p className="font-medium text-[#00a884] flex items-center gap-1">
                <MapPin size={14} /> Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
              </p>
              <a
                href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#53bdeb] hover:underline flex items-center gap-1 pt-1"
              >
                Open in Google Maps <ExternalLink size={12} />
              </a>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold py-2.5 px-4 rounded-full transition shadow-md"
            >
              Share Location
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
