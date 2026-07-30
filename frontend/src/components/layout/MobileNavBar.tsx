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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111b21] border-t border-[#222d34] h-16 px-4 flex items-center justify-around select-none">
      {/* Chats */}
      <button
        onClick={() => setActiveTab('chats')}
        className="flex flex-col items-center justify-center gap-1"
      >
        <div className={`relative px-4 py-1 rounded-full transition-all ${
          activeTab === 'chats' ? 'bg-[#103629] text-[#00a884]' : 'text-[#8696a0]'
        }`}>
          <MessageSquare size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 right-1 px-1.5 py-0.5 bg-[#00a884] text-[#111b21] text-[9px] font-bold rounded-full border border-[#111b21]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className={`text-[11px] font-medium ${activeTab === 'chats' ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>Chats</span>
      </button>

      {/* Updates / Status */}
      <button
        onClick={() => setActiveTab('status')}
        className="flex flex-col items-center justify-center gap-1"
      >
        <div className={`relative px-4 py-1 rounded-full transition-all ${
          activeTab === 'status' ? 'bg-[#103629] text-[#00a884]' : 'text-[#8696a0]'
        }`}>
          <CircleDashed size={20} />
          <span className="absolute top-1 right-3 w-2 h-2 bg-[#00a884] rounded-full ring-2 ring-[#111b21]" />
        </div>
        <span className={`text-[11px] font-medium ${activeTab === 'status' ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>Updates</span>
      </button>

      {/* Communities */}
      <button
        onClick={() => setActiveTab('communities')}
        className="flex flex-col items-center justify-center gap-1"
      >
        <div className={`px-4 py-1 rounded-full transition-all ${
          activeTab === 'communities' ? 'bg-[#103629] text-[#00a884]' : 'text-[#8696a0]'
        }`}>
          <Users size={20} />
        </div>
        <span className={`text-[11px] font-medium ${activeTab === 'communities' ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>Communities</span>
      </button>

      {/* Calls */}
      <button
        onClick={() => setActiveTab('calls')}
        className="flex flex-col items-center justify-center gap-1"
      >
        <div className={`px-4 py-1 rounded-full transition-all ${
          activeTab === 'calls' ? 'bg-[#103629] text-[#00a884]' : 'text-[#8696a0]'
        }`}>
          <PhoneCall size={20} />
        </div>
        <span className={`text-[11px] font-medium ${activeTab === 'calls' ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>Calls</span>
      </button>
    </div>
  );
};
