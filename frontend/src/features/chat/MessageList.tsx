import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageBubble } from './MessageBubble';
import { useRealtimeStore } from '../../realtime/store';
import { apiClient } from '../../lib/api';
import { decodeCiphertext, decryptMessageText } from '../../utils/cryptoUtils';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const MessageList: React.FC = () => {
  const messagesRecord = useChatStore(state => state.messages);
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const remoteTyping = useRealtimeStore(state => state.remoteTyping);
  const userId = useAuthStore(state => state.user?.id);
  const scrollToMessageId = useChatStore(state => state.scrollToMessageId);
  
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

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

  // Handle scroll-to-message from search
  useEffect(() => {
    if (!scrollToMessageId || messages.length === 0) return;
    const idx = messages.findIndex(m => m.id === scrollToMessageId);
    if (idx >= 0) {
      virtuosoRef.current?.scrollToIndex({ index: idx, align: 'center', behavior: 'smooth' });
      setHighlightedMessageId(scrollToMessageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
    useChatStore.getState().setScrollToMessageId(null);
  }, [scrollToMessageId, messages]);

  useEffect(() => {
    if (!activeConversationId) return;
    setHasMoreMessages(true);
    setNextCursor(null);
    
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
          msgs.forEach(async (msg: any) => {
            const media_attachments = (msg.attachments || []).map((att: any) => ({
              id: att.id,
              url: att.url || (att.s3_key?.startsWith('http') ? att.s3_key : `${BASE_URL}/media/${att.s3_key}`),
              mime_type: att.mime_type,
              original_filename: att.original_filename,
              type: att.mime_type || (att.s3_key ? att.s3_key.split('.').pop() : 'file'),
              media_key: undefined
            }));

            const decrypted_text = await decryptMessageText(msg);

            upsertMessage({
              ...msg,
              conversation_id: msg.conversation || msg.conversation_id,
              sender_id: msg.sender?.id || msg.sender_id,
              decrypted_text,
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

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversationId || isLoadingMore || !hasMoreMessages) return;
    setIsLoadingMore(true);
    try {
      let url = `/api/chat/messages/?conversation_id=${activeConversationId}&limit=30`;
      if (nextCursor) {
        url += `&cursor=${nextCursor}`;
      } else if (messages.length > 0) {
        // Use the oldest message timestamp as cursor
        url += `&before=${messages[0].created_at}`;
      }
      const res = await apiClient(url);
      if (res.ok) {
        const data = await res.json();
        const msgs = data.results || [];
        if (msgs.length === 0) {
          setHasMoreMessages(false);
        } else {
          const upsertMessage = useChatStore.getState().upsertMessage;
          msgs.forEach((msg: any) => {
            const media_attachments = (msg.attachments || []).map((att: any) => ({
              id: att.id,
              url: `${BASE_URL}/media/${att.s3_key}`,
              type: 'image',
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
          setNextCursor(data.next_cursor || null);
          if (!data.next_cursor && msgs.length < 30) {
            setHasMoreMessages(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load more messages', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeConversationId, isLoadingMore, hasMoreMessages, nextCursor, messages]);

  if (!activeConversationId) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>;
  }

  return (
    <div 
      className="flex-1 overflow-hidden px-[12px] md:px-[6%] lg:px-[15%] flex flex-col bg-[#0b141a] relative"
      style={{
        backgroundColor: 'var(--chat-bg-color, #0b141a)',
        backgroundImage: 'var(--chat-wallpaper, url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"))',
        backgroundRepeat: 'repeat',
        backgroundSize: '200px',
        backgroundBlendMode: 'overlay'
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        className="flex-1 w-full h-full"
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        atBottomStateChange={(atBottom) => setShowScrollBottom(!atBottom)}
        startReached={loadMoreMessages}
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
            <div className={`px-[5px] py-[1px] flex flex-col ${highlightedMessageId === msg.id ? 'bg-[#00a884]/10 transition-all duration-500' : ''}`}>
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
          Header: () => isLoadingMore ? (
            <div className="flex justify-center py-3">
              <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasMoreMessages && messages.length > 0 ? (
            <div className="flex justify-center py-3">
              <span className="bg-[#182229] text-[#8696a0] text-[12px] px-3 py-1 rounded-lg">Beginning of conversation</span>
            </div>
          ) : null,
          Footer: () => remoteTyping ? (
            <div className="self-start mb-4 bg-[#202c33] text-[#00a884] px-4 py-2 rounded-lg rounded-tl-none text-[14px] font-medium animate-pulse w-max mt-2">
              typing...
            </div>
          ) : null
        }}
      />

      {/* Floating Jump to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' })}
          className="absolute bottom-4 right-4 bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] p-2.5 rounded-full shadow-xl border border-[#222d34] transition-all duration-200 z-30 flex items-center justify-center group"
          title="Scroll to latest messages"
        >
          <ChevronDown size={22} className="group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
