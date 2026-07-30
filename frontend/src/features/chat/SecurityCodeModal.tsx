import React, { useState } from 'react';
import { X, ShieldCheck, QrCode, Camera, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface SecurityCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const SecurityCodeModal: React.FC<SecurityCodeModalProps> = ({ isOpen, onClose, userName }) => {
  const [isVerified, setIsVerified] = useState(false);

  if (!isOpen) return null;

  // Mock 60-digit safety number matching Signal/WhatsApp X3DH format
  const securityCode = "48209 19384 02847 10492 84920 10294 85930 18492 01948 20491 84920 10492";

  const handleVerify = () => {
    setIsVerified(true);
    toast.success(`Security code verified with ${userName}!`);
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
          <h2 className="text-[#e9edef] text-sm font-semibold flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#00a884]" /> Verify Security Code
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          <p className="text-xs text-[#8696a0] leading-relaxed">
            Messages and calls with <strong className="text-[#e9edef]">{userName}</strong> are encrypted end-to-end. Compare these numbers or scan the QR code to verify.
          </p>

          {/* QR Code Mock Graphic */}
          <div className="w-44 h-44 bg-white p-3 rounded-2xl mx-auto border-4 border-[#00a884]/30 shadow-lg flex flex-col items-center justify-center relative">
            <QrCode size={130} className="text-[#111b21]" />
            {isVerified && (
              <div className="absolute inset-0 bg-[#00a884]/95 rounded-xl flex flex-col items-center justify-center text-white">
                <CheckCircle2 size={44} />
                <span className="text-xs font-bold mt-2 uppercase tracking-wider">Code Verified</span>
              </div>
            )}
          </div>

          {/* 60-Digit Security Code Display */}
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3.5 font-mono text-xs text-[#e9edef] tracking-widest leading-relaxed">
            {securityCode}
          </div>

          {!isVerified ? (
            <button
              onClick={handleVerify}
              className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-xs rounded-full transition shadow-md flex items-center justify-center gap-2"
            >
              <Camera size={16} /> Scan & Mark Verified
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#00a884] bg-[#00a884]/15 py-2.5 rounded-full border border-[#00a884]/30">
              <CheckCircle2 size={16} /> Verified Security Number
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
