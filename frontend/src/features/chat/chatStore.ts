import { create } from 'zustand';

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
  upsertMessage: (msg: ChatMessage) => void;
  removeMessage: (id: string) => void;
  enqueueMessage: (msg: ChatMessage) => void;
  removeFromOutbox: (id: string) => void;
  updateMessageStatus: (id: string, status: ChatMessage['status'], sequence?: number) => void;
  updateMessageReactions: (messageId: string, userId: string, reaction: string | null) => void;
  setDraft: (conversationId: string, text: string) => void;
  toggleRightPanel: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  activeConversationId: null,
  conversations: [],
  outbox: [],
  selectedMessageIds: [],
  bookmarkedMessageIds: [],
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
  setConversations: (convs) => set({ conversations: convs }),
  
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
  
  upsertMessage: (msg) => set((state) => ({
    messages: {
      ...state.messages,
      [msg.id]: { ...state.messages[msg.id], ...msg }
    }
  })),
  
  removeMessage: (id) => set((state) => {
    const newMessages = { ...state.messages };
    delete newMessages[id];
    return { messages: newMessages };
  }),
  
  enqueueMessage: (msg) => set((state) => ({
    outbox: [...state.outbox, msg],
    messages: { ...state.messages, [msg.id]: msg }
  })),
  
  removeFromOutbox: (id) => set((state) => ({
    outbox: state.outbox.filter(m => m.id !== id)
  })),

  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  
  updateMessageStatus: (id, status, sequence) => set((state) => {
    const msg = state.messages[id];
    if (!msg) return state;
    
    return {
      messages: {
        ...state.messages,
        [id]: { 
          ...msg, 
          status, 
          sequence_number: sequence ?? msg.sequence_number 
        }
      }
    };
  }),

  updateMessageReactions: (messageId, userId, reaction) => set((state) => {
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
  })
}));
