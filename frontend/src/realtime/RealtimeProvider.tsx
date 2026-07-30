import React, { createContext, useContext, useEffect } from 'react';
import { wsClient } from './socket';
import { ensureDeviceAndKeysRegistered } from '../crypto/deviceRegistration';

interface RealtimeContextState {
  sendEvent: (type: string, payload?: any) => void;
  sendTyping: (isTyping: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextState | null>(null);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Ensure device keys and prekey bundles are registered & uploaded
    ensureDeviceAndKeysRegistered().catch(err => {
      console.warn('Device & prekey registration check warning:', err);
    });

    // Only connect if user is authenticated (can be wrapped by AuthProvider in App.tsx)
    wsClient.connect();
    
    return () => {
      wsClient.disconnect();
    };
  }, []);

  const sendEvent = (type: string, payload?: any) => {
    wsClient.send(type, payload);
  };

  const sendTyping = (isTyping: boolean) => {
    wsClient.send(isTyping ? 'typing.start' : 'typing.stop');
  };

  return (
    <RealtimeContext.Provider value={{ sendEvent, sendTyping }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
};
