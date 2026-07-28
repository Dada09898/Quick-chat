import { create } from 'zustand';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'dnd';
export type ActivityState = 'idle' | 'typing' | 'recording_audio' | 'recording_video' | 'uploading';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  activity: ActivityState;
  lastSeen: number;
  customStatus?: string;
}

interface RealtimeStore {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // Legacy compatibility (single remote user for 1:1 chats)
  remotePresence: { status: PresenceStatus; lastSeen: number | null };
  remoteTyping: boolean;
  
  // Enhanced: per-user presence map (supports group chats)
  presenceMap: Record<string, UserPresence>;
  
  // Connection actions
  setConnectionState: (connected: boolean, connecting: boolean, error: string | null) => void;
  
  // Legacy actions (backward compatible)
  setRemotePresence: (status: PresenceStatus, lastSeen: number) => void;
  setRemoteTyping: (isTyping: boolean) => void;
  
  // Enhanced presence actions
  updateUserPresence: (userId: string, presence: Partial<UserPresence>) => void;
  setUserActivity: (userId: string, activity: ActivityState) => void;
  removeUserPresence: (userId: string) => void;
  getUserPresence: (userId: string) => UserPresence | undefined;
  getOnlineUsers: () => string[];
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  error: null,
  remotePresence: { status: 'offline' as PresenceStatus, lastSeen: null },
  remoteTyping: false,
  presenceMap: {},
  
  setConnectionState: (isConnected, isConnecting, error) => set({ isConnected, isConnecting, error }),
  
  setRemotePresence: (status, lastSeen) => set({
    remotePresence: { status, lastSeen }
  }),
  
  setRemoteTyping: (remoteTyping) => set({ remoteTyping }),
  
  updateUserPresence: (userId, presence) => set((state) => ({
    presenceMap: {
      ...state.presenceMap,
      [userId]: {
        ...(state.presenceMap[userId] || {
          userId,
          status: 'offline' as PresenceStatus,
          activity: 'idle' as ActivityState,
          lastSeen: Date.now()
        }),
        ...presence,
        userId
      }
    }
  })),
  
  setUserActivity: (userId, activity) => set((state) => {
    const existing = state.presenceMap[userId];
    if (!existing) return state;
    return {
      presenceMap: {
        ...state.presenceMap,
        [userId]: { ...existing, activity }
      }
    };
  }),
  
  removeUserPresence: (userId) => set((state) => {
    const newMap = { ...state.presenceMap };
    delete newMap[userId];
    return { presenceMap: newMap };
  }),
  
  getUserPresence: (userId) => {
    return get().presenceMap[userId];
  },
  
  getOnlineUsers: () => {
    const map = get().presenceMap;
    return Object.keys(map).filter(id => map[id].status === 'online');
  }
}));
