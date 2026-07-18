import React, { useEffect, useRef, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import { useChatStore } from './chatStore';
import { MessageBubble } from './MessageBubble';
import { useRealtimeStore } from '../../realtime/store';

export const MessageList: React.FC = () => {
  const messagesRecord = useChatStore(state => state.messages);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const remoteTyping = useRealtimeStore(state => state.remoteTyping);
  
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
                isOwn={msg.sender_id === 'me'} // Replace with actual user ID
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
