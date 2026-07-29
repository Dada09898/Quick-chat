import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Send, Type, Palette } from 'lucide-react';
import { useStatusStore, type StatusFontFamily } from './statusStore';
import { useAuthStore } from '../../store/authStore';

const COLOR_PALETTE = [
  '#005c4b', // WhatsApp Dark Green
  '#1e3a8a', // Deep Blue
  '#5b21b6', // Deep Purple
  '#831843', // Deep Pink
  '#7c2d12', // Warm Brown
  '#14532d', // Forest Green
  '#172554', // Dark Navy
];

const FONT_FAMILIES: { name: string; value: StatusFontFamily; fontStyle: string }[] = [
  { name: 'Sans', value: 'sans-serif', fontStyle: 'font-sans' },
  { name: 'Serif', value: 'serif', fontStyle: 'font-serif' },
  { name: 'Mono', value: 'monospace', fontStyle: 'font-mono' },
  { name: 'Cursive', value: 'cursive', fontStyle: 'font-cursive' },
  { name: 'Impact', value: 'impact', fontStyle: 'font-black uppercase' },
];

export const StatusCreateModal: React.FC = () => {
  const { isCreateModalOpen, setCreateModalOpen, addStatus } = useStatusStore();
  const currentUser = useAuthStore(state => state.user);

  const [mode, setMode] = useState<'text' | 'media'>('text');
  const [text, setText] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  if (!isCreateModalOpen) return null;

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    setMode('media');
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'media' && !mediaUrl) return;

    addStatus({
      userId: currentUser?.id || 'me',
      userName: currentUser?.email?.split('@')[0] || 'My Status',
      userAvatar: currentUser?.avatar,
      type: mode === 'text' ? 'text' : mediaType,
      content: mode === 'text' ? text.trim() : mediaUrl,
      caption: mode === 'media' ? caption.trim() : undefined,
      backgroundColor: mode === 'text' ? COLOR_PALETTE[colorIndex] : undefined,
      fontFamily: mode === 'text' ? FONT_FAMILIES[fontIndex].value : undefined
    });

    // Reset & Close
    setText('');
    setMediaUrl('');
    setCaption('');
    setCreateModalOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#202c33] rounded-2xl overflow-hidden border border-[#222d34] shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#222d34] flex items-center justify-between bg-[#111b21]">
            <h3 className="text-lg font-semibold text-[#e9edef]">Create Status</h3>
            <button onClick={() => setCreateModalOpen(false)} className="text-[#8696a0] hover:text-white p-1">
              <X size={22} />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-[#222d34] bg-[#111b21]">
            <button
              onClick={() => setMode('text')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition border-b-2 ${
                mode === 'text' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0] hover:text-white'
              }`}
            >
              <Type size={18} /> Text Status
            </button>
            <label
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition border-b-2 ${
                mode === 'media' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0] hover:text-white'
              }`}
            >
              <ImageIcon size={18} /> Photo / Video
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
            </label>
          </div>

          {/* Form Body */}
          <form onSubmit={handlePost} className="p-6 flex flex-col gap-4">
            {mode === 'text' ? (
              <div className="flex flex-col gap-4">
                <div
                  className="w-full h-56 rounded-xl p-4 flex items-center justify-center relative transition-colors"
                  style={{ backgroundColor: COLOR_PALETTE[colorIndex] }}
                >
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a status update..."
                    rows={4}
                    maxLength={200}
                    style={{ fontFamily: FONT_FAMILIES[fontIndex].value }}
                    className="w-full bg-transparent text-white placeholder-white/60 text-xl font-medium text-center focus:outline-none resize-none"
                  />
                  {/* Style Control Buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFontIndex((prev) => (prev + 1) % FONT_FAMILIES.length)}
                      className="px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded-full transition text-xs font-bold"
                      title="Change Font Family"
                    >
                      {FONT_FAMILIES[fontIndex].name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorIndex((prev) => (prev + 1) % COLOR_PALETTE.length)}
                      className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition"
                      title="Change background color"
                    >
                      <Palette size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {mediaUrl ? (
                  <div className="relative rounded-xl overflow-hidden h-64 bg-black flex items-center justify-center">
                    {mediaType === 'image' ? (
                      <img src={mediaUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <video src={mediaUrl} controls className="max-h-full max-w-full object-contain" />
                    )}
                    <label className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black text-white rounded-full cursor-pointer">
                      <ImageIcon size={16} />
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
                    </label>
                  </div>
                ) : (
                  <label className="h-48 border-2 border-dashed border-[#222d34] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00a884] transition text-[#8696a0] hover:text-white">
                    <ImageIcon size={36} className="mb-2 text-[#00a884]" />
                    <span className="text-sm font-medium">Click to select photo or video</span>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
                  </label>
                )}

                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full bg-[#111b21] border border-[#222d34] rounded-xl px-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                />
              </div>
            )}

            {/* Post Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={(mode === 'text' && !text.trim()) || (mode === 'media' && !mediaUrl)}
                className="px-6 py-2.5 bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 text-[#111b21] font-semibold rounded-full flex items-center gap-2 transition shadow-lg"
              >
                Send <Send size={16} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
