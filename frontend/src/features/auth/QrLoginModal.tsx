import React from 'react';
import { X, QrCode, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface QrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrLoginModal: React.FC<QrLoginModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <Smartphone className="text-[#00a884]" size={20} /> Device Pairing & QR Login
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="text-center py-10 px-6 space-y-3">
          <QrCode size={64} className="mx-auto text-[#8696a0] mb-1" />
          <p className="text-sm text-[#e9edef] font-medium">QR Code Login — Coming Soon</p>
          <p className="text-xs text-[#8696a0] leading-relaxed max-w-xs mx-auto">
            This feature is still being built. Please log in with your email and password for now.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
