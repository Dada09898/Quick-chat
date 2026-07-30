import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';

// Placeholder for firebase initialization - assuming it's exported from a central firebase config
// import { messaging, onMessage } from '../../lib/firebase';

import { useChatStore } from '../chat/chatStore';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const conversations = useChatStore(state => state.conversations);

  const notifications = conversations
    .filter(c => (c.unread_count_cache || c.unread_count || 0) > 0)
    .map(c => ({
      id: c.id,
      message: `Unread messages in ${c.members?.find((m: any) => m.user)?.user?.display_name || 'Conversation'}`,
      is_read: false
    }));

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">You have no new notifications.</div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="p-4 border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition">
                  <p className="text-sm text-gray-300">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">Just now</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
