import React, { useEffect, useRef, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageBubble } from './MessageBubble';
import { useRealtimeStore } from '../../realtime/store';
import { apiClient } from '../../lib/api';
import { decodeCiphertext } from '../../realtime/socket';

export const MessageList: React.FC = () => {
  const messagesRecord = useChatStore(state => state.messages);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const remoteTyping = useRealtimeStore(state => state.remoteTyping);
  const userId = useAuthStore(state => state.user?.id);
  
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  
  // Memoize sorted messages for 60fps performance (essential for 100k+ messages)
  const messages = useMemo(() => {
    return Object.values(messagesRecord)
      .filter(m => m.conversation_id === activeConversationId)
      .sort((a, b) => {
        if (a.sequence_number && b.sequence_number) {
           return a.sequence_number - b.sequence_number;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [messagesRecord, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    
    // Fetch initial history for conversation
    const fetchHistory = async () => {
      try {
        const res = await apiClient(`/api/chat/messages/?conversation_id=${activeConversationId}`);
        if (res.ok) {
          const data = await res.json();
          // Assuming the API returns a paginated list in data.results
          const msgs = data.results || [];
          // Need to upsert them into the store
          const upsertMessage = useChatStore.getState().upsertMessage;
          msgs.forEach((msg: any) => {
            const media_attachments = (msg.attachments || []).map((att: any) => ({
              id: att.id,
              url: `http://localhost:8000/media/${att.s3_key}`,
              type: 'image', // Basic fallback
              media_key: undefined
            }));

            upsertMessage({
              ...msg,
              conversation_id: msg.conversation || msg.conversation_id,
              sender_id: msg.sender?.id || msg.sender_id,
              decrypted_text: decodeCiphertext(msg.ciphertext),
              status: msg.status || 'delivered',
              media_attachments
            });
          });
        }
      } catch (err) {
        console.error("Failed to fetch message history", err);
      }
    };
    
    // Check if we need to fetch (e.g. if we have 0 messages for this conv)
    const existingCount = Object.values(useChatStore.getState().messages).filter(m => m.conversation_id === activeConversationId).length;
    if (existingCount === 0) {
      fetchHistory();
    }
  }, [activeConversationId]);

  useEffect(() => {
    // Scroll to bottom when a new message arrives (if already at bottom)
    if (messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' });
    }
  }, [messages.length, remoteTyping]);

  if (!activeConversationId) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>;
  }

  return (
    <div 
      className="flex-1 overflow-hidden p-4 flex flex-col bg-[#0b141a] relative"
      style={{
        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
        backgroundRepeat: 'repeat',
        backgroundSize: '400px',
        backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(11, 20, 26, 0.95)'
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        className="flex-1 w-full h-full"
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        itemContent={(index, msg) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          let showDateSeparator = false;
          let dateText = '';
          
          if (!prevMsg) {
            showDateSeparator = true;
          } else {
            const prevDate = new Date(prevMsg.created_at).toDateString();
            const currDate = new Date(msg.created_at).toDateString();
            if (prevDate !== currDate) {
              showDateSeparator = true;
            }
          }
          
          if (showDateSeparator) {
            const date = new Date(msg.created_at);
            const today = new Date();
            const yest = new Date();
            yest.setDate(yest.getDate() - 1);
            if (date.toDateString() === today.toDateString()) {
              dateText = 'TODAY';
            } else if (date.toDateString() === yest.toDateString()) {
              dateText = 'YESTERDAY';
            } else {
              dateText = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
            }
          }

          return (
            <div className="py-1 flex flex-col">
              {showDateSeparator && (
                <div className="flex justify-center my-2.5">
                  <span className="bg-[#182229] text-[#8696a0] text-[12.5px] px-3 py-1 rounded-lg shadow-sm font-medium">
                    {dateText}
                  </span>
                </div>
              )}
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isOwn={msg.sender_id === userId}
              />
            </div>
          );
        }}
        components={{
          Footer: () => remoteTyping ? (
            <div className="self-start mb-4 bg-[#202c33] text-[#00a884] px-4 py-2 rounded-lg rounded-tl-none text-[14px] font-medium animate-pulse w-max mt-2">
              typing...
            </div>
          ) : null
        }}
      />
    </div>
  );
};
