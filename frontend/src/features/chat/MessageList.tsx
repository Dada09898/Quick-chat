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
    <div className="flex-1 overflow-hidden p-4 flex flex-col bg-gray-950">
      <Virtuoso
        ref={virtuosoRef}
        className="flex-1 w-full h-full"
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        itemContent={(index, msg) => {
          // Virtuoso mounts this component only when entering the viewport.
          // This naturally triggers the `useEffect` inside MessageBubble for Lazy Decryption.
          return (
            <div className="py-1">
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
            <div className="self-start mb-4 bg-gray-800 text-gray-400 px-4 py-2 rounded-2xl rounded-bl-none text-sm animate-pulse w-max mt-2">
              Typing...
            </div>
          ) : null
        }}
      />
    </div>
  );
};
