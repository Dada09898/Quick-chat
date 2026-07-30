import React from 'react';
import { MessageSquare, CircleDashed, PhoneCall, Users, Star, Settings, User, QrCode, Laptop, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';

interface SidebarRailProps {
  activeTab: 'chats' | 'status' | 'calls' | 'communities';
  setActiveTab: (tab: 'chats' | 'status' | 'calls' | 'communities') => void;
  unreadCount?: number;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenQrModal?: () => void;
  onOpenLinkedDevices?: () => void;
  onOpenAI?: () => void;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeTab,
  setActiveTab,
  unreadCount = 0,
  onOpenSettings,
  onOpenProfile,
  onOpenQrModal,
  onOpenLinkedDevices,
  onOpenAI,
}) => {
  const user = useAuthStore(state => state.user);

  return (
    <div className="w-[64px] bg-[#202c33] dark:bg-[#111b21] border-r border-[#222d34] flex flex-col items-center justify-between py-3 z-30 shrink-0 select-none">
      {/* Top Navigation Icons */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Chats Tab */}
        <button
          onClick={() => setActiveTab('chats')}
          className={`relative p-3 rounded-xl transition-all duration-200 group ${
            activeTab === 'chats'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          title="Chats"
        >
          <MessageSquare size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#00a884] text-[#111b21] text-[10px] font-bold rounded-full border border-[#202c33] min-w-[16px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Status Updates */}
        <button
          onClick={() => setActiveTab('status')}
          className={`p-3 rounded-xl transition-all duration-200 ${
            activeTab === 'status'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          title="Status Updates"
        >
          <CircleDashed size={22} />
        </button>

        {/* Calls Tab */}
        <button
          onClick={() => setActiveTab('calls')}
          className={`p-3 rounded-xl transition-all duration-200 ${
            activeTab === 'calls'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          title="Calls"
        >
          <PhoneCall size={22} />
        </button>

        {/* Communities */}
        <button
          onClick={() => setActiveTab('communities')}
          className={`p-3 rounded-xl transition-all duration-200 ${
            activeTab === 'communities'
              ? 'bg-[#374248] text-[#00a884]'
              : 'text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]'
          }`}
          title="Communities"
        >
          <Users size={22} />
        </button>

        {/* AI Assistant */}
        {onOpenAI && (
          <button
            onClick={onOpenAI}
            className="p-3 rounded-xl text-[#a855f7] hover:bg-[#374248] transition-all duration-200 hover:scale-105"
            title="Ask AI Assistant"
          >
            <Sparkles size={22} />
          </button>
        )}
      </div>

      {/* Bottom Utility Icons */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Linked Devices */}
        {onOpenLinkedDevices && (
          <button
            onClick={onOpenLinkedDevices}
            className="p-3 rounded-xl text-[#aebac1] hover:bg-[#2a3942] hover:text-[#00a884] transition-all"
            title="Linked Devices"
          >
            <Laptop size={20} />
          </button>
        )}

        {/* QR Scanner */}
        {onOpenQrModal && (
          <button
            onClick={onOpenQrModal}
            className="p-3 rounded-xl text-[#aebac1] hover:bg-[#2a3942] hover:text-[#00a884] transition-all"
            title="Scan QR Code"
          >
            <QrCode size={20} />
          </button>
        )}

        {/* Settings */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-3 rounded-xl text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef] transition-all"
            title="Settings & Customization"
          >
            <Settings size={20} />
          </button>
        )}

        {/* Profile Avatar */}
        <div
          onClick={onOpenProfile}
          className="cursor-pointer p-0.5 rounded-full hover:ring-2 hover:ring-[#00a884] transition-all"
          title="Profile & Status"
        >
          <Avatar name={user?.display_name || user?.username || 'User'} url={user?.avatar} size="sm" />
        </div>
      </div>
    </div>
  );
};
