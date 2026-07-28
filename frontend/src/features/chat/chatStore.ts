import { create } from 'zustand';
import { offlineDB } from '../../store/offlineStore';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sequence_number?: number;
  sender_id: string;
  ciphertext: string;
  nonce: string;
  signature: string;
  key_version: number;
  algorithm: string;
  created_at: string;
  is_edited: boolean;
  deleted_at: string | null;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'expired';
  decrypted_text?: string; // Stored only in memory!
  media_attachments?: Array<{ id: string, url: string, type: string, media_key?: string }>;
  reply_to?: string | null;
  reactions?: Array<{ user: string, reaction_ciphertext: string, reaction_plaintext?: string }>;
}

interface ChatState {
  messages: Record<string, ChatMessage>;
  activeConversationId: string | null;
  outbox: ChatMessage[];
  selectedMessageIds: string[];
  bookmarkedMessageIds: string[];
  pinnedMessageIds: string[];
  starredMessageIds: string[];
  conversations: any[];
  drafts: Record<string, string>;
  isRightPanelOpen: boolean;
  replyingTo: string | null;
  forwardingMessageIds: string[];
  editingMessageId: string | null;
  scrollToMessageId: string | null;
  
  setActiveConversation: (id: string | null) => void;
  setScrollToMessageId: (id: string | null) => void;
  setReplyingTo: (id: string | null) => void;
  setForwardingMessageIds: (ids: string[]) => void;
  setEditingMessageId: (id: string | null) => void;
  setConversations: (convs: any[]) => void;
  toggleMessageSelection: (id: string) => void;
  clearSelection: () => void;
  toggleBookmark: (id: string) => void;
  togglePin: (id: string) => void;
  toggleStar: (id: string) => void;
  upsertMessage: (msg: ChatMessage) => void;
  removeMessage: (id: string) => void;
  enqueueMessage: (msg: ChatMessage) => void;
  removeFromOutbox: (id: string) => void;
  updateMessageStatus: (id: string, status: ChatMessage['status'], sequence?: number) => void;
  updateMessageReactions: (messageId: string, userId: string, reaction: string | null) => void;
  setDraft: (conversationId: string, text: string) => void;
  toggleRightPanel: () => void;
  hydrateFromOfflineStore: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  activeConversationId: null,
  conversations: [],
  outbox: [],
  selectedMessageIds: [],
  bookmarkedMessageIds: [],
  pinnedMessageIds: [],
  starredMessageIds: [],
  drafts: {},
  isRightPanelOpen: false,
  replyingTo: null,
  forwardingMessageIds: [],
  editingMessageId: null,
  scrollToMessageId: null,
  
  setActiveConversation: (id) => set({ activeConversationId: id, selectedMessageIds: [], isRightPanelOpen: false, replyingTo: null, editingMessageId: null }),
  setScrollToMessageId: (id) => set({ scrollToMessageId: id }),
  setReplyingTo: (id) => set({ replyingTo: id }),
  setForwardingMessageIds: (ids) => set({ forwardingMessageIds: ids }),
  setEditingMessageId: (id) => set({ editingMessageId: id }),
  setConversations: (convs) => {
    set({ conversations: convs });
    // Persist conversations to IDB asynchronously
    offlineDB.cacheConversations(convs.map(c => ({
      id: c.id,
      isDirect: c.is_direct || c.isDirect || false,
      members: c.members || [],
      lastMessagePreview: c.last_message_preview || '',
      lastActivity: c.last_activity || new Date().toISOString(),
      unreadCount: c.unread_count || 0,
      isPinned: c.is_pinned || false,
      isMuted: c.is_muted || false,
      isArchived: c.is_archived || false
    }))).catch(console.error);
  },
  
  toggleMessageSelection: (id) => set((state) => ({
    selectedMessageIds: state.selectedMessageIds.includes(id) 
      ? state.selectedMessageIds.filter(x => x !== id) 
      : [...state.selectedMessageIds, id]
  })),
  
  clearSelection: () => set({ selectedMessageIds: [] }),
  
  toggleBookmark: (id) => set((state) => ({
    bookmarkedMessageIds: state.bookmarkedMessageIds.includes(id)
      ? state.bookmarkedMessageIds.filter(x => x !== id)
      : [...state.bookmarkedMessageIds, id]
  })),

  togglePin: (id) => set((state) => ({
    pinnedMessageIds: state.pinnedMessageIds.includes(id)
      ? state.pinnedMessageIds.filter(x => x !== id)
      : [...state.pinnedMessageIds, id]
  })),

  toggleStar: (id) => set((state) => ({
    starredMessageIds: state.starredMessageIds.includes(id)
      ? state.starredMessageIds.filter(x => x !== id)
      : [...state.starredMessageIds, id]
  })),
  
