import React, { useEffect, useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Search, ChevronDown, Pin, VolumeX, Check, CheckCheck, X, CircleDashed, Plus, PhoneCall, Users, QrCode, Laptop, MoreVertical, Camera, IndianRupee, Radio, Settings, Star } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { useStatusStore, type UserStatusGroup } from '../status/statusStore';
import { StatusViewerModal } from '../status/StatusViewerModal';
import { StatusCreateModal } from '../status/StatusCreateModal';

import { ShieldCheck } from 'lucide-react';
import { StatusPrivacyModal } from '../status/StatusPrivacyModal';
import { StatusViewersModal } from '../status/StatusViewersModal';
import { PwaInstallButton } from '../../components/PwaInstallButton';
import { CallsTab } from '../calls/CallsTab';
import { CommunityModal } from './CommunityModal';
import { QrLoginModal } from '../auth/QrLoginModal';
import { LinkedDevicesModal } from '../auth/LinkedDevicesModal';

interface ChatListProps {
  activeTab?: 'chats' | 'status' | 'calls' | 'communities';
  setActiveTab?: (tab: 'chats' | 'status' | 'calls' | 'communities') => void;
  onOpenNewChat?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  onOpenNewChat,
  onOpenProfile,
  onOpenSettings
}) => {
  const conversations = useChatStore(state => state.conversations);
  const setConversations = useChatStore(state => state.setConversations);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const [localActiveTab, setLocalActiveTab] = useState<'chats' | 'status' | 'calls' | 'communities'>('chats');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'unread' | 'favourites' | 'groups'>('all');
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLinkedDevicesOpen, setIsLinkedDevicesOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    myStatuses,
    contactStatusGroups,
    openViewer,
    setCreateModalOpen,
    setPrivacyModalOpen,
    mutedUserIds,
    toggleMuteUser,
    cleanExpiredStatuses
  } = useStatusStore();

  const [isMutedExpanded, setIsMutedExpanded] = useState(false);

  const unmutedGroups = contactStatusGroups.filter(g => !mutedUserIds.includes(g.userId));
  const mutedGroups = contactStatusGroups.filter(g => mutedUserIds.includes(g.userId));

  useEffect(() => {
    cleanExpiredStatuses();
    useStatusStore.getState().fetchStatuses().catch(console.error);
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
  }, []); 

  const handleSelect = (id: string) => {
    setActiveConversation(id);
  };

  const getOtherMember = (conv: any) => {
    if (!conv || !conv.members || !Array.isArray(conv.members)) return null;
    const other = conv.members.find((m: any) => {
      const memberId = m?.user?.id || m?.userId || m?.id || m?.user_id;
      return memberId && memberId !== user?.id;
    });
    if (!other) return null;
    if (other.user && typeof other.user === 'object') {
      return other.user;
    }
    return {
      id: other.userId || other.id || other.user_id,
      username: other.username,
      display_name: other.displayName || other.display_name,
      avatar: other.avatar,
      email: other.email,
      presence_status: other.presence_status || other.presenceStatus || 'offline'
    };
  };

  const filteredConversations = React.useMemo(() => {
    let list = conversations;
    if (categoryFilter === 'unread') {
      list = list.filter(c => c.unread_count_cache > 0);
    } else if (categoryFilter === 'favourites') {
      list = list.filter(c => c.is_pinned);
    } else if (categoryFilter === 'groups') {
      list = list.filter(c => !c.is_direct);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(conv => {
      const other = getOtherMember(conv);
      const name = other?.display_name || other?.username || other?.email || '';
      return name.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, categoryFilter]);

  const formatTime = React.useCallback((isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const handleMyStatusClick = () => {
    if (myStatuses.length > 0) {
      const myGroup: UserStatusGroup = {
        userId: user?.id || 'me',
        userName: 'My Status',
        userAvatar: user?.avatar,
        statuses: myStatuses,
        hasUnviewed: false,
        lastUpdated: myStatuses[0].createdAt
      };
      openViewer(myGroup, 0);
    } else {
      setCreateModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col w-full md:w-[30vw] md:min-w-[300px] md:max-w-[450px] bg-[#111b21] border-r border-[#222d34] h-full">
      {/* Modals */}
      <StatusViewerModal />
      <StatusCreateModal />
      <StatusPrivacyModal />
      <StatusViewersModal />
      <CommunityModal
        isOpen={isCommunityModalOpen}
        onClose={() => setIsCommunityModalOpen(false)}
      />
      <QrLoginModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onOpenLinkedDevices={() => setIsLinkedDevicesOpen(true)}
      />
      <LinkedDevicesModal
        isOpen={isLinkedDevicesOpen}
        onClose={() => setIsLinkedDevicesOpen(false)}
      />

      {/* Clean WhatsApp Mobile & Web Header */}
      <div className="px-4 py-3 border-b border-[#222d34] flex items-center justify-between bg-[#111b21] md:bg-[#202c33] z-10 shrink-0 h-[60px] relative">
        <h2 className="text-[22px] font-bold text-[#e9edef] tracking-tight font-sans">
          WhatsApp
        </h2>
        
        <div className="flex items-center gap-2 text-[#aebac1] relative">
          {/* Camera Button */}
          <button 
            onClick={() => toast.success('Opening camera...')}
            className="p-2 hover:bg-[#374248] rounded-full transition text-[#aebac1] hover:text-[#e9edef]"
            title="Camera"
          >
            <Camera size={22} />
          </button>

          {/* Three Dots Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 hover:bg-[#374248] rounded-full transition text-[#aebac1] hover:text-[#e9edef] ${isMenuOpen ? 'bg-[#374248] text-[#00a884]' : ''}`}
            title="Menu & Options"
          >
            <MoreVertical size={22} />
          </button>

          {/* WhatsApp Mobile Three Dots Dropdown Menu (Matching Screenshot Exactly) */}
          {isMenuOpen && (
            <div 
              className="absolute right-0 top-12 w-60 bg-[#1f2c34] border border-[#2a3942] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-[15px] text-[#e9edef] font-sans"
              onClick={() => setIsMenuOpen(false)}
            >
              <button
                onClick={onOpenNewChat}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>New group</span>
              </button>

              <button
                onClick={() => setIsCommunityModalOpen(true)}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>New community</span>
              </button>

              <button
                onClick={() => setIsCommunityModalOpen(true)}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>Broadcast lists</span>
              </button>

              <button
                onClick={() => setIsLinkedDevicesOpen(true)}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>Linked devices</span>
              </button>

              <button
                onClick={() => toast.success('Starred messages opened')}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>Starred</span>
              </button>

              <button
                onClick={() => toast.success('Payments & UPI service ready')}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>Payments</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    const { apiJson } = await import('../../lib/api');
                    await apiJson('/api/chat/conversations/read_all/', { method: 'POST' });
                    toast.success('All messages marked as read');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>Read all</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  else if (onOpenSettings) onOpenSettings();
                  else setPrivacyModalOpen(true);
                }}
                className="w-full px-4 py-3 hover:bg-[#111b21] flex items-center gap-3 text-left transition"
              >
                <span>Settings & Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Status Stories Horizontal Scroll Bar (Only on Chats Tab) */}
      {activeTab === 'chats' && (myStatuses.length > 0 || contactStatusGroups.length > 0) && (
        <div className="px-4 py-2.5 border-b border-[#222d34] bg-[#111b21] shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
            {/* My Status Bubble */}
            <div className="flex flex-col items-center gap-1 cursor-pointer shrink-0" onClick={handleMyStatusClick}>
              <div className="relative">
                <div className={`p-0.5 rounded-full ${myStatuses.length > 0 ? 'bg-[#00a884]' : 'border-2 border-dashed border-[#8696a0]'}`}>
                  <Avatar name={user?.display_name || 'Me'} url={user?.avatar} size="md" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateModalOpen(true);
                  }}
                  className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#00a884] text-[#111b21] rounded-full flex items-center justify-center border-2 border-[#111b21] font-bold"
                  title="Add status update"
                >
                  <Plus size={12} />
                </button>
              </div>
              <span className="text-[10px] text-[#8696a0] font-medium truncate max-w-[56px]">My status</span>
            </div>

            {/* Divider */}
            {contactStatusGroups.length > 0 && <div className="h-6 w-[1px] bg-[#222d34] shrink-0" />}

            {/* Contact Status Stories */}
            {contactStatusGroups.map((group) => (
              <div
                key={group.userId}
                className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
                onClick={() => openViewer(group, 0)}
              >
                <div className={`p-0.5 rounded-full ${group.hasUnviewed ? 'bg-[#00a884] ring-2 ring-[#00a884]/30' : 'bg-[#8696a0]/40'}`}>
                  <Avatar name={group.userName} url={group.userAvatar} size="md" />
                </div>
                <span className="text-[10px] text-[#8696a0] font-medium truncate max-w-[56px]">{group.userName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input & Category Filter Pills */}
      <div className="p-2 border-b border-[#222d34] bg-[#111b21] shrink-0 space-y-2">
        <div className="relative flex items-center bg-[#202c33] rounded-xl px-3 py-1.5 h-9 border border-transparent focus-within:border-[#00a884]">
          <Search size={18} className="text-[#8696a0]" />
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-[14px] text-[#d1d7db] ml-3 placeholder-[#8696a0] focus:outline-none focus:ring-0"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-[#8696a0] hover:text-[#d1d7db] p-1"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category Filter Pills (WhatsApp Web Style) */}
        {activeTab === 'chats' && (
          <div className="flex items-center gap-2 px-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'favourites', label: 'Favourites' },
              { id: 'groups', label: 'Groups' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${
                  categoryFilter === cat.id
                    ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                    : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'status' ? (
          /* STATUS UPDATES TAB VIEW */
          <div className="p-4 flex flex-col gap-4 text-[#e9edef]">
            <div className="flex items-center gap-3 p-3 bg-[#202c33] rounded-xl cursor-pointer" onClick={handleMyStatusClick}>
              <div className="relative">
                <Avatar name="My Status" url={user?.avatar} size="lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00a884] text-[#111b21] rounded-full flex items-center justify-center border-2 border-[#202c33] font-bold">
                  <Plus size={14} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-base">My status</span>
                <span className="text-xs text-[#8696a0]">
                  {myStatuses.length > 0 ? `${myStatuses.length} active updates` : 'Tap to add status update'}
                </span>
              </div>
            </div>

            <div className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider mt-2">Recent updates</div>
            {unmutedGroups.length === 0 ? (
              <div className="text-xs text-[#8696a0] italic px-2">No recent updates</div>
            ) : (
              unmutedGroups.map((group) => (
                <div
                  key={group.userId}
                  onClick={() => openViewer(group, 0)}
                  className="flex items-center justify-between p-2 hover:bg-[#202c33] rounded-xl cursor-pointer transition group/item relative"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-0.5 rounded-full ${group.hasUnviewed ? 'bg-[#00a884]' : 'bg-[#8696a0]/40'}`}>
                      <Avatar name={group.userName} url={group.userAvatar} size="lg" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-base text-[#e9edef]">{group.userName}</span>
                      <span className="text-xs text-[#8696a0]">
                        {group.statuses.length} update{group.statuses.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMuteUser(group.userId);
                    }}
                    className="opacity-0 group-hover/item:opacity-100 p-2 text-[#8696a0] hover:text-white rounded-full transition"
                    title="Mute Status"
                  >
                    <VolumeX size={16} />
                  </button>
                </div>
              ))
            )}

            {/* Muted Updates Section */}
            {mutedGroups.length > 0 && (
              <div className="mt-4 border-t border-[#222d34] pt-3">
                <button
                  onClick={() => setIsMutedExpanded(!isMutedExpanded)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#8696a0] uppercase tracking-wider py-2 hover:text-[#e9edef] transition"
                >
                  <span>Muted updates ({mutedGroups.length})</span>
                  <ChevronDown size={16} className={`transition-transform ${isMutedExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isMutedExpanded && (
                  <div className="flex flex-col gap-2 mt-2">
                    {mutedGroups.map((group) => (
                      <div
                        key={group.userId}
                        onClick={() => openViewer(group, 0)}
                        className="flex items-center justify-between p-2 hover:bg-[#202c33] rounded-xl cursor-pointer transition opacity-60 hover:opacity-100 group/muted relative"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-0.5 rounded-full bg-[#8696a0]/40">
                            <Avatar name={group.userName} url={group.userAvatar} size="lg" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-base text-[#e9edef]">{group.userName}</span>
                            <span className="text-xs text-[#8696a0]">Muted</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMuteUser(group.userId);
                          }}
                          className="opacity-0 group-hover/muted:opacity-100 p-2 text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition text-xs font-medium"
                          title="Unmute Status"
                        >
                          Unmute
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'calls' ? (
          /* CALLS TAB VIEW */
          <CallsTab />
        ) : (
          /* CHATS TAB VIEW */
          filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0] text-[15px]">
              {searchQuery.trim() ? 'No matching conversations.' : 'No conversations found.'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUser = getOtherMember(conv);
              const displayName = otherUser?.display_name || otherUser?.username || otherUser?.email?.split('@')[0] || 'Unknown User';
              const isActive = activeConversationId === conv.id;
              
              const isPinned = conv.is_pinned || false;
              const isMuted = conv.is_muted || false;
              const isTyping = false;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={`w-full flex items-center gap-3 transition-all duration-200 group relative ${
                    isActive ? 'bg-[#2a3942] border-l-4 border-[#00a884] pl-2' : 'hover:bg-[#202c33] border-l-4 border-transparent'
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
                            {conv.last_message_preview ? (
                              <>
                                <CheckCheck size={16} className="text-[#53bdeb] shrink-0" />
                                <span className="truncate">{conv.last_message_preview}</span>
                              </>
                            ) : (
                              <span className="truncate text-[#667781]">Start a conversation</span>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isMuted && <VolumeX size={15} className="text-[#8696a0]" title="Muted" />}
                        {isPinned && <Pin size={15} className="text-[#8696a0] fill-[#8696a0]" title="Pinned to top" />}
                        {conv.unread_count_cache > 0 && (
                          <span className="bg-[#00a884] text-[#111b21] font-bold text-[12px] min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1.5 shadow-sm">
                            {conv.unread_count_cache}
                          </span>
                        )}
                        <div className="hidden group-hover:flex items-center gap-1 ml-1">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              conv.is_pinned = !conv.is_pinned;
                              useChatStore.setState({ conversations: [...conversations] });
                              try {
                                const { apiJson } = await import('../../lib/api');
                                await apiJson(`/api/chat/conversations/${conv.id}/pin/`, { method: 'POST' });
                              } catch (err) {
                                console.error(err);
                              }
                              toast.success(conv.is_pinned ? 'Chat pinned to top' : 'Chat unpinned');
                            }}
                            className="p-1 hover:bg-[#374248] rounded-full text-[#8696a0] hover:text-[#e9edef] transition"
                            title={isPinned ? 'Unpin chat' : 'Pin chat to top'}
                          >
                            <Pin size={14} className={isPinned ? 'fill-[#00a884] text-[#00a884]' : ''} />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              conv.is_muted = !conv.is_muted;
                              useChatStore.setState({ conversations: [...conversations] });
                              try {
                                const { apiJson } = await import('../../lib/api');
                                await apiJson(`/api/chat/conversations/${conv.id}/mute/`, { method: 'POST' });
                              } catch (err) {
                                console.error(err);
                              }
                              toast.success(conv.is_muted ? 'Notifications muted' : 'Notifications unmuted');
                            }}
                            className="p-1 hover:bg-[#374248] rounded-full text-[#8696a0] hover:text-[#e9edef] transition"
                            title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
                          >
                            <VolumeX size={14} className={isMuted ? 'text-[#00a884]' : ''} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )
        )}
      </div>

      {/* Floating Green New Chat Button for Mobile View */}
      <button
        onClick={onOpenNewChat}
        className="md:hidden fixed bottom-20 right-5 w-14 h-14 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full shadow-2xl flex items-center justify-center font-bold z-40 active:scale-95 transition-transform"
        title="Start New Chat"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};
