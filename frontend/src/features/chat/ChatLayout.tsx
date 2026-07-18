import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from './chatStore';
import { useRealtimeStore } from '../../realtime/store';
import { ChatList } from './ChatList';
import { NotificationBell } from '../notifications/NotificationBell';
import { Menu, X, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ChatLayout: React.FC = () => {
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const { remotePresence } = useRealtimeStore();

  // No hardcoded conversation selection — ChatList.onSelect sets the active conversation.

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      
      {/* Sidebar Chat List */}
      <ChatList isMobileOpen={isMobileListOpen} onCloseMobile={() => setIsMobileListOpen(false)} />

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
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">Welcome to Kryozen Quick Chat</h2>
              <p className="text-gray-500">Select a conversation or start a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
