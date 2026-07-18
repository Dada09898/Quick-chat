import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';

// Placeholder for firebase initialization - assuming it's exported from a central firebase config
// import { messaging, onMessage } from '../../lib/firebase';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Scaffold for foreground notifications
    // onMessage(messaging, (payload) => {
    //   toast.success(`New Message: ${payload.notification?.title}`);
    //   setNotifications(prev => [{ id: Date.now(), message: payload.notification?.body, is_read: false }, ...prev]);
    // });
    
    // Using a mock event listener since actual firebase isn't fully initialized here
    const handleForegroundPush = (e: any) => {
       const payload = e.detail;
       toast.success(`New Message: ${payload.title}`);
       setNotifications(prev => [{ id: Date.now(), message: payload.body, is_read: false }, ...prev]);
    };
    window.addEventListener('fcm-foreground-msg', handleForegroundPush);
    return () => window.removeEventListener('fcm-foreground-msg', handleForegroundPush);
  }, []);

  // Placeholder for real notification fetching
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
