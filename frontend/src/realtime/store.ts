import { create } from 'zustand';

interface PresenceState {
  status: 'online' | 'offline';
  lastSeen: number | null;
}

interface RealtimeStore {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  remotePresence: PresenceState;
  remoteTyping: boolean;
  
  setConnectionState: (connected: boolean, connecting: boolean, error: string | null) => void;
  setRemotePresence: (status: 'online' | 'offline', lastSeen: number) => void;
  setRemoteTyping: (isTyping: boolean) => void;
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  isConnected: false,
  isConnecting: false,
  error: null,
  remotePresence: { status: 'offline', lastSeen: null },
  remoteTyping: false,
  
  setConnectionState: (isConnected, isConnecting, error) => set({ isConnected, isConnecting, error }),
  setRemotePresence: (status, lastSeen) => set((state) => ({ 
    remotePresence: { status, lastSeen } 
  })),
  setRemoteTyping: (remoteTyping) => set({ remoteTyping }),
}));
