import { create } from 'zustand';
import { apiJson } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export interface StatusViewerRecord {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: number;
}

export type StatusPrivacySetting = 'contacts' | 'except' | 'only';
export type StatusFontFamily = 'sans-serif' | 'serif' | 'monospace' | 'cursive' | 'impact';

export interface StatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'image' | 'video' | 'text' | 'audio';
  content: string; // Image/video URL or text content or audio URL
  caption?: string;
  backgroundColor?: string; // For text status
  fontFamily?: StatusFontFamily; // For text status
  createdAt: number; // Timestamp
  expiresAt: number; // 24h later
  isViewed?: boolean;
  views?: StatusViewerRecord[]; // List of users who viewed this status
  privacy?: StatusPrivacySetting;
  privacyExcludedUserIds?: string[];
  privacyIncludedUserIds?: string[];
}

export interface UserStatusGroup {
  userId: string;
  userName: string;
  userAvatar?: string;
  statuses: StatusItem[];
  hasUnviewed: boolean;
  lastUpdated: number;
}

interface StatusState {
  myStatuses: StatusItem[];
  contactStatusGroups: UserStatusGroup[];
  activeViewerGroup: UserStatusGroup | null;
  activeViewerIndex: number;
  isCreateModalOpen: boolean;
  isPrivacyModalOpen: boolean;
  viewersModalStatusId: string | null;
  mutedUserIds: string[];
  isLoading: boolean;
  
  // Privacy configuration
  statusPrivacy: StatusPrivacySetting;
  excludedUserIds: string[];
  includedUserIds: string[];

  // Actions
  fetchStatuses: () => Promise<void>;
  addStatus: (status: Omit<StatusItem, 'id' | 'createdAt' | 'expiresAt' | 'views'>) => Promise<void>;
  markStatusAsViewed: (statusId: string) => Promise<void>;
  recordStatusView: (statusId: string, viewer: { userId: string; userName: string; userAvatar?: string }) => void;
  openViewer: (group: UserStatusGroup, initialIndex?: number) => void;
  closeViewer: () => void;
  nextStatus: () => boolean;
  prevStatus: () => boolean;
  setCreateModalOpen: (open: boolean) => void;
  setPrivacyModalOpen: (open: boolean) => void;
  setViewersModalStatusId: (statusId: string | null) => void;
  setStatusPrivacy: (privacy: StatusPrivacySetting, excluded?: string[], included?: string[]) => void;
  toggleMuteUser: (userId: string) => void;
  deleteStatus: (statusId: string) => Promise<void>;
  cleanExpiredStatuses: () => void;
}

const STORAGE_KEY = 'quick_chat_statuses_v2';
const PRIVACY_KEY = 'quick_chat_status_privacy_v1';
const MUTED_KEY = 'quick_chat_status_muted_v1';

