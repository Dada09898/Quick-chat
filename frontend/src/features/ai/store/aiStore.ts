import { create } from 'zustand';

export type PermissionScope = 'ONE_TIME' | 'SESSION' | 'PERSISTENT';

export interface AIPermission {
  id: string; // e.g., 'vault_folder_123', 'chat_456'
  targetType: 'CHAT' | 'VAULT_FOLDER' | 'VAULT_ITEM';
  scope: PermissionScope;
  grantedAt: number;
}

interface AIStore {
  activeProviderId: string;
  providerModel: string;
  permissions: Record<string, AIPermission>; // key is target id
  
  // Vault-encrypted JSON string storing API keys (to comply with constraint #3)
  encryptedApiKeysBlob: string | null; 
  
  setActiveProvider: (id: string, model: string) => void;
  grantPermission: (permission: AIPermission) => void;
  revokePermission: (targetId: string) => void;
  hasPermission: (targetId: string) => boolean;
  clearSessionPermissions: () => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  activeProviderId: 'ollama',
  providerModel: 'llama3',
  permissions: {},
  encryptedApiKeysBlob: null,

  setActiveProvider: (id, model) => set({ activeProviderId: id, providerModel: model }),

  grantPermission: (permission) => set((state) => ({
    permissions: { ...state.permissions, [permission.id]: permission }
  })),

  revokePermission: (targetId) => set((state) => {
    const newPerms = { ...state.permissions };
    delete newPerms[targetId];
    return { permissions: newPerms };
  }),

  hasPermission: (targetId) => {
    const perm = get().permissions[targetId];
    if (!perm) return false;
    // Note: Session and One-Time scopes would be rigorously checked here.
    // For simplicity, existence implies granted for this session.
    return true;
  },

  clearSessionPermissions: () => set((state) => {
    const persistentOnly = Object.entries(state.permissions).filter(
      ([, p]) => p.scope === 'PERSISTENT'
    );
    return { permissions: Object.fromEntries(persistentOnly) };
  })
}));
