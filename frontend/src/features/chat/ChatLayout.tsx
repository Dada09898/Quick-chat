import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from './chatStore';
import { useRealtimeStore } from '../../realtime/store';
import { useAuthStore } from '../../store/authStore';
import { ChatList } from './ChatList';
import { NotificationBell } from '../notifications/NotificationBell';
import { Menu, User, MessageSquarePlus, Phone, Video, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewChatModal } from './NewChatModal';
import { useCallStore } from '../calls/CallStore';
import { Avatar } from '../../components/ui/Avatar';

export const ChatLayout: React.FC = () => {
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const conversations = useChatStore(state => state.conversations);
  const currentUser = useAuthStore(state => state.user);
  
  const { remotePresence, remoteTyping } = useRealtimeStore();
  const setCallSession = useCallStore(state => state.setSession);
  const setCallState = useCallStore(state => state.setState);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  let displayName = 'Private Chat';
  let avatarUrl = undefined;
  let status = remotePresence.status;
  
  if (activeConversation && activeConversation.members) {
    const otherMember = activeConversation.members.find((m: any) => m.user && m.user.id !== currentUser?.id)?.user;
    if (otherMember) {
      displayName = otherMember.display_name || otherMember.username || otherMember.email?.split('@')[0] || 'Unknown';
      avatarUrl = otherMember.avatar;
      // We could also read their status from presence service here
    }
  }

  const handleStartCall = (isVideo: boolean) => {
    if (!activeConversationId) return;
    setCallSession(crypto.randomUUID(), '', activeConversationId);
    setCallState('OUTGOING');
  };

  return (
    <div className="flex h-screen bg-[#111b21] text-white font-sans overflow-hidden relative">
      
      {/* Sidebar Chat List */}
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full z-10`}>
        <ChatList 
          isMobileOpen={isMobileListOpen} 
          onCloseMobile={() => setIsMobileListOpen(false)} 
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full min-w-0 bg-[#0b141a]`}>
        {/* Header */}
        <header className="px-3 md:px-4 py-2 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            {activeConversationId ? (
              <button 
                className="md:hidden p-1 -ml-1 text-[#aebac1] hover:text-white flex items-center"
                onClick={() => useChatStore.getState().setActiveConversation(null)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            ) : (
              <button 
                className="md:hidden p-2 -ml-2 text-[#aebac1] hover:text-white"
                onClick={() => setIsMobileListOpen(true)}
              >
                <Menu size={24} />
              </button>
            )}
            
            <div className="flex items-center gap-3">
              {activeConversationId && (
                <Avatar name={displayName} url={avatarUrl} size="md" />
              )}
              <div className="flex flex-col justify-center">
                <h1 className="text-base font-semibold text-[#e9edef] leading-tight cursor-pointer hover:underline">{activeConversationId ? displayName : 'Kryozen Quick Chat'}</h1>
                {activeConversationId && (
                  <p className="text-[13px] text-[#8696a0] leading-tight mt-0.5">
                    {remoteTyping ? (
                      <span className="text-[#00a884] font-medium">typing...</span>
                    ) : (
                      <span>{status === 'online' ? 'online' : ''}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4 text-[#aebac1]">
            {activeConversationId && (
              <>
                <button 
                  onClick={() => handleStartCall(true)}
                  className="p-1 hover:text-white transition"
                  title="Video Call"
                >
                  <Video size={20} />
                </button>
                <button 
                  onClick={() => handleStartCall(false)}
                  className="p-1 hover:text-white transition"
                  title="Voice Call"
                >
                  <Phone size={20} />
                </button>
                <button className="p-1 hover:text-white transition">
                   <Search size={20} />
                </button>
              </>
            )}
            {!activeConversationId && (
              <>
                <NotificationBell />
                <Link to="/settings" className="p-1 hover:text-white transition">
                  <User size={20} />
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Messages & Input */}
        {activeConversationId ? (
          <>
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="bg-gray-900 p-8 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm w-full mx-4 border border-gray-800">
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquarePlus size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Your Conversations</h2>
              <p className="text-gray-400 mb-6">Select an existing chat from the left or start a new one to connect with your friends.</p>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition shadow-lg shadow-indigo-500/20"
              >
                Start a New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      <NewChatModal 
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
};
