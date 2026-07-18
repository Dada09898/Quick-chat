import React, { useEffect, useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Plus } from 'lucide-react';

export const ChatList = ({ isMobileOpen, onCloseMobile }: { isMobileOpen: boolean, onCloseMobile: () => void }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/chat/conversations/', {
          headers: { 'Authorization': 'Bearer ' + document.cookie } // Using HttpOnly so this is just placeholder logic if JWT needed in header. If strictly cookies, drop header.
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.results || []);
        }
      } catch (e) {
        console.error('Failed to fetch conversations', e);
      }
    };
    fetchConversations();
  }, []);

  const handleSelect = (id: string) => {
    setActiveConversation(id);
    onCloseMobile();
  };

  return (
    <div className={`
      flex-col w-full md:w-80 bg-gray-900 border-r border-gray-800 h-full
      ${isMobileOpen ? 'flex absolute inset-0 z-50' : 'hidden md:flex'}
    `}>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-cyan-500"/> Chats
        </h2>
        <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No conversations found.</div>
        ) : (
          conversations.map(conv => {
            const isActive = conv.id === activeConversationId;
            return (
              <div 
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`p-4 border-b border-gray-800/50 cursor-pointer transition flex items-center gap-3
                  ${isActive ? 'bg-gray-800/80 border-l-4 border-l-cyan-500' : 'hover:bg-gray-800/40 border-l-4 border-l-transparent'}`}
              >
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                  <MessageSquare size={20}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-gray-200 truncate">Conversation</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">Secure Vault Chat</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
