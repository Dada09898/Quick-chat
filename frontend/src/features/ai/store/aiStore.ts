import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PermissionScope = 'ONE_TIME' | 'SESSION' | 'PERSISTENT';

export interface AIPermission {
  id: string;
  targetType: 'CHAT' | 'VAULT_FOLDER' | 'VAULT_ITEM';
  scope: PermissionScope;
  grantedAt: number;
}

interface AIStore {
  activeProviderId: string;
  providerModel: string;
  permissions: Record<string, AIPermission>;
  apiKeys: Record<string, string>;

  setActiveProvider: (id: string, model: string) => void;
  setApiKey: (providerId: string, key: string) => void;
  grantPermission: (permission: AIPermission) => void;
  revokePermission: (targetId: string) => void;
  hasPermission: (targetId: string) => boolean;
  clearSessionPermissions: () => void;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      activeProviderId: 'ollama',
      providerModel: 'llama3',
      permissions: {},
      apiKeys: {},

      setActiveProvider: (id, model) => set({ activeProviderId: id, providerModel: model }),
      setApiKey: (providerId, key) => set((state) => ({ apiKeys: { ...state.apiKeys, [providerId]: key } })),

      grantPermission: (permission) => set((state) => ({
        permissions: { ...state.permissions, [permission.id]: permission }
      })),

      revokePermission: (targetId) => set((state) => {
        const newPerms = { ...state.permissions };
        delete newPerms[targetId];
        return { permissions: newPerms };
      }),

      hasPermission: (targetId) => !!get().permissions[targetId],

      clearSessionPermissions: () => set((state) => {
        const persistentOnly = Object.entries(state.permissions).filter(([, p]) => p.scope === 'PERSISTENT');
        return { permissions: Object.fromEntries(persistentOnly) };
      })
    }),
    { name: 'ai-store' }
  )
);
