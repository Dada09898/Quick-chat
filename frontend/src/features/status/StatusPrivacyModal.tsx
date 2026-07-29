import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Check, Users, UserX, UserCheck } from 'lucide-react';
import { useStatusStore, type StatusPrivacySetting } from './statusStore';
import toast from 'react-hot-toast';

export const StatusPrivacyModal: React.FC = () => {
  const { isPrivacyModalOpen, setPrivacyModalOpen, statusPrivacy, setStatusPrivacy } = useStatusStore();
  const [selectedPrivacy, setSelectedPrivacy] = useState<StatusPrivacySetting>(statusPrivacy);

  if (!isPrivacyModalOpen) return null;

  const handleSave = () => {
    setStatusPrivacy(selectedPrivacy);
    toast.success('Status privacy updated');
    setPrivacyModalOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-[#202c33] rounded-2xl overflow-hidden border border-[#222d34] shadow-2xl flex flex-col text-[#e9edef]"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#222d34] flex items-center justify-between bg-[#111b21]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#00a884]" size={22} />
              <h3 className="text-lg font-semibold">Status Privacy</h3>
            </div>
            <button onClick={() => setPrivacyModalOpen(false)} className="text-[#8696a0] hover:text-white p-1">
              <X size={22} />
            </button>
          </div>

          {/* Subtitle */}
          <div className="p-4 bg-[#111b21]/50 border-b border-[#222d34] text-xs text-[#8696a0] leading-relaxed">
            Who can see your status updates. Changes will apply to new status updates only.
          </div>

          {/* Options */}
          <div className="p-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSelectedPrivacy('contacts')}
              className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                selectedPrivacy === 'contacts'
                  ? 'bg-[#00a884]/10 border-[#00a884] text-[#00a884]'
                  : 'bg-[#111b21] border-[#222d34] text-[#e9edef] hover:bg-[#2a3942]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={20} />
                <div className="flex flex-col text-left">
                  <span className="font-medium text-sm text-[#e9edef]">My contacts</span>
                  <span className="text-xs text-[#8696a0]">Share status with all your contacts</span>
                </div>
              </div>
              {selectedPrivacy === 'contacts' && <Check size={20} />}
            </button>

            <button
              type="button"
              onClick={() => setSelectedPrivacy('except')}
              className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                selectedPrivacy === 'except'
                  ? 'bg-[#00a884]/10 border-[#00a884] text-[#00a884]'
                  : 'bg-[#111b21] border-[#222d34] text-[#e9edef] hover:bg-[#2a3942]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserX size={20} />
                <div className="flex flex-col text-left">
                  <span className="font-medium text-sm text-[#e9edef]">My contacts except...</span>
                  <span className="text-xs text-[#8696a0]">Hide status from specific contacts</span>
                </div>
              </div>
              {selectedPrivacy === 'except' && <Check size={20} />}
            </button>

            <button
              type="button"
              onClick={() => setSelectedPrivacy('only')}
              className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                selectedPrivacy === 'only'
                  ? 'bg-[#00a884]/10 border-[#00a884] text-[#00a884]'
                  : 'bg-[#111b21] border-[#222d34] text-[#e9edef] hover:bg-[#2a3942]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck size={20} />
                <div className="flex flex-col text-left">
                  <span className="font-medium text-sm text-[#e9edef]">Only share with...</span>
                  <span className="text-xs text-[#8696a0]">Share status with selected contacts only</span>
                </div>
              </div>
              {selectedPrivacy === 'only' && <Check size={20} />}
            </button>
          </div>

          {/* Footer Save */}
          <div className="p-4 border-t border-[#222d34] flex justify-end bg-[#111b21]">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-semibold rounded-full transition shadow-md"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
