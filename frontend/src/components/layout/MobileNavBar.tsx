import React from 'react';
import { MessageSquare, CircleDashed, PhoneCall, Users, Settings } from 'lucide-react';

interface MobileNavBarProps {
  activeTab: 'chats' | 'status' | 'calls' | 'communities';
  setActiveTab: (tab: 'chats' | 'status' | 'calls' | 'communities') => void;
  unreadCount?: number;
  onOpenSettings?: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  setActiveTab,
  unreadCount = 0,
  onOpenSettings,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#202c33] border-t border-[#222d34] h-14 px-3 flex items-center justify-around select-none">
      {/* Chats */}
      <button
        onClick={() => setActiveTab('chats')}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'chats' ? 'text-[#00a884]' : 'text-[#8696a0]'
        }`}
      >
        <div className="relative">
          <MessageSquare size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1 bg-[#00a884] text-[#111b21] text-[9px] font-bold rounded-full border border-[#202c33]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">Chats</span>
      </button>

      {/* Status */}
      <button
        onClick={() => setActiveTab('status')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'status' ? 'text-[#00a884]' : 'text-[#8696a0]'
        }`}
      >
        <CircleDashed size={20} />
        <span className="text-[10px] font-medium">Status</span>
      </button>

      {/* Calls */}
      <button
        onClick={() => setActiveTab('calls')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'calls' ? 'text-[#00a884]' : 'text-[#8696a0]'
        }`}
      >
        <PhoneCall size={20} />
        <span className="text-[10px] font-medium">Calls</span>
      </button>

      {/* Communities */}
      <button
        onClick={() => setActiveTab('communities')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
          activeTab === 'communities' ? 'text-[#00a884]' : 'text-[#8696a0]'
        }`}
      >
        <Users size={20} />
        <span className="text-[10px] font-medium">Communities</span>
      </button>

      {/* Settings */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 text-[#8696a0] rounded-xl transition-all"
        >
          <Settings size={20} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      )}
    </div>
  );
};
