import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from './chatStore';
import { useRealtimeStore } from '../../realtime/store';
import { useAuthStore } from '../../store/authStore';
import { ChatList } from './ChatList';
import { NotificationBell } from '../notifications/NotificationBell';
import { Menu, User, MessageSquarePlus, Phone, Video, Search, Bot, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewChatModal } from './NewChatModal';
import { useCallStore } from '../calls/CallStore';
import { Avatar } from '../../components/ui/Avatar';

import { RightPanel } from './RightPanel';

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
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full z-10 shrink-0`}>
        <ChatList 
          isMobileOpen={isMobileListOpen} 
          onCloseMobile={() => setIsMobileListOpen(false)} 
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full min-w-0 bg-[#0b141a]`}>
        {/* Header */}
        <header className="px-3 md:px-4 py-2 pt-[max(8px,env(safe-area-inset-top))] bg-[#202c33]/80 backdrop-blur-md shadow-sm flex items-center justify-between z-10 shrink-0 h-[calc(60px+env(safe-area-inset-top))] relative">
          <div className="flex items-center gap-3">
            {activeConversationId ? (
              <button 
                className="md:hidden p-1 -ml-1 text-[#aebac1] hover:text-white flex items-center transition-colors"
                onClick={() => useChatStore.getState().setActiveConversation(null)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            ) : (
              <button 
                className="md:hidden p-2 -ml-2 text-[#aebac1] hover:text-white transition-colors"
                onClick={() => setIsMobileListOpen(true)}
              >
                <Menu size={24} />
              </button>
            )}
            
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => activeConversationId && useChatStore.getState().toggleRightPanel()}
            >
              {activeConversationId && (
                <Avatar name={displayName} url={avatarUrl} size="md" className="group-hover:opacity-90 transition-opacity" />
              )}
              <div className="flex flex-col justify-center h-full">
                <h1 className="text-base font-medium text-[#e9edef] leading-tight truncate">{activeConversationId ? displayName : 'Kryozen Quick Chat'}</h1>
                {activeConversationId && (
                  <p className="text-[13px] text-[#8696a0] leading-tight mt-[1px] min-h-[16px]">
                    {remoteTyping ? (
                      <span className="text-[#00a884] font-medium">typing...</span>
                    ) : (
                      <span className="transition-opacity duration-300">{status === 'online' ? 'online' : ''}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3 sm:gap-4 text-[#aebac1]">
            {activeConversationId && (
              <>
                <button 
                  onClick={() => handleStartCall(true)}
                  className="p-2 hover:bg-[#374248] rounded-full transition-colors hidden sm:block"
                  title="Video Call"
                >
                  <Video size={20} />
                </button>
                <button 
                  onClick={() => handleStartCall(false)}
                  className="p-2 hover:bg-[#374248] rounded-full transition-colors hidden sm:block"
                  title="Voice Call"
                >
                  <Phone size={20} />
                </button>
                <button className="p-2 hover:bg-[#374248] rounded-full transition-colors" title="Search">
                   <Search size={20} />
                </button>
                <button className="p-2 hover:bg-[#374248] rounded-full transition-colors hidden md:block" title="AI Assistant">
                   <Bot size={20} />
                </button>
                <button className="p-2 hover:bg-[#374248] rounded-full transition-colors" title="Menu">
                   <MoreVertical size={20} />
                </button>
              </>
            )}
            {!activeConversationId && (
              <>
                <NotificationBell />
                <Link to="/settings" className="p-2 hover:bg-[#374248] rounded-full transition-colors">
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
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] bg-[#111b21] border-b-[6px] border-[#00a884]">
            <div className="flex flex-col items-center text-center max-w-sm w-full mx-4">
              <div className="w-[120px] h-[120px] rounded-full bg-[#202c33] flex items-center justify-center mb-8 shadow-sm">
                <MessageSquarePlus size={48} className="text-[#00a884] opacity-80" />
              </div>
              <h2 className="text-[32px] font-light text-[#e9edef] mb-4">Kryozen Web</h2>
              <p className="text-[14px] leading-relaxed mb-8">Send and receive messages without keeping your phone online.<br/>Use Kryozen on up to 4 linked devices and 1 phone at the same time.</p>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-medium py-2.5 px-6 rounded-full transition-colors shadow-sm"
              >
                Start a Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Details Panel */}
      <AnimatePresence>
        {useChatStore(state => state.isRightPanelOpen) && (
          <RightPanel />
        )}
      </AnimatePresence>

      <NewChatModal 
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
};
