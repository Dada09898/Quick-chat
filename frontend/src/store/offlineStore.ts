import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

/** Represents a cached message in IndexedDB. */
export interface CachedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  ciphertext: string;
  decryptedText: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  sequenceNumber?: number;
  isEdited: boolean;
  deletedAt: string | null;
  replyTo: string | null;
  mediaAttachments: Array<{ id: string; url: string; type: string; mediaKey?: string }>;
  reactions: Array<{ user: string; reactionCiphertext: string; reactionPlaintext?: string }>;
}

/** Represents a message queued for sending while offline. */
export interface OutboxMessage {
  id: string;
  conversationId: string;
  ciphertext: string;
  nonce: string;
  signature: string;
  keyVersion: number;
  algorithm: string;
  createdAt: string;
  replyToId: string | null;
  mediaId: string | null;
  mediaKey: string | null;
  retryCount: number;
  lastRetryAt: number;
}

/** Represents a cached conversation. */
export interface CachedConversation {
  id: string;
  isDirect: boolean;
  members: Array<{
    userId: string;
    displayName: string;
    username: string;
    email: string;
    avatar: string | null;
    role: string;
  }>;
  lastMessagePreview: string;
  lastActivity: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
}

/** Represents a cached draft. */
export interface CachedDraft {
  conversationId: string;
  text: string;
  updatedAt: number;
}

/** Represents a cached media blob. */
export interface CachedMedia {
  id: string;
  url: string;
  blob: Blob;
  type: string;
  cachedAt: number;
  expiresAt: number;
}

interface OfflineDB extends DBSchema {
  messages: {
    key: string;
    value: CachedMessage;
    indexes: {
      'by-conversation': string;
      'by-created': string;
    };
  };
  outbox: {
    key: string;
    value: OutboxMessage;
    indexes: {
      'by-conversation': string;
      'by-retry': number;
    };
  };
  conversations: {
    key: string;
    value: CachedConversation;
    indexes: {
      'by-activity': string;
    };
  };
  drafts: {
    key: string;
    value: CachedDraft;
  };
  media: {
    key: string;
    value: CachedMedia;
    indexes: {
      'by-expiry': number;
    };
  };
}

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

async function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<OfflineDB>('quick-chat-offline', 1, {
    upgrade(db) {
      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('by-conversation', 'conversationId');
        msgStore.createIndex('by-created', 'createdAt');
      }
      // Outbox store
      if (!db.objectStoreNames.contains('outbox')) {
        const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
        outboxStore.createIndex('by-conversation', 'conversationId');
        outboxStore.createIndex('by-retry', 'retryCount');
      }
      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('by-activity', 'lastActivity');
      }
      // Drafts store
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'conversationId' });
      }
      // Media cache store
      if (!db.objectStoreNames.contains('media')) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
        mediaStore.createIndex('by-expiry', 'expiresAt');
      }
    }
  });
  return dbInstance;
}

export const offlineDB = {
  // ===== MESSAGES =====
  async cacheMessage(msg: CachedMessage): Promise<void> {
    const db = await getOfflineDB();
    await db.put('messages', msg);
  },

  async cacheMessages(msgs: CachedMessage[]): Promise<void> {
    const db = await getOfflineDB();
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all([
      ...msgs.map(m => tx.store.put(m)),
      tx.done
    ]);
  },

  async getMessagesForConversation(conversationId: string): Promise<CachedMessage[]> {
    const db = await getOfflineDB();
    return db.getAllFromIndex('messages', 'by-conversation', conversationId);
  },

  async getMessage(id: string): Promise<CachedMessage | undefined> {
    const db = await getOfflineDB();
    return db.get('messages', id);
  },

  async deleteMessage(id: string): Promise<void> {
    const db = await getOfflineDB();
    await db.delete('messages', id);
  },

  // ===== OUTBOX =====
  async enqueueOutbox(msg: OutboxMessage): Promise<void> {
    const db = await getOfflineDB();
    await db.put('outbox', msg);
  },

  async getOutboxMessages(): Promise<OutboxMessage[]> {
    const db = await getOfflineDB();
    return db.getAll('outbox');
  },

  async removeFromOutbox(id: string): Promise<void> {
    const db = await getOfflineDB();
    await db.delete('outbox', id);
  },

  async updateOutboxRetry(id: string): Promise<void> {
    const db = await getOfflineDB();
    const msg = await db.get('outbox', id);
    if (msg) {
      msg.retryCount += 1;
      msg.lastRetryAt = Date.now();
      await db.put('outbox', msg);
    }
  },

  async clearOutbox(): Promise<void> {
    const db = await getOfflineDB();
    await db.clear('outbox');
  },

  // ===== CONVERSATIONS =====
  async cacheConversation(conv: CachedConversation): Promise<void> {
    const db = await getOfflineDB();
    await db.put('conversations', conv);
  },

  async cacheConversations(convs: CachedConversation[]): Promise<void> {
    const db = await getOfflineDB();
    const tx = db.transaction('conversations', 'readwrite');
    await Promise.all([
      ...convs.map(c => tx.store.put(c)),
      tx.done
    ]);
  },

  async getAllConversations(): Promise<CachedConversation[]> {
    const db = await getOfflineDB();
    return db.getAll('conversations');
  },

  async getConversation(id: string): Promise<CachedConversation | undefined> {
    const db = await getOfflineDB();
    return db.get('conversations', id);
  },

  // ===== DRAFTS =====
  async saveDraft(draft: CachedDraft): Promise<void> {
    const db = await getOfflineDB();
    await db.put('drafts', draft);
  },

  async getDraft(conversationId: string): Promise<CachedDraft | undefined> {
    const db = await getOfflineDB();
    return db.get('drafts', conversationId);
  },

  async deleteDraft(conversationId: string): Promise<void> {
    const db = await getOfflineDB();
    await db.delete('drafts', conversationId);
  },

  async getAllDrafts(): Promise<CachedDraft[]> {
    const db = await getOfflineDB();
    return db.getAll('drafts');
  },

  // ===== MEDIA CACHE =====
  async cacheMedia(media: CachedMedia): Promise<void> {
    const db = await getOfflineDB();
    await db.put('media', media);
  },

  async getCachedMedia(id: string): Promise<CachedMedia | undefined> {
    const db = await getOfflineDB();
    return db.get('media', id);
  },

  async evictExpiredMedia(): Promise<number> {
    const db = await getOfflineDB();
    const now = Date.now();
    const tx = db.transaction('media', 'readwrite');
    const index = tx.store.index('by-expiry');
    let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
    let evicted = 0;
    while (cursor) {
      await cursor.delete();
      evicted++;
      cursor = await cursor.continue();
    }
    await tx.done;
    return evicted;
  },

  // ===== UTILITY =====
  async clearAll(): Promise<void> {
    const db = await getOfflineDB();
    await Promise.all([
      db.clear('messages'),
      db.clear('outbox'),
      db.clear('conversations'),
      db.clear('drafts'),
      db.clear('media')
    ]);
  }
};
