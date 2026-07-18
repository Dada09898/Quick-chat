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
}

interface ChatState {
  messages: Record<string, ChatMessage>;
  activeConversationId: string | null;
  outbox: ChatMessage[];
  selectedMessageIds: string[];
  bookmarkedMessageIds: string[];
  conversations: any[];
  
  setActiveConversation: (id: string | null) => void;
  setConversations: (convs: any[]) => void;
  toggleMessageSelection: (id: string) => void;
  clearSelection: () => void;
  toggleBookmark: (id: string) => void;
  upsertMessage: (msg: ChatMessage) => void;
  removeMessage: (id: string) => void;
  enqueueMessage: (msg: ChatMessage) => void;
  removeFromOutbox: (id: string) => void;
  updateMessageStatus: (id: string, status: ChatMessage['status'], sequence?: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  activeConversationId: null,
  conversations: [],
  outbox: [],
  selectedMessageIds: [],
  bookmarkedMessageIds: [],
  
  setActiveConversation: (id) => set({ activeConversationId: id, selectedMessageIds: [] }),
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
  })
}));
