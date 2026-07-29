import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Clock } from 'lucide-react';
import { useStatusStore } from './statusStore';
import { Avatar } from '../../components/ui/Avatar';

export const StatusViewersModal: React.FC = () => {
  const { viewersModalStatusId, setViewersModalStatusId, myStatuses } = useStatusStore();

  if (!viewersModalStatusId) return null;

  const targetStatus = myStatuses.find(s => s.id === viewersModalStatusId);
  const views = targetStatus?.views || [];

  const formatViewTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="w-full max-w-md bg-[#202c33] rounded-t-2xl sm:rounded-2xl overflow-hidden border border-[#222d34] shadow-2xl flex flex-col max-h-[80vh] text-[#e9edef]"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#222d34] flex items-center justify-between bg-[#111b21]">
            <div className="flex items-center gap-2">
              <Eye className="text-[#00a884]" size={20} />
              <h3 className="text-base font-semibold">Viewed by {views.length}</h3>
            </div>
            <button onClick={() => setViewersModalStatusId(null)} className="text-[#8696a0] hover:text-white p-1">
              <X size={20} />
            </button>
          </div>

          {/* Viewers List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#222d34] custom-scrollbar">
            {views.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-sm flex flex-col items-center gap-2">
                <Eye size={32} className="opacity-40" />
                <span>No views yet</span>
                <span className="text-xs text-[#8696a0]/70">Views will appear here when contacts view your status.</span>
              </div>
            ) : (
              views.map((viewer) => (
                <div key={viewer.userId + viewer.viewedAt} className="p-3 flex items-center justify-between hover:bg-[#2a3942] rounded-xl transition">
                  <div className="flex items-center gap-3">
                    <Avatar name={viewer.userName} url={viewer.userAvatar} size="md" />
                    <span className="font-medium text-sm text-[#e9edef]">{viewer.userName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#8696a0]">
                    <Clock size={12} />
                    <span>{formatViewTime(viewer.viewedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
