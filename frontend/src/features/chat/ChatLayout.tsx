import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from './chatStore';
import { useRealtimeStore } from '../../realtime/store';
import { useAuthStore } from '../../store/authStore';
import { ChatList } from './ChatList';
import { NotificationBell } from '../notifications/NotificationBell';
import { Menu, User, MessageSquarePlus, Phone, Video, Search, Bot, MoreVertical, Star, Trash2, X, Clock, Lock, Info, CheckSquare, Heart, XCircle, Link2, Calendar, UserPlus, MinusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallStore } from '../calls/CallStore';
import { Avatar } from '../../components/ui/Avatar';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { NewChatModal } from './NewChatModal';
import { RightPanel } from './RightPanel';
import { ForwardModal } from './ForwardModal';
import { ChatSearch } from './ChatSearch';
import { CameraModal } from './CameraModal';
import { TypingIndicator } from './TypingIndicator';
import { ChatCustomization } from './ChatCustomization';
import { GroupCreateModal } from './GroupCreateModal';
import { GroupInfoPanel } from './GroupInfoPanel';
import { AIChatPanel } from '../ai/components/AIChatPanel';
import { ForwardMessageModal } from './ForwardMessageModal';
import { StarredMessagesModal } from './StarredMessagesModal';
import { DisappearingMessagesModal } from './DisappearingMessagesModal';
import { ProfilePictureModal } from '../profile/ProfilePictureModal';
import { SidebarRail } from '../../components/layout/SidebarRail';
import { MobileNavBar } from '../../components/layout/MobileNavBar';
import { PwaInstallButton } from '../../components/PwaInstallButton';

const formatLastSeen = (lastSeen?: string | number | null): string => {
  if (!lastSeen) return 'offline';
  try {
    const date = new Date(lastSeen);
    if (isNaN(date.getTime())) return 'offline';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    if (isToday) {
      return `last seen today at ${timeStr}`;
    }
    if (isYesterday) {
      return `last seen yesterday at ${timeStr}`;
    }

    const dayMonthStr = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return `last seen ${dayMonthStr} at ${timeStr}`;
  } catch {
    return 'offline';
  }
};

