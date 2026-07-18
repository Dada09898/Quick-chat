import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatDBSchema extends DBSchema {
  conversations: {
    key: string;
    value: {
      id: string;
      version: number;
      last_activity: string;
      unread_count: number;
      metadata_ciphertext: string; // encrypted
      updated_at: string;
    };
    indexes: { 'by-activity': string };
  };
  messages: {
    key: string; // id
    value: {
      id: string;
      conversation_id: string;
      sequence_number: number;
      sender_id: string;
      ciphertext: string; // encrypted payload
      nonce: string;
      signature: string;
      key_version: number;
      algorithm: string;
      created_at: string;
      status: string;
    };
    indexes: {
      'by-conversation': string;
      'by-sequence': number;
      'by-conversation-sequence': [string, number];
    };
  };
  media: {
    key: string;
    value: {
      id: string;
      blob_ciphertext: Blob; // strictly encrypted
      created_at: number;
    };
  };
  thumbnails: {
    key: string;
    value: {
      id: string;
      blob_ciphertext: Blob;
      created_at: number;
    };
  };
  search: {
    key: string; // keyword hash
    value: {
      keyword_hash: string;
      message_ids: string[]; // Set of message UUIDs containing this hashed keyword
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDBSchema>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDBSchema>('dualconnect-encrypted-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('by-activity', 'last_activity');
        }
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-conversation', 'conversation_id');
          msgStore.createIndex('by-sequence', 'sequence_number');
          msgStore.createIndex('by-conversation-sequence', ['conversation_id', 'sequence_number']);
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('thumbnails')) {
          db.createObjectStore('thumbnails', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('search')) {
          db.createObjectStore('search', { keyPath: 'keyword_hash' });
        }
      },
    });
  }
  return dbPromise;
}

export async function clearCache() {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages', 'media', 'thumbnails', 'search'], 'readwrite');
  await Promise.all([
    tx.objectStore('conversations').clear(),
    tx.objectStore('messages').clear(),
    tx.objectStore('media').clear(),
    tx.objectStore('thumbnails').clear(),
    tx.objectStore('search').clear(),
    tx.done
  ]);
}
