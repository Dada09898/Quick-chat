import React, { useEffect, useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';

interface ChatListProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewChat?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ isMobileOpen, onCloseMobile, onOpenNewChat }) => {
  const [conversations, setConversations] = useState<any[]>([]);
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
      flex-col w-full md:w-80 bg-gray-950 border-r border-gray-800 h-full
      ${isMobileOpen ? 'flex absolute inset-0 z-50' : 'hidden md:flex'}
    `}>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900 z-10 shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-indigo-500"/> Chats
        </h2>
        <button 
          onClick={onOpenNewChat}
          className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-full transition"
          title="New Chat"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="p-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No conversations found.
          </div>
        ) : (
          conversations.map(conv => {
            const otherUser = getOtherMember(conv);
            const displayName = otherUser?.display_name || otherUser?.username || otherUser?.email?.split('@')[0] || 'Unknown User';
            const isActive = activeConversationId === conv.id;
            
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`w-full p-3 flex items-center gap-3 transition border-b border-gray-800/50 hover:bg-gray-900 group ${
                  isActive ? 'bg-gray-800/80 border-indigo-500/30' : ''
                }`}
              >
                <Avatar 
                  name={displayName} 
                  url={otherUser?.avatar} 
                  status={otherUser?.presence_status} 
                  size="lg"
                />
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium truncate ${isActive ? 'text-indigo-400' : 'text-gray-200 group-hover:text-white'}`}>
                      {displayName}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatTime(conv.last_activity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate pr-2">
                      Tap to view messages
                    </p>
                    {conv.unread_count_cache > 0 && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {conv.unread_count_cache}
                      </span>
                    )}
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
