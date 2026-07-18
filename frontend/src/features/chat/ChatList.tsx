import React, { useEffect, useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Search, ChevronDown, Pin, VolumeX, Check, CheckCheck } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';

interface ChatListProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewChat?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ isMobileOpen, onCloseMobile, onOpenNewChat }) => {
  const conversations = useChatStore(state => state.conversations);
  const setConversations = useChatStore(state => state.setConversations);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await apiClient('/api/chat/conversations/');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.results || []);
        }
      } catch (e) {
        console.error('Failed to fetch conversations', e);
      }
    };
    fetchConversations();
  }, [activeConversationId]); 

  const handleSelect = (id: string) => {
    setActiveConversation(id);
    onCloseMobile();
  };

  const getOtherMember = (conv: any) => {
    if (conv.members && Array.isArray(conv.members)) {
      return conv.members.find((m: any) => m.user && m.user.id !== user?.id)?.user;
    }
    return null;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`
      flex-col w-full md:w-[30vw] min-w-[300px] max-w-[450px] bg-[#111b21] border-r border-[#222d34] h-full
      ${isMobileOpen ? 'flex absolute inset-0 z-50' : 'hidden md:flex'}
    `}>
      <div className="p-4 border-b border-[#222d34] flex items-center justify-between bg-[#202c33] z-10 shrink-0">
        <h2 className="text-[22px] font-semibold text-[#e9edef] flex items-center gap-2">
          Chats
        </h2>
        <div className="flex items-center gap-3 text-[#aebac1]">
          <button 
            onClick={onOpenNewChat}
            className="p-2 hover:bg-[#374248] rounded-full transition"
            title="New Chat"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </div>
      
      <div className="p-2 border-b border-[#222d34] bg-[#111b21] shrink-0">
        <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 h-9">
          <button className="text-[#8696a0]">
            <Search size={18} />
          </button>
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            className="w-full bg-transparent border-none text-[15px] text-[#d1d7db] ml-4 placeholder-[#8696a0] focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-[#8696a0] text-[15px]">
            No conversations found.
          </div>
        ) : (
          conversations.map((conv, idx) => {
            const otherUser = getOtherMember(conv);
            const displayName = otherUser?.display_name || otherUser?.username || otherUser?.email?.split('@')[0] || 'Unknown User';
            const isActive = activeConversationId === conv.id;
            
            // Mock pinned and muted states for UI demonstration (e.g. first conversation pinned)
            const isPinned = idx === 0;
            const isMuted = idx === 1;
            
            // Faked typing state if active
            const isTyping = false; // Will connect to global typing later
            
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`w-full flex items-center gap-3 transition group relative ${
                  isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                }`}
              >
                <div className="pl-3 py-3 shrink-0 relative">
                  <Avatar 
                    name={displayName} 
                    url={otherUser?.avatar} 
                    size="lg"
                  />
                  {otherUser?.presence_status === 'online' && (
                    <span className="absolute bottom-3 right-0 w-3.5 h-3.5 bg-[#00a884] border-2 border-[#111b21] rounded-full group-hover:border-[#202c33] transition-colors" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-left py-3 pr-4 border-b border-[#222d34] group-last:border-none flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`font-medium text-[17px] truncate ${isActive ? 'text-[#e9edef]' : 'text-[#e9edef]'}`}>
                      {displayName}
                    </h3>
                    <span className={`text-[12px] whitespace-nowrap ml-2 transition-colors ${conv.unread_count_cache > 0 ? 'text-[#00a884] font-medium' : 'text-[#8696a0]'}`}>
                      {formatTime(conv.last_activity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] text-[#8696a0] truncate pr-2 flex items-center gap-1 min-h-[20px] flex-1">
                      {isTyping ? (
                        <span className="text-[#00a884] font-medium">typing...</span>
                      ) : (
                        <>
                          <CheckCheck size={16} className="text-[#53bdeb] shrink-0" />
                          <span className="truncate">Tap to view messages</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMuted && <VolumeX size={15} className="text-[#8696a0]" />}
                      {isPinned && <Pin size={15} className="text-[#8696a0] rotate-45" />}
                      {conv.unread_count_cache > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] flex items-center justify-center text-[11px] font-bold text-[#111b21]">
                          {conv.unread_count_cache}
                        </span>
                      )}
                      
                      {/* Hover Action Menu Chevron */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 bg-[#202c33] pl-2 -mr-1 hidden md:block">
                        <ChevronDown size={20} className="text-[#8696a0] hover:text-[#d1d7db]" />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
