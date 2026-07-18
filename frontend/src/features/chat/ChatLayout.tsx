import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from './chatStore';
import { useRealtimeStore } from '../../realtime/store';
import { ChatList } from './ChatList';
import { NotificationBell } from '../notifications/NotificationBell';
import { Menu, User, MessageSquarePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewChatModal } from './NewChatModal';

export const ChatLayout: React.FC = () => {
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const { remotePresence } = useRealtimeStore();

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      
      {/* Sidebar Chat List */}
      <ChatList 
        isMobileOpen={isMobileListOpen} 
        onCloseMobile={() => setIsMobileListOpen(false)} 
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className="px-4 md:px-6 py-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              onClick={() => setIsMobileListOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{activeConversationId ? 'Private Chat' : 'Kryozen Quick Chat'}</h1>
              {activeConversationId && (
                <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${remotePresence.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  {remotePresence.status === 'online' ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link to="/settings" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition">
              <User size={20} />
            </Link>
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
