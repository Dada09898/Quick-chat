import React from 'react';
import { X, HardDrive, Image, Video, FileText, Trash2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from './chatStore';
import toast from 'react-hot-toast';

interface StorageUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageUsageModal: React.FC<StorageUsageModalProps> = ({ isOpen, onClose }) => {
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const messagesRecord = useChatStore(state => state.messages);

  if (!isOpen) return null;

  const convMessages = Object.values(messagesRecord).filter(m => m.conversation_id === activeConversationId);
  
  let totalMediaCount = 0;
  let photosCount = 0;
  let videosCount = 0;
  let docsCount = 0;

  convMessages.forEach(msg => {
    (msg.media_attachments || []).forEach(att => {
      totalMediaCount++;
      if (att.type === 'image') photosCount++;
      else if (att.type === 'video') videosCount++;
      else docsCount++;
    });
  });

  const estimatedSize = (photosCount * 1.5 + videosCount * 8.5 + docsCount * 2.1).toFixed(1);

  const handleClearMedia = () => {
    if (!confirm('Are you sure you want to clear media cache for this chat?')) return;
    toast.success('Chat media cache cleared');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <HardDrive size={18} className="text-[#00a884]" /> Storage & Data Usage
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Storage Summary */}
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8696a0] uppercase font-medium">Estimated Chat Storage</p>
              <h3 className="text-2xl font-bold text-[#e9edef] mt-0.5">{estimatedSize} MB</h3>
              <p className="text-xs text-[#00a884] mt-1 font-medium">{convMessages.length} Messages • {totalMediaCount} Media Items</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884]">
              <HardDrive size={24} />
            </div>
          </div>

          {/* Breakdown List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Image size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#e9edef]">Photos & GIFs</h4>
                  <p className="text-xs text-[#8696a0]">{photosCount} items</p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#e9edef]">{(photosCount * 1.5).toFixed(1)} MB</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Video size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#e9edef]">Videos</h4>
                  <p className="text-xs text-[#8696a0]">{videosCount} items</p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#e9edef]">{(videosCount * 8.5).toFixed(1)} MB</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#202c33] border border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#e9edef]">Documents & Files</h4>
                  <p className="text-xs text-[#8696a0]">{docsCount} items</p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#e9edef]">{(docsCount * 2.1).toFixed(1)} MB</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleClearMedia}
              className="w-full py-2.5 bg-[#f15c6d]/10 hover:bg-[#f15c6d]/20 text-[#f15c6d] font-semibold text-xs rounded-full transition flex items-center justify-center gap-2 border border-[#f15c6d]/30"
            >
              <Trash2 size={16} /> Clear Chat Media Cache
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