export const ChatLayout: React.FC = () => {
  const [activeRailTab, setActiveRailTab] = useState<'chats' | 'status' | 'calls' | 'communities'>('chats');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isStarredModalOpen, setIsStarredModalOpen] = useState(false);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLinkedDevicesOpen, setIsLinkedDevicesOpen] = useState(false);
  const [isInChatMenuOpen, setIsInChatMenuOpen] = useState(false);

  // Hydrate offline store on mount
  React.useEffect(() => {
    useChatStore.getState().hydrateFromOfflineStore().catch(console.error);
  }, []);
  
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const conversations = useChatStore(state => state.conversations);
  const currentUser = useAuthStore(state => state.user);
  
  const { isConnected, isConnecting, remotePresence, remoteTyping } = useRealtimeStore();
  const setCallSession = useCallStore(state => state.setSession);
  const setCallState = useCallStore(state => state.setState);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  let displayName = 'Private Chat';
  let avatarUrl = undefined;
  let otherUser: any = null;
  
  if (activeConversation && activeConversation.members && Array.isArray(activeConversation.members)) {
    const other = activeConversation.members.find((m: any) => {
      const mId = m?.user?.id || m?.userId || m?.id || m?.user_id;
      return mId && mId !== currentUser?.id;
    });
    otherUser = other?.user && typeof other.user === 'object' ? other.user : other;
    if (otherUser) {
      displayName = otherUser.display_name || otherUser.displayName || otherUser.username || otherUser.email?.split('@')[0] || 'Unknown';
      avatarUrl = otherUser.avatar;
    }
  }

  const isPeerOnline = remotePresence.status === 'online' || otherUser?.presence_status === 'online';
  const lastSeenRaw = remotePresence.lastSeen || otherUser?.last_seen;

  const handleStartCall = (isVideo: boolean) => {
    if (!activeConversationId) return;
    setCallSession(crypto.randomUUID(), '', activeConversationId);
    setCallState('OUTGOING');
  };

  const handleToggleFavourite = async () => {
    if (!activeConversationId) return;
    try {
      const { apiJson } = await import('../../lib/api');
      const res = await apiJson(`/api/chat/conversations/${activeConversationId}/pin/`, { method: 'POST' });
      if (res.ok) {
        if (activeConversation) {
          activeConversation.is_pinned = !activeConversation.is_pinned;
          useChatStore.setState({ conversations: [...conversations] });
        }
        toast.success(activeConversation?.is_pinned ? 'Added to Favourites' : 'Removed from Favourites');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update favourite status');
    }
  };

  const handleSendCallLink = () => {
    if (!activeConversationId) return;
    const callUrl = `${window.location.origin}/call/${activeConversationId}`;
    navigator.clipboard.writeText(callUrl);
    useChatStore.getState().sendMessage(`📞 Join WebRTC Call: ${callUrl}`);
    toast.success('Call link copied & sent to chat!');
  };

  const handleScheduleCall = () => {
    toast.success('WebRTC Call scheduled for your contacts!');
  };

  const handleClearChat = async () => {
    if (!activeConversationId) return;
    if (!window.confirm('Are you sure you want to clear all messages in this chat?')) return;
    try {
      const { apiJson } = await import('../../lib/api');
      await apiJson(`/api/chat/conversations/${activeConversationId}/clear/`, { method: 'POST' });
      useChatStore.setState({ messages: [] });
      toast.success('Chat cleared!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear chat');
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConversationId) return;
    if (!window.confirm('Are you sure you want to delete this chat? This cannot be undone.')) return;
    try {
      const { apiJson } = await import('../../lib/api');
      await apiJson(`/api/chat/conversations/${activeConversationId}/`, { method: 'DELETE' });
      useChatStore.setState({ 
        conversations: conversations.filter(c => c.id !== activeConversationId),
        activeConversationId: null
      });
      toast.success('Chat deleted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete chat');
    }
  };

  return (
    <div className="flex h-screen bg-[#111b21] text-white font-sans overflow-hidden relative select-none">
      
      {/* Far-Left Vertical Icon Rail (WhatsApp Web Desktop Layout) */}
      <div className="hidden md:flex h-full">
        <SidebarRail
          activeTab={activeRailTab}
          setActiveTab={setActiveRailTab}
          onOpenSettings={() => setIsCustomizeOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          onOpenLinkedDevices={() => setIsLinkedDevicesOpen(true)}
          onOpenAI={() => setIsAIOpen(true)}
        />
      </div>

      {/* Sidebar Chat List */}
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full z-10 shrink-0`}>
        <ChatList 
          activeTab={activeRailTab}
          setActiveTab={setActiveRailTab}
          onOpenNewChat={() => setIsNewChatModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenSettings={() => setIsCustomizeOpen(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full min-w-0 bg-[#0b141a]`}>
        {/* Header */}
        {useChatStore.getState().selectedMessageIds.length > 0 ? (
          <header className="px-3 md:px-4 py-2 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between z-10 shrink-0 h-[60px] animate-in fade-in duration-200">
            <div className="flex items-center gap-4 text-[#e9edef]">
              <button 
                onClick={() => useChatStore.getState().clearSelection()} 
                className="p-1.5 hover:bg-[#374248] rounded-full text-[#8696a0] hover:text-[#e9edef] transition"
              >
                <X size={20} />
              </button>
              <span className="font-medium text-sm text-[#e9edef]">{useChatStore.getState().selectedMessageIds.length} selected</span>
            </div>
            <div className="flex items-center gap-3 text-[#8696a0]">
              <button 
                onClick={() => {
                  const ids = useChatStore.getState().selectedMessageIds;
                  ids.forEach(id => useChatStore.getState().toggleStar(id));
                  useChatStore.getState().clearSelection();
                  toast.success(`${ids.length} messages starred!`);
                }}
                className="p-2 hover:bg-[#374248] hover:text-[#00a884] rounded-full transition" 
                title="Star Messages"
              >
                <Star size={18} />
              </button>
              <button 
                onClick={() => {
                  const ids = useChatStore.getState().selectedMessageIds;
                  ids.forEach(id => useChatStore.getState().removeMessage(id));
                  useChatStore.getState().clearSelection();
                  toast.success(`${ids.length} messages deleted!`);
                }}
                className="p-2 hover:bg-[#374248] hover:text-red-400 rounded-full transition" 
                title="Delete Messages"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </header>
        ) : (
          <header className="px-3 md:px-4 py-2 pt-[max(8px,env(safe-area-inset-top))] bg-[#202c33]/80 backdrop-blur-md shadow-sm flex items-center justify-between z-10 shrink-0 h-[calc(60px+env(safe-area-inset-top))] relative">
            <div className="flex items-center gap-3">
              {activeConversationId && (
                <button 
                  className="md:hidden p-1 -ml-1 text-[#aebac1] hover:text-white flex items-center transition-colors"
                  onClick={() => useChatStore.getState().setActiveConversation(null)}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
              )}
              
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  if (!activeConversationId) return;
                  if (activeConversation && !activeConversation.is_direct) {
                    setIsGroupInfoOpen(!isGroupInfoOpen);
                  } else {
                    useChatStore.getState().toggleRightPanel();
                  }
                }}
              >
                {activeConversationId && (
                  <Avatar name={displayName} url={avatarUrl} size="md" className="group-hover:opacity-90 transition-opacity" />
                )}
                <div className="flex flex-col justify-center h-full">
                  <h1 className="text-base font-medium text-[#e9edef] leading-tight truncate">{activeConversationId ? displayName : 'Kryozen Quick Chat'}</h1>
                  {activeConversationId && (
                    <p className="text-[13px] text-[#8696a0] leading-tight mt-[1px] min-h-[16px]">
                      {remoteTyping ? (
                        <TypingIndicator />
                      ) : isPeerOnline ? (
                        <span className="text-[#00a884] font-medium transition-opacity duration-300">online</span>
                      ) : (
                        <span className="transition-opacity duration-300">{formatLastSeen(lastSeenRaw)}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 text-[#aebac1]">
              <div className="hidden md:block">
                <PwaInstallButton />
              </div>
              {activeConversationId && (
                <>
                  <button 
                    onClick={() => handleStartCall(true)}
                    className="p-2 hover:bg-[#374248] rounded-full transition-colors"
                    title="Video Call"
                  >
                    <Video size={20} />
                  </button>
                  <button 
                    onClick={() => handleStartCall(false)}
                    className="p-2 hover:bg-[#374248] rounded-full transition-colors"
                    title="Voice Call"
                  >
                    <Phone size={20} />
                  </button>
                  <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 hover:bg-[#374248] rounded-full transition-colors" title="Search" aria-label="Search messages">
                     <Search size={20} />
                  </button>
                  <button onClick={() => setIsStarredModalOpen(true)} className="p-2 hover:bg-[#374248] rounded-full transition-colors" title="Starred Messages">
                     <Star size={20} className="text-[#8696a0] hover:text-yellow-400" />
                  </button>
                  <button onClick={() => setIsAIOpen(!isAIOpen)} className={`p-2 hover:bg-[#374248] rounded-full transition-colors hidden md:block ${isAIOpen ? 'text-[#00a884] bg-[#374248]' : ''}`} title="AI Assistant">
                     <Bot size={20} />
                  </button>
                  
                  {/* Three Dots In-Chat Menu Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsInChatMenuOpen(!isInChatMenuOpen)} 
                      className={`p-2 hover:bg-[#374248] rounded-full transition-colors ${isInChatMenuOpen ? 'bg-[#374248] text-[#00a884]' : ''}`} 
                      title="Menu" 
                      aria-label="Chat menu"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* WhatsApp In-Chat Context Menu Dropdown (Matching Screenshot Exactly) */}
                    {isInChatMenuOpen && (
                      <div 
                        className="absolute right-0 top-11 w-64 bg-[#233138] border border-[#2a3942] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-sm text-[#d1d7db]"
                        onClick={() => setIsInChatMenuOpen(false)}
                      >
                        {/* Contact Info */}
                        <button
                          onClick={() => useChatStore.getState().toggleRightPanel()}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <Info size={16} className="text-[#aebac1]" />
                          <span>Contact info</span>
                        </button>

                        {/* Search */}
                        <button
                          onClick={() => setIsSearchOpen(true)}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <Search size={16} className="text-[#aebac1]" />
                          <span>Search</span>
                        </button>

                        {/* Select Messages */}
                        <button
                          onClick={() => useChatStore.getState().toggleSelectMode()}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <CheckSquare size={16} className="text-[#aebac1]" />
                          <span>Select messages</span>
                        </button>

                        {/* Disappearing Messages */}
                        <button
                          onClick={() => setIsDisappearingModalOpen(true)}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <Clock size={16} className="text-[#00a884]" />
                          <span>Disappearing messages</span>
                        </button>

                        {/* Add to Favourites */}
                        <button
                          onClick={handleToggleFavourite}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <Heart size={16} className={activeConversation?.is_pinned ? 'text-[#00a884] fill-[#00a884]' : 'text-[#aebac1]'} />
                          <span>{activeConversation?.is_pinned ? 'Remove from favourites' : 'Add to favourites'}</span>
                        </button>

                        {/* Close Chat */}
                        <button
                          onClick={() => setActiveConversation(null)}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition font-medium text-[#e9edef]"
                        >
                          <XCircle size={16} className="text-[#aebac1]" />
                          <span>Close chat</span>
                        </button>

                        <div className="h-[1px] bg-[#2a3942] my-1.5" />

                        {/* Send Call Link */}
                        <button
                          onClick={handleSendCallLink}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <Link2 size={16} className="text-[#00a884]" />
                          <span>Send call link</span>
                        </button>

                        {/* Schedule Call */}
                        <button
                          onClick={handleScheduleCall}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <Calendar size={16} className="text-[#aebac1]" />
                          <span>Schedule call</span>
                        </button>

                        {/* New Group Call */}
                        <button
                          onClick={() => handleStartCall(true)}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition"
                        >
                          <UserPlus size={16} className="text-[#aebac1]" />
                          <span>New group call</span>
                        </button>

                        <div className="h-[1px] bg-[#2a3942] my-1.5" />

                        {/* Clear Chat */}
                        <button
                          onClick={handleClearChat}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition text-[#aebac1]"
                        >
                          <MinusCircle size={16} />
                          <span>Clear chat</span>
                        </button>

                        {/* Delete Chat */}
                        <button
                          onClick={handleDeleteChat}
                          className="w-full px-4 py-2.5 hover:bg-[#182229] flex items-center gap-3 text-left transition text-red-400 hover:text-red-300 font-medium"
                        >
                          <Trash2 size={16} />
                          <span>Delete chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {!activeConversationId && (
                <>
                  <NotificationBell />
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-2 hover:bg-[#374248] rounded-full transition-colors text-[#aebac1] hover:text-[#00a884]"
                    title="My Profile & Avatar"
                  >
                    <User size={20} />
                  </button>
                </>
              )}
            </div>
          </header>
        )}

        {/* Connection Reconnecting Indicator */}
        {!isConnected && (
          <div className="bg-[#182229] border-b border-[#222d34] px-4 py-1.5 flex items-center justify-center gap-2 text-amber-400 text-xs font-medium animate-pulse z-20 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{isConnecting ? 'Connecting...' : 'Reconnecting... (Offline mode active)'}</span>
          </div>
        )}

        {/* AI Assistant Side Panel */}
        {isAIOpen && activeConversationId && (
          <AIChatPanel
            conversationId={activeConversationId}
            conversationName={displayName}
            onClose={() => setIsAIOpen(false)}
          />
        )}

        {/* Search Bar */}
        <React.Suspense fallback={null}>
          <AnimatePresence>
            {isSearchOpen && activeConversationId && (
              <ChatSearch
                onClose={() => setIsSearchOpen(false)}
                onNavigateToMessage={(messageId: string) => {
                  useChatStore.getState().setScrollToMessageId?.(messageId);
                }}
              />
            )}
          </AnimatePresence>
        </React.Suspense>

        {/* Messages & Input */}
        {activeConversationId ? (
          <>
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] bg-[#111b21] border-b-[6px] border-[#00a884] relative select-none">
            <div className="flex flex-col items-center text-center max-w-md w-full px-6">
              <div className="relative mb-6">
                <div className="w-[100px] h-[100px] rounded-full bg-[#202c33] flex items-center justify-center shadow-xl border border-[#2a3942]">
                  <MessageSquarePlus size={48} className="text-[#00a884]" />
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-light text-[#e9edef] mb-3 font-outfit">Quick Chat Web</h2>
              <p className="text-xs sm:text-sm text-[#8696a0] leading-relaxed mb-8">
                Send and receive end-to-end encrypted messages seamlessly.<br className="hidden sm:inline" />
                Use Quick Chat on up to 4 linked devices simultaneously.
              </p>
              
              {/* 3 WhatsApp Web Desktop Center Quick Action Buttons (Matching Screenshot) */}
              <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
                {/* New Conversation Button */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setIsNewChatModalOpen(true)}
                    className="w-14 h-14 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border border-[#222d34] shadow-lg"
                    title="New Conversation"
                  >
                    <MessageSquarePlus size={24} />
                  </button>
                  <span className="text-[11px] text-[#8696a0] font-medium">New chat</span>
                </div>

                {/* Add Contact Button */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setIsNewChatModalOpen(true)}
                    className="w-14 h-14 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border border-[#222d34] shadow-lg"
                    title="Add Contact"
                  >
                    <User size={24} />
                  </button>
                  <span className="text-[11px] text-[#8696a0] font-medium">Add contact</span>
                </div>

                {/* Ask AI / Meta AI Button */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setIsAIOpen(true)}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#a855f7] to-[#ec4899] text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-[#a855f7]/25"
                    title="Ask AI Assistant"
                  >
                    <Bot size={24} />
                  </button>
                  <span className="text-[11px] text-[#a855f7] font-medium">Ask AI</span>
                </div>
              </div>
            </div>

            {/* Bottom Security Footer */}
            <div className="absolute bottom-8 flex items-center gap-2 text-xs text-[#8696a0]">
              <Lock size={14} className="text-[#00a884]" />
              <span>End-to-end encrypted • Signal Protocol</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Details Panel */}
      <React.Suspense fallback={null}>
        <AnimatePresence>
          {useChatStore(state => state.isRightPanelOpen) && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-30 xl:hidden"
                onClick={() => useChatStore.getState().toggleRightPanel()}
                aria-hidden="true"
              />
              <RightPanel />
            </>
          )}
        </AnimatePresence>

        <NewChatModal 
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
        />
        <ForwardModal />
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(blob, type) => {
            setIsCameraOpen(false);
          }}
        />
        <GroupCreateModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
        />
        <AnimatePresence>
          {isGroupInfoOpen && (
            <GroupInfoPanel
              isOpen={isGroupInfoOpen}
              onClose={() => setIsGroupInfoOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isCustomizeOpen && (
            <ChatCustomization isOpen={isCustomizeOpen} onClose={() => setIsCustomizeOpen(false)} />
          )}
        </AnimatePresence>
        <ForwardMessageModal
          isOpen={useChatStore.getState().forwardingMessageIds.length > 0}
          onClose={() => useChatStore.getState().setForwardingMessageIds([])}
        />
        <StarredMessagesModal
          isOpen={isStarredModalOpen}
          onClose={() => setIsStarredModalOpen(false)}
        />
        <DisappearingMessagesModal
          isOpen={isDisappearingModalOpen}
          onClose={() => setIsDisappearingModalOpen(false)}
        />
        <ProfilePictureModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      </React.Suspense>

      {/* Mobile Devices Bottom Navigation Bar */}
      {!activeConversationId && (
        <MobileNavBar
          activeTab={activeRailTab}
          setActiveTab={setActiveRailTab}
          onOpenSettings={() => setIsCustomizeOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      )}
    </div>
  );
};
