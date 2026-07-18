import { create } from 'zustand';
import { VaultCryptoEngine } from './crypto';

export type VaultItemType = 'PASSWORD' | 'NOTE' | 'DOCUMENT' | 'API_KEY' | 'SSH_KEY' | 'IDENTITY' | 'BANK_CARD' | 'LICENSE' | 'CERTIFICATE' | 'CUSTOM' | 'FILE';

export interface VaultItem {
  id: string;
  item_type: VaultItemType;
  folder_id: string | null;
  ciphertext: string;
  wrapped_key: string;
  key_version: number;
  sync_version: number;
  version: number;
  is_deleted: boolean;
  
  // Decrypted payload (only exists securely in memory, never persisted locally unencrypted)
  decryptedData?: any; 
}

interface VaultStore {
  items: VaultItem[];
  isLocked: boolean;
  lastActive: number;
  
  setItems: (items: VaultItem[]) => void;
  addItem: (item: VaultItem) => void;
  updateItem: (item: VaultItem) => void;
  
  unlock: (masterKey: CryptoKey) => Promise<boolean>;
  lock: () => void;
  pingActivity: () => void;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  items: [],
  isLocked: true, // Auto-locks by default
  lastActive: Date.now(),
  
  setItems: (items) => set({ items }),
  
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  
  updateItem: (item) => set((state) => ({
    items: state.items.map(i => i.id === item.id ? item : i)
  })),

  unlock: async (masterKey) => {
    try {
      const state = get();
      const decryptedItems = await Promise.all(state.items.map(async (item) => {
        try {
          const dek = await VaultCryptoEngine.unwrapDEK(item.wrapped_key, masterKey);
          item.decryptedData = await VaultCryptoEngine.decryptPayload(item.ciphertext, dek);
          return item;
        } catch (e) {
          console.error("Failed to decrypt vault item:", item.id);
          return item;
        }
      }));
      set({ items: decryptedItems, isLocked: false, lastActive: Date.now() });
      return true;
    } catch (e) {
      return false;
    }
  },

  lock: () => set((state) => ({
    isLocked: true,
    // Scrub decrypted data from memory
    items: state.items.map(item => ({ ...item, decryptedData: undefined }))
  })),
  
  pingActivity: () => set({ lastActive: Date.now() })
}));

// Inactivity Auto-Lock Watchdog (locks after 5 minutes)
setInterval(() => {
  const store = useVaultStore.getState();
  if (!store.isLocked && Date.now() - store.lastActive > 5 * 60 * 1000) {
    store.lock();
  }
}, 30000);
