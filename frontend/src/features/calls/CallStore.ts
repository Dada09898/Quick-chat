import { create } from 'zustand';

export type CallState = 
  | 'IDLE' 
  | 'OUTGOING' 
  | 'RINGING' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'HOLD' 
  | 'ENDED' 
  | 'FAILED';

interface CallStore {
  state: CallState;
  sessionId: string | null;
  remoteUserId: string | null;
  
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  
  setState: (newState: CallState) => void;
  setSession: (id: string, userId: string) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  endCall: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  state: 'IDLE',
  sessionId: null,
  remoteUserId: null,
  
  isMuted: false,
  isVideoOn: false,
  isScreenSharing: false,
  
  setState: (newState) => {
    // Prevent invalid transitions
    const current = get().state;
    if (current === 'ENDED' || current === 'FAILED') return;
    set({ state: newState });
  },
  
  setSession: (id, userId) => set({ sessionId: id, remoteUserId: userId }),
  
  toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set(state => ({ isVideoOn: !state.isVideoOn })),
  
  endCall: () => set({ 
    state: 'ENDED', 
    sessionId: null, 
    remoteUserId: null,
    isMuted: false,
    isVideoOn: false,
    isScreenSharing: false
  })
}));
