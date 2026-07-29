import { create } from 'zustand';

export interface StatusViewerRecord {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: number;
}

export type StatusPrivacySetting = 'contacts' | 'except' | 'only';

export interface StatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'image' | 'video' | 'text';
  content: string; // Image/video URL or text content
  caption?: string;
  backgroundColor?: string; // For text status
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
  
  // Privacy configuration
  statusPrivacy: StatusPrivacySetting;
  excludedUserIds: string[];
  includedUserIds: string[];

  // Actions
  addStatus: (status: Omit<StatusItem, 'id' | 'createdAt' | 'expiresAt' | 'views'>) => void;
  markStatusAsViewed: (statusId: string) => void;
  recordStatusView: (statusId: string, viewer: { userId: string; userName: string; userAvatar?: string }) => void;
  openViewer: (group: UserStatusGroup, initialIndex?: number) => void;
  closeViewer: () => void;
  nextStatus: () => boolean;
  prevStatus: () => boolean;
  setCreateModalOpen: (open: boolean) => void;
  setPrivacyModalOpen: (open: boolean) => void;
  setViewersModalStatusId: (statusId: string | null) => void;
  setStatusPrivacy: (privacy: StatusPrivacySetting, excluded?: string[], included?: string[]) => void;
  deleteStatus: (statusId: string) => void;
  cleanExpiredStatuses: () => void;
}

const STORAGE_KEY = 'quick_chat_statuses_v2';
const PRIVACY_KEY = 'quick_chat_status_privacy_v1';

function loadInitialPrivacy() {
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    if (!raw) return { statusPrivacy: 'contacts' as StatusPrivacySetting, excludedUserIds: [], includedUserIds: [] };
    return JSON.parse(raw);
  } catch {
    return { statusPrivacy: 'contacts' as StatusPrivacySetting, excludedUserIds: [], includedUserIds: [] };
  }
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { myStatuses: [], contactStatusGroups: [] };
    const parsed = JSON.parse(raw);
    const now = Date.now();
    
    // Filter out expired (>24h)
    const validMy = (parsed.myStatuses || []).filter((s: StatusItem) => s.expiresAt > now);
    const validContacts: UserStatusGroup[] = (parsed.contactStatusGroups || [])
      .map((group: UserStatusGroup) => {
        const validStatuses = group.statuses.filter(s => s.expiresAt > now);
        return {
          ...group,
          statuses: validStatuses,
          hasUnviewed: validStatuses.some(s => !s.isViewed)
        };
      })
      .filter((group: UserStatusGroup) => group.statuses.length > 0);

    return { myStatuses: validMy, contactStatusGroups: validContacts };
  } catch {
    return { myStatuses: [], contactStatusGroups: [] };
  }
}

function saveState(myStatuses: StatusItem[], contactStatusGroups: UserStatusGroup[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ myStatuses, contactStatusGroups }));
  } catch (e) {
    console.error('Failed to save status state:', e);
  }
}

function savePrivacy(privacy: StatusPrivacySetting, excludedUserIds: string[], includedUserIds: string[]) {
  try {
    localStorage.setItem(PRIVACY_KEY, JSON.stringify({ statusPrivacy: privacy, excludedUserIds, includedUserIds }));
  } catch (e) {
    console.error('Failed to save privacy state:', e);
  }
}

// Rich initial demo status with sample views for "My Status" and contacts
const demoViews: StatusViewerRecord[] = [
  {
    userId: 'user_alex',
    userName: 'Alex Morgan',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    viewedAt: Date.now() - 1200000
  },
  {
    userId: 'user_sarah',
    userName: 'Sarah Jenkins',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    viewedAt: Date.now() - 3600000
  }
];

const initialDemoGroups: UserStatusGroup[] = [
  {
    userId: 'demo_user_1',
    userName: 'Kryozen Team',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    hasUnviewed: true,
    lastUpdated: Date.now() - 3600000,
    statuses: [
      {
        id: 'demo_s1',
        userId: 'demo_user_1',
        userName: 'Kryozen Team',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        type: 'text',
        content: 'Welcome to Kryozen Quick Chat! 🚀 E2E Encrypted & Ultra Fast.',
        backgroundColor: '#005c4b',
        createdAt: Date.now() - 3600000,
        expiresAt: Date.now() + 82800000,
        isViewed: false,
        views: []
      },
      {
        id: 'demo_s2',
        userId: 'demo_user_1',
        userName: 'Kryozen Team',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
        caption: 'Enjoy private communication anywhere 🔐',
        createdAt: Date.now() - 1800000,
        expiresAt: Date.now() + 84600000,
        isViewed: false,
        views: []
      }
    ]
  }
];

const initialPrivacy = loadInitialPrivacy();
const initialLoaded = loadInitialState();
const defaultContacts = initialLoaded.contactStatusGroups.length > 0 
  ? initialLoaded.contactStatusGroups 
  : initialDemoGroups;

export const useStatusStore = create<StatusState>((set, get) => ({
  myStatuses: initialLoaded.myStatuses,
  contactStatusGroups: defaultContacts,
  activeViewerGroup: null,
  activeViewerIndex: 0,
  isCreateModalOpen: false,
  isPrivacyModalOpen: false,
  viewersModalStatusId: null,

  statusPrivacy: initialPrivacy.statusPrivacy,
  excludedUserIds: initialPrivacy.excludedUserIds,
  includedUserIds: initialPrivacy.includedUserIds,

  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setPrivacyModalOpen: (open) => set({ isPrivacyModalOpen: open }),
  setViewersModalStatusId: (statusId) => set({ viewersModalStatusId: statusId }),

  setStatusPrivacy: (privacy, excluded = [], included = []) => {
    savePrivacy(privacy, excluded, included);
    set({ statusPrivacy: privacy, excludedUserIds: excluded, includedUserIds: included });
  },

  addStatus: (newStatusData) => {
    const now = Date.now();
    const { statusPrivacy, excludedUserIds, includedUserIds } = get();
    const newStatus: StatusItem = {
      ...newStatusData,
      id: crypto.randomUUID(),
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      isViewed: true, // own status is always viewed
      views: [], // starts with 0 views
      privacy: statusPrivacy,
      privacyExcludedUserIds: excludedUserIds,
      privacyIncludedUserIds: includedUserIds
    };

    set((state) => {
      const updatedMy = [newStatus, ...state.myStatuses];
      saveState(updatedMy, state.contactStatusGroups);
      return { myStatuses: updatedMy };
    });
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
      saveState(updatedMy, state.contactStatusGroups);
      return { myStatuses: updatedMy };
    });
  },

  markStatusAsViewed: (statusId) => {
    set((state) => {
      let changed = false;
      const updatedGroups = state.contactStatusGroups.map((group) => {
        const hasTarget = group.statuses.some(s => s.id === statusId);
        if (!hasTarget) return group;
        
        changed = true;
        const updatedStatuses = group.statuses.map(s => s.id === statusId ? { ...s, isViewed: true } : s);
        const hasUnviewed = updatedStatuses.some(s => !s.isViewed);
        return { ...group, statuses: updatedStatuses, hasUnviewed };
      });

      if (changed) {
        saveState(state.myStatuses, updatedGroups);
        return { contactStatusGroups: updatedGroups };
      }
      return state;
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

  deleteStatus: (statusId) => {
    set((state) => {
      const updatedMy = state.myStatuses.filter(s => s.id !== statusId);
      saveState(updatedMy, state.contactStatusGroups);
      return { myStatuses: updatedMy };
    });
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

      saveState(validMy, validContacts);
      return { myStatuses: validMy, contactStatusGroups: validContacts };
    });
  }
}));
