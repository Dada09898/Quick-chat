import { useRealtimeStore } from './store';
import { useRealtime } from './RealtimeProvider';
import { useEffect, useState } from 'react';

/**
 * Hook to access remote user presence state.
 */
export function useRemotePresence() {
  const presence = useRealtimeStore((state) => state.remotePresence);
  return presence;
}

/**
 * Hook to access remote user typing state.
 */
export function useRemoteTyping() {
  const isTyping = useRealtimeStore((state) => state.remoteTyping);
  return isTyping;
}

/**
 * Hook to get connection status.
 */
export function useConnectionStatus() {
  const isConnected = useRealtimeStore((state) => state.isConnected);
  const isConnecting = useRealtimeStore((state) => state.isConnecting);
  const error = useRealtimeStore((state) => state.error);
  
  return { isConnected, isConnecting, error };
}

/**
 * Hook to automatically send typing indicator with debouncing.
 */
export function useTypingIndicator() {
  const { sendTyping } = useRealtime();
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    sendTyping(isTyping);
    
    if (isTyping) {
      // Auto stop typing after 5 seconds of inactivity
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isTyping, sendTyping]);

  const triggerTyping = () => setIsTyping(true);

  return triggerTyping;
}