function loadInitialMuted(): string[] {
  try {
    const raw = localStorage.getItem(MUTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMuted(muted: string[]) {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
  } catch (e) {
    console.error('Failed to save muted state:', e);
  }
}

function loadInitialPrivacy() {
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    if (!raw) return { statusPrivacy: 'contacts' as StatusPrivacySetting, excludedUserIds: [], includedUserIds: [] };
    return JSON.parse(raw);
  } catch {
    return { statusPrivacy: 'contacts' as StatusPrivacySetting, excludedUserIds: [], includedUserIds: [] };
  }
}

const initialPrivacy = loadInitialPrivacy();
const initialMuted = loadInitialMuted();

export const useStatusStore = create<StatusState>((set, get) => ({
  myStatuses: [],
  contactStatusGroups: [],
  activeViewerGroup: null,
  activeViewerIndex: 0,
  isCreateModalOpen: false,
  isPrivacyModalOpen: false,
  viewersModalStatusId: null,
  mutedUserIds: initialMuted,
  isLoading: false,

  statusPrivacy: initialPrivacy.statusPrivacy,
  excludedUserIds: initialPrivacy.excludedUserIds,
  includedUserIds: initialPrivacy.includedUserIds,

  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setPrivacyModalOpen: (open) => set({ isPrivacyModalOpen: open }),
  setViewersModalStatusId: (statusId) => set({ viewersModalStatusId: statusId }),

  fetchStatuses: async () => {
    set({ isLoading: true });
    try {
      const res = await apiJson('/api/chat/statuses/');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        
        // Group statuses by user
        const myItems: StatusItem[] = [];
        const contactGroupsMap: Record<string, UserStatusGroup> = {};

        items.forEach((backendItem: any) => {
          const item: StatusItem = {
            id: backendItem.id,
            userId: backendItem.user?.id || 'unknown',
            userName: backendItem.user?.display_name || backendItem.user?.username || 'User',
            userAvatar: backendItem.user?.avatar,
            type: backendItem.status_type || 'text',
            content: backendItem.content,
            caption: backendItem.caption,
            backgroundColor: backendItem.background_color,
            fontFamily: backendItem.font_family,
            createdAt: new Date(backendItem.created_at).getTime(),
            expiresAt: new Date(backendItem.expires_at).getTime(),
            privacy: backendItem.privacy,
            views: (backendItem.views || []).map((v: any) => ({
              userId: v.viewer?.id || 'unknown',
              userName: v.viewer?.display_name || v.viewer?.username || 'User',
              userAvatar: v.viewer?.avatar,
              viewedAt: new Date(v.viewed_at).getTime()
            }))
          };

          // Determine if own status or contact status
          const currentUserId = useAuthStore.getState().user?.id;
          if (currentUserId && item.userId === currentUserId) {
            myItems.push(item);
          } else {
            if (!contactGroupsMap[item.userId]) {
              contactGroupsMap[item.userId] = {
                userId: item.userId,
                userName: item.userName,
                userAvatar: item.userAvatar,
                statuses: [],
                hasUnviewed: false,
                lastUpdated: item.createdAt
              };
            }
            contactGroupsMap[item.userId].statuses.push(item);
            if (!item.isViewed) contactGroupsMap[item.userId].hasUnviewed = true;
          }
        });

        set({
          myStatuses: myItems,
          contactStatusGroups: Object.values(contactGroupsMap)
        });
      }
    } catch (err) {
      console.error('Failed to fetch statuses from backend:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleMuteUser: (userId) => {
    set((state) => {
      const isMuted = state.mutedUserIds.includes(userId);
      const updatedMuted = isMuted
        ? state.mutedUserIds.filter(id => id !== userId)
        : [...state.mutedUserIds, userId];
      saveMuted(updatedMuted);
      return { mutedUserIds: updatedMuted };
    });
  },

  setStatusPrivacy: (privacy, excluded = [], included = []) => {
    set({ statusPrivacy: privacy, excludedUserIds: excluded, includedUserIds: included });
  },

  addStatus: async (newStatusData) => {
    const { statusPrivacy } = get();

    try {
      const res = await apiJson('/api/chat/statuses/', {
        method: 'POST',
        body: {
          status_type: newStatusData.type,
          content: newStatusData.content,
          caption: newStatusData.caption || '',
          background_color: newStatusData.backgroundColor || '#005c4b',
          font_family: newStatusData.fontFamily || 'sans-serif',
          privacy: statusPrivacy
        }
      });

      if (res.ok) {
        await get().fetchStatuses();
      }
    } catch (err) {
      console.error('Error creating status:', err);
    }
  },

  recordStatusView: (statusId, viewer) => {
    set((state) => {
      const updatedMy = state.myStatuses.map((s) => {
        if (s.id !== statusId) return s;
        const existingViews = s.views || [];
        if (existingViews.some(v => v.userId === viewer.userId)) return s;
        const newView: StatusViewerRecord = {
          ...viewer,
          viewedAt: Date.now()
        };
        return { ...s, views: [newView, ...existingViews] };
      });
      return { myStatuses: updatedMy };
    });
  },

  markStatusAsViewed: async (statusId) => {
    try {
      await apiJson(`/api/chat/statuses/${statusId}/view/`, { method: 'POST' });
    } catch (err) {
      console.error('Error marking status viewed:', err);
    }

    set((state) => {
      const updatedGroups = state.contactStatusGroups.map((group) => {
        const hasTarget = group.statuses.some(s => s.id === statusId);
        if (!hasTarget) return group;

        const updatedStatuses = group.statuses.map(s => s.id === statusId ? { ...s, isViewed: true } : s);
        const hasUnviewed = updatedStatuses.some(s => !s.isViewed);
        return { ...group, statuses: updatedStatuses, hasUnviewed };
      });
      return { contactStatusGroups: updatedGroups };
    });
  },

  openViewer: (group, initialIndex = 0) => {
    set({ activeViewerGroup: group, activeViewerIndex: initialIndex });
    if (group.statuses[initialIndex]) {
      get().markStatusAsViewed(group.statuses[initialIndex].id);
    }
  },

  closeViewer: () => set({ activeViewerGroup: null, activeViewerIndex: 0 }),

  nextStatus: () => {
    const { activeViewerGroup, activeViewerIndex } = get();
    if (!activeViewerGroup) return false;
    
    if (activeViewerIndex < activeViewerGroup.statuses.length - 1) {
      const nextIdx = activeViewerIndex + 1;
      set({ activeViewerIndex: nextIdx });
      get().markStatusAsViewed(activeViewerGroup.statuses[nextIdx].id);
      return true;
    } else {
      get().closeViewer();
      return false;
    }
  },

  prevStatus: () => {
    const { activeViewerGroup, activeViewerIndex } = get();
    if (!activeViewerGroup) return false;
    
    if (activeViewerIndex > 0) {
      const prevIdx = activeViewerIndex - 1;
      set({ activeViewerIndex: prevIdx });
      return true;
    }
    return false;
  },

  deleteStatus: async (statusId) => {
    try {
      await apiJson(`/api/chat/statuses/${statusId}/`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting status:', err);
    }

    set((state) => ({
      myStatuses: state.myStatuses.filter(s => s.id !== statusId)
    }));
  },

  cleanExpiredStatuses: () => {
    const now = Date.now();
    set((state) => {
      const validMy = state.myStatuses.filter(s => s.expiresAt > now);
      const validContacts = state.contactStatusGroups
        .map(group => {
          const valid = group.statuses.filter(s => s.expiresAt > now);
          return { ...group, statuses: valid, hasUnviewed: valid.some(s => !s.isViewed) };
        })
        .filter(group => group.statuses.length > 0);

      return { myStatuses: validMy, contactStatusGroups: validContacts };
    });
  }
}));
