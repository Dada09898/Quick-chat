import React, { useState } from 'react';
import { X, EyeOff, Lock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

interface ViewOnceMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
}

export const ViewOnceMediaModal: React.FC<ViewOnceMediaModalProps> = ({ isOpen, onClose, mediaUrl, mediaType = 'image' }) => {
  const [hasOpened, setHasOpened] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setHasOpened(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34] z-10">
          <h2 className="text-[#e9edef] text-sm font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#00a884] text-[#111b21] font-bold text-xs flex items-center justify-center">1</span>
            View Once Media
          </h2>
          <button onClick={handleClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 flex items-center justify-center overflow-hidden bg-black relative">
          {!hasOpened ? (
            mediaType === 'video' ? (
              <video src={mediaUrl} controls autoPlay className="max-w-full max-h-[70vh] rounded-lg" />
            ) : (
              <img src={mediaUrl} alt="View once media" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            )
          ) : (
            <div className="text-center space-y-3 py-16">
              <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center mx-auto text-[#8696a0]">
                <EyeOff size={24} />
              </div>
              <p className="text-sm font-medium text-[#e9edef]">Media Expired</p>
              <p className="text-xs text-[#8696a0]">This View Once media has already been opened.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-[#182229] border-t border-[#222d34] flex items-center justify-between text-xs text-[#8696a0]">
          <span className="flex items-center gap-1.5 text-[#00a884] font-medium">
            <Lock size={13} /> Protected View Once
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold rounded-full transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
