import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Pause, Play, Trash2, Send } from 'lucide-react';
import { useStatusStore, type StatusItem } from './statusStore';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';

export const StatusViewerModal: React.FC = () => {
  const { activeViewerGroup, activeViewerIndex, closeViewer, nextStatus, prevStatus, deleteStatus } = useStatusStore();
  const currentUser = useAuthStore(state => state.user);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(0);

  const currentStatus: StatusItem | undefined = activeViewerGroup?.statuses[activeViewerIndex];
  const isOwn = currentStatus?.userId === currentUser?.id || activeViewerGroup?.userId === currentUser?.id;

  // Auto-advance timer (5 seconds per status)
  useEffect(() => {
    if (!currentStatus || isPaused) return;

    setProgress(0);
    const intervalTime = 50; // update progress every 50ms
    const totalDuration = 5000; // 5s total
    const increment = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          clearInterval(timer);
          nextStatus();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentStatus, activeViewerIndex, isPaused, nextStatus]);

  if (!activeViewerGroup || !currentStatus) return null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    alert(`Reply sent to ${activeViewerGroup.userName}: "${replyText}"`);
    setReplyText('');
    closeViewer();
  };

  const formatTimeAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none"
        style={{ backgroundColor: currentStatus.type === 'text' ? (currentStatus.backgroundColor || '#005c4b') : '#000000' }}
      >
        {/* Top Header & Progress Bars */}
        <div className="w-full max-w-md p-4 flex flex-col gap-3 z-20 bg-gradient-to-b from-black/80 to-transparent pt-safe">
          {/* Progress Bars Row */}
          <div className="flex gap-1.5 w-full">
            {activeViewerGroup.statuses.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < activeViewerIndex
                        ? '100%'
                        : idx === activeViewerIndex
                        ? `${progress}%`
                        : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Info & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={activeViewerGroup.userName} url={activeViewerGroup.userAvatar} size="md" />
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm leading-tight">{activeViewerGroup.userName}</span>
                <span className="text-white/70 text-xs">{formatTimeAgo(currentStatus.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 hover:bg-white/10 rounded-full transition"
                title={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
              {isOwn && (
                <button
                  onClick={() => {
                    deleteStatus(currentStatus.id);
                    nextStatus();
                  }}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-full transition"
                  title="Delete status"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={closeViewer} className="p-2 hover:bg-white/10 rounded-full transition" title="Close">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="relative flex-1 w-full max-w-md flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 3) {
              prevStatus();
            } else if (x > (rect.width * 2) / 3) {
              nextStatus();
            } else {
              setIsPaused(!isPaused);
            }
          }}
        >
          {currentStatus.type === 'text' ? (
            <div className="text-center px-6 text-2xl sm:text-3xl font-medium text-white break-words leading-snug">
              {currentStatus.content}
            </div>
          ) : currentStatus.type === 'image' ? (
            <img
              src={currentStatus.content}
              alt="Status"
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <video src={currentStatus.content} autoPlay controls={false} className="max-h-full max-w-full object-contain" />
          )}

          {/* Caption */}
          {currentStatus.caption && (
            <div className="absolute bottom-6 left-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl text-center text-sm font-medium">
              {currentStatus.caption}
            </div>
          )}
        </div>

        {/* Navigation Touch Areas / Arrows */}
        <button
          onClick={prevStatus}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white transition hidden md:block"
        >
          <ChevronLeft size={36} />
        </button>
        <button
          onClick={nextStatus}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white transition hidden md:block"
        >
          <ChevronRight size={36} />
        </button>

        {/* Reply Bar (if not own status) */}
        {!isOwn && (
          <form
            onSubmit={handleSendReply}
            className="w-full max-w-md p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-2 pb-safe"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder={`Reply to ${activeViewerGroup.userName}...`}
              className="flex-1 bg-white/10 text-white placeholder-white/50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884]"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2.5 bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 text-[#111b21] rounded-full transition"
            >
              <Send size={18} />
            </button>
          </form>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
