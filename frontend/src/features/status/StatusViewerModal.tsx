import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Pause, Play, Trash2, Send, Eye, VolumeX } from 'lucide-react';
import { useStatusStore, type StatusItem } from './statusStore';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../chat/chatStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import toast from 'react-hot-toast';

export const StatusViewerModal: React.FC = () => {
  const { activeViewerGroup, activeViewerIndex, closeViewer, nextStatus, prevStatus, deleteStatus, setViewersModalStatusId, toggleMuteUser, mutedUserIds } = useStatusStore();
  const currentUser = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();
  const enqueueMessage = useChatStore(state => state.enqueueMessage);

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
    if (!replyText.trim() || !currentUser) return;

    const activeConvId = useChatStore.getState().activeConversationId;
    if (activeConvId) {
      const msgId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const statusRef = currentStatus.type === 'text' ? `"${currentStatus.content}"` : `📷 Status Attachment`;
      const replyMessageText = `Replied to status: ${statusRef}\n${replyText.trim()}`;
      const ciphertext = btoa(unescape(encodeURIComponent(replyMessageText)));

      const newMsg = {
        id: msgId,
        conversation_id: activeConvId,
        sender_id: currentUser.id,
        ciphertext,
        nonce: 'pending',
        signature: 'UNVERIFIED',
        key_version: 1,
        algorithm: 'AES-256-GCM',
        created_at: createdAt,
        is_edited: false,
        deleted_at: null,
        status: 'queued' as const,
        decrypted_text: replyMessageText
      };

      enqueueMessage(newMsg);
      sendEvent('message.send', {
        id: msgId,
        conversation_id: activeConvId,
        ciphertext,
        nonce: 'pending',
        signature: 'UNVERIFIED',
        key_version: 1,
        algorithm: 'AES-256-GCM',
        created_at: createdAt
      });
      toast.success('Status reply sent!');
    } else {
      toast.success(`Reply sent to ${activeViewerGroup.userName}!`);
    }

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

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-[#0b141a]/95 backdrop-blur-md flex items-center justify-center select-none">
        {/* Navigation Touch Arrows (Desktop Screen Sides) */}
        <button
          onClick={prevStatus}
          className="fixed left-8 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition bg-black/40 hover:bg-black/70 rounded-full z-50 hidden md:flex items-center justify-center"
          title="Previous status"
        >
          <ChevronLeft size={36} />
        </button>
        <button
          onClick={nextStatus}
          className="fixed right-8 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition bg-black/40 hover:bg-black/70 rounded-full z-50 hidden md:flex items-center justify-center"
          title="Next status"
        >
          <ChevronRight size={36} />
        </button>

        {/* Centered Phone Frame Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100) {
              closeViewer();
            }
          }}
          className="w-full max-w-[440px] h-full sm:h-[90vh] sm:rounded-2xl shadow-2xl relative flex flex-col justify-between overflow-hidden border border-[#222d34]"
          style={{ backgroundColor: currentStatus.type === 'text' ? (currentStatus.backgroundColor || '#005c4b') : '#000000' }}
        >
          {/* Top Header & Progress Bars */}
          <div className="w-full p-4 flex flex-col gap-3 z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-safe">
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
                {!isOwn && (
                  <button
                    onClick={() => {
                      toggleMuteUser(activeViewerGroup.userId);
                      const isMuted = mutedUserIds.includes(activeViewerGroup.userId);
                      toast.success(isMuted ? 'Status unmuted' : 'Muted status updates from this user');
                      closeViewer();
                    }}
                    className={`p-2 rounded-full transition ${
                      mutedUserIds.includes(activeViewerGroup.userId)
                        ? 'text-yellow-400 hover:bg-yellow-500/20'
                        : 'hover:bg-white/10 text-white'
                    }`}
                    title={mutedUserIds.includes(activeViewerGroup.userId) ? 'Unmute Status' : 'Mute Status'}
                  >
                    <VolumeX size={20} />
                  </button>
                )}
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

          {/* Content Area - Supports Tap & Press-and-Hold to Pause */}
          <div
            className="relative flex-1 w-full flex items-center justify-center p-4 cursor-pointer"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 3) {
                prevStatus();
              } else if (x > (rect.width * 2) / 3) {
                nextStatus();
              }
            }}
          >
            {currentStatus.type === 'text' ? (
              <div
                className="text-center px-6 text-2xl sm:text-3xl font-medium text-white break-words leading-snug"
                style={{ fontFamily: currentStatus.fontFamily || 'sans-serif' }}
              >
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

          {/* Viewers Bar for Own Status */}
          {isOwn && (
            <div className="w-full p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center pb-safe z-30">
              <button
                onClick={() => setViewersModalStatusId(currentStatus.id)}
                className="flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 transition shadow-lg"
              >
                <Eye size={18} className="text-[#00a884]" />
                <span className="text-sm font-medium">
                  {currentStatus.views?.length || 0} {currentStatus.views?.length === 1 ? 'view' : 'views'}
                </span>
              </button>
            </div>
          )}

          {/* Quick Emoji Reactions & Reply Bar (if not own status) */}
          {!isOwn && (
            <div className="w-full p-4 bg-gradient-to-t from-black/90 to-transparent flex flex-col gap-3 pb-safe z-30">
              {/* Quick Emoji Bar */}
              <div className="flex justify-around items-center bg-black/40 backdrop-blur-md py-2 px-3 rounded-full border border-white/10">
                {['❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      const fakeEvent = { preventDefault: () => {} } as any;
                      setReplyText(`Reacted ${emoji}`);
                      setTimeout(() => handleSendReply(fakeEvent), 0);
                    }}
                    className="hover:scale-130 active:scale-95 transition-transform text-2xl"
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
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
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
