import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { apiJson, apiClient } from '../../lib/api';
import { Search, UserPlus, Check, X as CloseIcon, Clock, Users, QrCode } from 'lucide-react';
import { useChatStore } from './chatStore';
import { MyQrCodeModal } from './MyQrCodeModal';
import { ScanQrModal } from './ScanQrModal';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'contacts' | 'search' | 'requests';

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  
  // Data states
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);
  const [showScanQr, setShowScanQr] = useState(false);
  const setActiveConversationId = useChatStore(state => state.setActiveConversationId);

  // Fetch initial data
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      fetchRequests();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    try {
      const res = await apiClient('/api/auth/contacts/');
      if (res.ok) setContacts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiClient('/api/auth/friends/requests/');
      if (res.ok) setRequests(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await apiClient(`/api/auth/search/?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleSendRequest = async (userId: string) => {
    try {
      const res = await apiJson('/api/auth/friends/request/', { method: 'POST', body: { target_user_id: userId } });
      if (res.ok) {
        alert('Friend request sent!');
        setSearchQuery('');
        setActiveTab('contacts');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send request');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await apiJson(`/api/auth/friends/request/${requestId}/respond/`, { 
        method: 'POST', 
        body: { action } 
      });
      if (res.ok) {
        fetchRequests();
        if (action === 'accept') fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startConversation = async (userId: string) => {
    try {
      const res = await apiJson('/api/chat/conversations/get_or_create/', { method: 'POST', body: { target_user_id: userId } });
      if (res.ok) {
        const conversation = await res.json();
        setActiveConversationId(conversation.id);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="New Chat">
        <div className="flex flex-col h-full -m-6">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800 bg-gray-900/50 p-2 gap-2">
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'contacts' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              onClick={() => setActiveTab('contacts')}
            >
              Contacts
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'search' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              onClick={() => setActiveTab('search')}
            >
              Search
            </button>
            <button 
              className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'requests' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              onClick={() => setActiveTab('requests')}
            >
              Requests
              {requests.length > 0 && (
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-4 flex-1 overflow-y-auto">
            
            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-gray-400">Your Contacts</span>
                  <button
                    onClick={() => setShowMyQr(true)}
                    className="text-xs text-[#00a884] font-semibold flex items-center gap-1 hover:underline"
                  >
                    <QrCode size={14} /> My QR Code
                  </button>
                </div>

                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                    <Users size={32} className="mb-3 opacity-50" />
                    <p>No contacts yet.</p>
                    <p className="text-sm mt-1">Search by @username or scan QR code to add them!</p>
                  </div>
                ) : (
                  contacts.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => startConversation(c.user_details.id)}
                      className="w-full flex items-center p-3 hover:bg-gray-800 rounded-xl transition text-left group"
                    >
                      <Avatar 
                        name={c.user_details.display_name || c.user_details.username} 
                        url={c.user_details.avatar} 
                        status={c.user_details.presence_status} 
                      />
                      <div className="ml-3 flex-1 overflow-hidden">
                        <p className="font-medium text-white truncate">{c.user_details.display_name || c.user_details.username}</p>
                        <p className="text-sm text-gray-400 truncate">{c.user_details.username ? `@${c.user_details.username}` : c.user_details.display_name}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Search by username..." 
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition text-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => setShowScanQr(true)}
                    className="px-3 py-2 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <QrCode size={16} /> Scan QR
                  </button>
                </div>
                
                <div className="space-y-2">
                  {isLoading ? (
                    <p className="text-center text-gray-500 py-4">Searching...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-xl">
                        <div className="flex items-center">
                          <Avatar name={u.display_name || u.username} url={u.avatar} status={u.presence_status} />
                          <div className="ml-3">
                            <p className="font-medium text-white">{u.display_name || u.username}</p>
                            <p className="text-sm text-gray-400">{u.username ? `@${u.username}` : u.display_name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSendRequest(u.id)}
                          className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                          title="Send Friend Request"
                        >
                          <UserPlus size={18} />
                        </button>
                      </div>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <p className="text-center text-gray-500 py-4">No users found with username "@{searchQuery}"</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-2">
                {requests.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No pending friend requests.</p>
                ) : (
                  requests.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-xl">
                      <div className="flex items-center">
                        <Avatar name={r.sender_details.display_name || r.sender_details.username} url={r.sender_details.avatar} status={r.sender_details.presence_status} />
                        <div className="ml-3">
                          <p className="font-medium text-white">{r.sender_details.display_name || r.sender_details.username}</p>
                          <p className="text-sm text-gray-400">{r.sender_details.username ? `@${r.sender_details.username}` : r.sender_details.display_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRespondRequest(r.id, 'accept')}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                          title="Accept"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleRespondRequest(r.id, 'reject')}
                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                          title="Reject"
                        >
                          <CloseIcon size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </Modal>

      <MyQrCodeModal isOpen={showMyQr} onClose={() => setShowMyQr(false)} />
      <ScanQrModal isOpen={showScanQr} onClose={() => setShowScanQr(false)} onSuccess={() => fetchContacts()} />
    </>
  );
};
