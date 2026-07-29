import { create } from 'zustand';

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
  
  addStatus: (status: Omit<StatusItem, 'id' | 'createdAt' | 'expiresAt'>) => void;
  markStatusAsViewed: (statusId: string) => void;
  openViewer: (group: UserStatusGroup, initialIndex?: number) => void;
  closeViewer: () => void;
  nextStatus: () => boolean;
  prevStatus: () => boolean;
  setCreateModalOpen: (open: boolean) => void;
  deleteStatus: (statusId: string) => void;
  cleanExpiredStatuses: () => void;
}

const STORAGE_KEY = 'quick_chat_statuses_v1';

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

// Initial demo status for rich experience
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
        isViewed: false
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
        isViewed: false
      }
    ]
  }
];

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

  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

  addStatus: (newStatusData) => {
    const now = Date.now();
    const newStatus: StatusItem = {
      ...newStatusData,
      id: crypto.randomUUID(),
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      isViewed: true // own status is always viewed
    };

    set((state) => {
      const updatedMy = [newStatus, ...state.myStatuses];
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
