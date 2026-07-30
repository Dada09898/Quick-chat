import React, { useState } from 'react';
import { X, Paintbrush, Type, Sun, Moon, Monitor, Palette, Image as ImageIcon, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useChatStore } from './chatStore';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';

// Wallpaper options
const WALLPAPERS = [
  { id: 'default', name: 'Default', value: 'none', color: '#0b141a' },
  { id: 'pattern1', name: 'Doodle', value: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', color: '#0b141a' },
  { id: 'solid1', name: 'Deep Ocean', value: 'none', color: '#0a1628' },
  { id: 'solid2', name: 'Forest', value: 'none', color: '#0a1a12' },
  { id: 'solid3', name: 'Midnight', value: 'none', color: '#121212' },
  { id: 'solid4', name: 'Navy', value: 'none', color: '#0d1b2a' },
];

// Accent color options
const ACCENT_COLORS = [
  { id: 'green', name: 'Green', value: '#00a884' },
  { id: 'blue', name: 'Blue', value: '#53bdeb' },
  { id: 'purple', name: 'Purple', value: '#bf59cf' },
  { id: 'pink', name: 'Pink', value: '#f15c6d' },
  { id: 'orange', name: 'Orange', value: '#ff7a00' },
  { id: 'teal', name: 'Teal', value: '#25d366' },
];

const FONT_SIZES = [
  { id: 'small', name: 'Small', value: '13px' },
  { id: 'medium', name: 'Medium', value: '15px' },
  { id: 'large', name: 'Large', value: '17px' },
];

interface ChatCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatCustomization: React.FC<ChatCustomizationProps> = ({ isOpen, onClose }) => {
  const [activeWallpaper, setActiveWallpaper] = useState('pattern1');
  const [activeAccent, setActiveAccent] = useState('green');
  const [activeFontSize, setActiveFontSize] = useState('medium');
  const { theme, setTheme } = useThemeStore();

  const handleWallpaperChange = (wp: typeof WALLPAPERS[0]) => {
    setActiveWallpaper(wp.id);
    // Apply wallpaper to CSS custom property
    document.documentElement.style.setProperty('--chat-wallpaper', wp.value);
    document.documentElement.style.setProperty('--chat-bg-color', wp.color);
  };

  const handleAccentChange = (accent: typeof ACCENT_COLORS[0]) => {
    setActiveAccent(accent.id);
    document.documentElement.style.setProperty('--accent-color', accent.value);
  };

  const handleFontSizeChange = (fs: typeof FONT_SIZES[0]) => {
    setActiveFontSize(fs.id);
    document.documentElement.style.setProperty('--chat-font-size', fs.value);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="fixed inset-0 z-50 bg-[#111b21] flex flex-col xl:static xl:w-[320px] xl:border-l xl:border-[#222d34]"
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#202c33] border-b border-[#222d34] shrink-0">
        <button onClick={onClose} className="text-[#aebac1] hover:text-[#d1d7db] p-1" aria-label="Close customization">
          <X size={24} />
        </button>
        <h2 className="text-[#e9edef] font-medium text-base flex items-center gap-2">
          <Paintbrush size={18} /> Customize Chat
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Theme Mode */}
        <section>
          <h3 className="text-[#e9edef] text-sm font-medium mb-3 flex items-center gap-2">
            <Sun size={16} /> Theme
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', icon: <Sun size={18} />, name: 'Light' },
              { id: 'dark', icon: <Moon size={18} />, name: 'Dark' },
              { id: 'system', icon: <Monitor size={18} />, name: 'System' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${
                  theme === t.id
                    ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30'
                    : 'bg-[#202c33] text-[#aebac1] border border-transparent hover:bg-[#2a3942]'
                }`}
              >
                {t.icon}
                <span className="text-xs">{t.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Wallpaper */}
        <section>
          <h3 className="text-[#e9edef] text-sm font-medium mb-3 flex items-center gap-2">
            <ImageIcon size={16} /> Chat Wallpaper
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {WALLPAPERS.map(wp => (
              <button
                key={wp.id}
                onClick={() => handleWallpaperChange(wp)}
                className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                  activeWallpaper === wp.id ? 'border-[#00a884] scale-95' : 'border-transparent hover:border-[#374248]'
                }`}
                style={{ backgroundColor: wp.color }}
                title={wp.name}
              >
                {wp.value !== 'none' && (
                  <div
                    className="w-full h-full opacity-30"
                    style={{ backgroundImage: wp.value, backgroundSize: '100px', backgroundRepeat: 'repeat' }}
                  />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Accent Color */}
        <section>
          <h3 className="text-[#e9edef] text-sm font-medium mb-3 flex items-center gap-2">
            <Palette size={16} /> Accent Color
          </h3>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_COLORS.map(ac => (
              <button
                key={ac.id}
                onClick={() => handleAccentChange(ac)}
                className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                  activeAccent === ac.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111b21] scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: ac.value }}
                title={ac.name}
                aria-label={`${ac.name} accent color`}
              >
                {activeAccent === ac.id && (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Font Size */}
        <section>
          <h3 className="text-[#e9edef] text-sm font-medium mb-3 flex items-center gap-2">
            <Type size={16} /> Message Font Size
          </h3>
          <div className="space-y-2">
            {FONT_SIZES.map(fs => (
              <button
                key={fs.id}
                onClick={() => handleFontSizeChange(fs)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  activeFontSize === fs.id
                    ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30'
                    : 'bg-[#202c33] text-[#d1d7db] border border-transparent hover:bg-[#2a3942]'
                }`}
              >
                <span style={{ fontSize: fs.value }}>{fs.name}</span>
                <span className="text-xs text-[#8696a0]">{fs.value}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Preview */}
        <section>
          <h3 className="text-[#e9edef] text-sm font-medium mb-3">Preview</h3>
          <div className="rounded-lg overflow-hidden border border-[#222d34]">
            <div className="p-4 space-y-2" style={{
              backgroundColor: WALLPAPERS.find(w => w.id === activeWallpaper)?.color || '#0b141a',
              backgroundImage: WALLPAPERS.find(w => w.id === activeWallpaper)?.value || 'none',
              backgroundSize: '100px',
              backgroundRepeat: 'repeat',
              backgroundBlendMode: 'overlay'
            }}>
              <div className="flex justify-start">
                <div className="bg-[#202c33] px-3 py-1.5 rounded-lg rounded-tl-none max-w-[80%]">
                  <p className="text-[#e9edef]" style={{ fontSize: FONT_SIZES.find(f => f.id === activeFontSize)?.value }}>Hey! How are you?</p>
                  <span className="text-[10px] text-[#8696a0] float-right mt-1">10:30</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="px-3 py-1.5 rounded-lg rounded-tr-none max-w-[80%]" style={{
                  backgroundColor: ACCENT_COLORS.find(a => a.id === activeAccent)?.value === '#00a884' ? '#005c4b' : ACCENT_COLORS.find(a => a.id === activeAccent)?.value + '33'
                }}>
                  <p className="text-[#e9edef]" style={{ fontSize: FONT_SIZES.find(f => f.id === activeFontSize)?.value }}>I'm doing great! 😊</p>
                  <span className="text-[10px] text-[#8696a0] float-right mt-1">10:31</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Export Chat Backup */}
        <section className="pt-2 border-t border-[#222d34]">
          <h3 className="text-[#e9edef] text-sm font-medium mb-2 flex items-center gap-2">
            <Download size={16} className="text-[#00a884]" /> Backup & Export
          </h3>
          <p className="text-xs text-[#8696a0] mb-3">
            Download a formatted text backup of this conversation history.
          </p>
          <button
            onClick={async () => {
              const activeConversationId = useChatStore.getState().activeConversationId;
              if (!activeConversationId) {
                toast.error('No active conversation selected');
                return;
              }
              const messagesRecord = useChatStore.getState().messages;
              let msgs = Object.values(messagesRecord)
                .filter(m => m.conversation_id === activeConversationId || (m as any).conversation === activeConversationId)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

              if (msgs.length === 0) {
                try {
                  const res = await apiClient(`/api/chat/messages/?conversation_id=${activeConversationId}`);
                  if (res.ok) {
                    const data = await res.json();
                    msgs = data.results || [];
                  }
                } catch (e) { console.error(e); }
              }

              if (msgs.length === 0) {
                toast.error('No messages found to export.');
                return;
              }

              const lines = msgs.map(m => {
                const time = new Date(m.created_at || (m as any).created_at).toLocaleString();
                const sender = m.sender_id || (m as any).sender?.username || 'User';
                const text = m.decrypted_text || m.ciphertext || '[Media Attachment]';
                return `[${time}] ${sender}: ${text}`;
              });

              const content = `QuickChat Conversation Backup\nExported: ${new Date().toLocaleString()}\nTotal Messages: ${msgs.length}\n----------------------------------------\n\n` + lines.join('\n');
              
              const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `quickchat_backup_${Date.now()}.txt`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${msgs.length} messages to backup file!`);
            }}
            className="w-full py-2 bg-[#00a884]/20 hover:bg-[#00a884]/30 text-[#00a884] border border-[#00a884]/40 font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={16} /> Export Chat Transcript (.txt)
          </button>
        </section>
      </div>
    </motion.div>
  );
};