  upsertMessage: (msg) => {
    set((state) => {
      const updated = { ...state.messages[msg.id], ...msg };
      return {
        messages: {
          ...state.messages,
          [msg.id]: updated
        }
      };
    });
    // Persist message to IndexedDB
    offlineDB.cacheMessage({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      ciphertext: msg.ciphertext,
      decryptedText: msg.decrypted_text || '',
      status: msg.status,
      createdAt: msg.created_at,
      sequenceNumber: msg.sequence_number,
      isEdited: msg.is_edited,
      deletedAt: msg.deleted_at,
      replyTo: msg.reply_to || null,
      mediaAttachments: msg.media_attachments || [],
      reactions: msg.reactions || []
    }).catch(console.error);
  },
  
  removeMessage: (id) => {
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[id];
      return { messages: newMessages };
    });
    offlineDB.deleteMessage(id).catch(console.error);
  },
  
  enqueueMessage: (msg) => {
    set((state) => ({
      outbox: [...state.outbox, msg],
      messages: { ...state.messages, [msg.id]: msg }
    }));
    // Persist to IDB message cache and outbox
    offlineDB.enqueueOutbox({
      id: msg.id,
      conversationId: msg.conversation_id,
      ciphertext: msg.ciphertext,
      nonce: msg.nonce,
      signature: msg.signature,
      keyVersion: msg.key_version,
      algorithm: msg.algorithm,
      createdAt: msg.created_at,
      replyToId: msg.reply_to || null,
      mediaId: msg.media_attachments?.[0]?.id || null,
      mediaKey: msg.media_attachments?.[0]?.media_key || null,
      retryCount: 0,
      lastRetryAt: Date.now()
    }).catch(console.error);
  },
  
  removeFromOutbox: (id) => {
    set((state) => ({
      outbox: state.outbox.filter(m => m.id !== id)
    }));
    offlineDB.removeFromOutbox(id).catch(console.error);
  },

  setDraft: (conversationId, text) => {
    set((state) => ({
      drafts: { ...state.drafts, [conversationId]: text }
    }));
    if (text.trim()) {
      offlineDB.saveDraft({ conversationId, text, updatedAt: Date.now() }).catch(console.error);
    } else {
      offlineDB.deleteDraft(conversationId).catch(console.error);
    }
  },

  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  
  updateMessageStatus: (id, status, sequence) => {
    set((state) => {
      const msg = state.messages[id];
      if (!msg) return state;
      
      const updated = { 
        ...msg, 
        status, 
        sequence_number: sequence ?? msg.sequence_number 
      };
      
      return {
        messages: {
          ...state.messages,
          [id]: updated
        }
      };
    });
  },

  updateMessageReactions: (messageId, userId, reaction) => {
    set((state) => {
      const msg = state.messages[messageId];
      if (!msg) return state;

      let newReactions = msg.reactions ? [...msg.reactions] : [];
      if (reaction === null) {
        newReactions = newReactions.filter(r => r.user !== userId);
      } else {
        const reaction_ciphertext = btoa(unescape(encodeURIComponent(reaction)));
        const existingIdx = newReactions.findIndex(r => r.user === userId);
        if (existingIdx >= 0) {
          newReactions[existingIdx] = { user: userId, reaction_ciphertext, reaction_plaintext: reaction };
        } else {
          newReactions.push({ user: userId, reaction_ciphertext, reaction_plaintext: reaction });
        }
      }

      return {
        messages: {
          ...state.messages,
          [messageId]: { ...msg, reactions: newReactions }
        }
      };
    });
  },

  hydrateFromOfflineStore: async () => {
    try {
      const [cachedConvs, cachedDrafts, outboxMsgs] = await Promise.all([
        offlineDB.getAllConversations(),
        offlineDB.getAllDrafts(),
        offlineDB.getOutboxMessages()
      ]);

      const draftsMap: Record<string, string> = {};
      cachedDrafts.forEach(d => { draftsMap[d.conversationId] = d.text; });

      set({
        conversations: cachedConvs,
        drafts: draftsMap,
        outbox: outboxMsgs.map(m => ({
          id: m.id,
          conversation_id: m.conversationId,
          sender_id: '',
          ciphertext: m.ciphertext,
          nonce: m.nonce,
          signature: m.signature,
          key_version: m.keyVersion,
          algorithm: m.algorithm,
          created_at: m.createdAt,
          is_edited: false,
          deleted_at: null,
          status: 'queued',
          reply_to: m.replyToId
        }))
      });
    } catch (err) {
      console.error('Failed to hydrate from offline store:', err);
    }
  }
}));

