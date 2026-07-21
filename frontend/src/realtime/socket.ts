import { useRealtimeStore } from './store';
import { useChatStore } from '../features/chat/chatStore';
import { useAuthStore } from '../store/authStore';

/**
 * Decode ciphertext that was encoded as btoa(unescape(encodeURIComponent(text))).
 * This supports full Unicode. When real E2EE is implemented, replace this with
 * actual AES-256-GCM decryption.
 */
export function decodeCiphertext(ciphertext: string): string {
  try {
    return decodeURIComponent(escape(atob(ciphertext)));
  } catch {
    // Fallback for plain ASCII base64
    try { return atob(ciphertext); } catch { return ciphertext; }
  }
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Determine WS protocol and host based on API URL or fallback to origin
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      try {
        const parsedUrl = new URL(apiUrl);
        const protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        this.url = `${protocol}//${parsedUrl.host}/ws/realtime/`;
      } catch (e) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.url = `${protocol}//${window.location.host}/ws/realtime/`;
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
      this.url = `${protocol}//${host}/ws/realtime/`;
    }
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    useRealtimeStore.getState().setConnectionState(false, true, null);

    this.ws = new WebSocket(this.url);
    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Intentional Disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    useRealtimeStore.getState().setConnectionState(false, false, null);
  }

  public send(type: string, payload: any = {}, id?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, WebSocket is not open');
      return;
    }
    this.ws.send(JSON.stringify({
      type,
      payload,
      id: id || crypto.randomUUID()
    }));
  }

  private handleOpen() {
    this.reconnectAttempts = 0;
    useRealtimeStore.getState().setConnectionState(true, false, null);
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const { type, payload } = data;

      switch (type) {
        case 'presence.online':
        case 'presence.offline':
          useRealtimeStore.getState().setRemotePresence(
            type === 'presence.online' ? 'online' : 'offline', 
            payload.timestamp || Date.now()
          );
          break;
        case 'typing.start':
          useRealtimeStore.getState().setRemoteTyping(true);
          break;
        case 'typing.stop':
          useRealtimeStore.getState().setRemoteTyping(false);
          break;
        case 'ack':
          // The backend sends back an ack when a message is processed
          if (payload.status === 'sent') {
            useChatStore.getState().updateMessageStatus(data.id, 'sent', payload.sequence_number);
          }
          break;
        case 'message.new':
          // Decrypt payload here in a real E2EE system, for now decode base64 stub
          useChatStore.getState().upsertMessage({
            ...payload,
            status: 'delivered',
            decrypted_text: decodeCiphertext(payload.ciphertext),
          });
          
          // Send delivered receipt back (include conversation_id for group routing)
          this.send('message.delivered', {
            message_id: payload.id,
            conversation_id: payload.conversation_id
          });
          break;
        case 'message.delivered':
          useChatStore.getState().updateMessageStatus(payload.message_id, 'delivered');
          break;
        case 'message.read':
          useChatStore.getState().updateMessageStatus(payload.message_id, 'read');
          break;
        case 'message.edit':
          useChatStore.getState().upsertMessage(payload);
          break;
        case 'message.delete':
          useChatStore.getState().upsertMessage({ ...payload, deleted_at: new Date().toISOString() });
          break;
        case 'message.reaction':
          const emoji = payload.reaction ? decodeURIComponent(escape(atob(payload.reaction))) : null;
          useChatStore.getState().updateMessageReactions(payload.message_id, payload.user_id, emoji);
          break;
        case 'conversation.delta':
        case 'conversation.sync_response':
          payload.messages.forEach((msg: any) => {
            useChatStore.getState().upsertMessage({
              ...msg,
              decrypted_text: decodeCiphertext(msg.ciphertext),
              status: 'delivered'
            });
          });
          break;
        case 'call.offer':
          import('../features/calls/CallStore').then(({ useCallStore }) => {
            useCallStore.getState().setSession(payload.session_id, payload.caller_id);
            useCallStore.getState().setState('RINGING');
            import('../features/calls/PeerConnectionManager').then(({ PeerConnectionManager }) => {
              // We need a singleton or store access to the PC Manager. 
              // Since it's instantiated in CallProvider, we should ideally route it there.
              // For simplicity, we can emit a custom event or let CallProvider handle signaling via store.
              window.dispatchEvent(new CustomEvent('webrtc:offer', { detail: payload }));
            });
          });
          break;
        case 'call.answer':
          window.dispatchEvent(new CustomEvent('webrtc:answer', { detail: payload }));
          break;
        case 'call.ice_candidate':
          window.dispatchEvent(new CustomEvent('webrtc:ice_candidate', { detail: payload }));
          break;
        case 'call.reject':
        case 'call.end':
          import('../features/calls/CallStore').then(({ useCallStore }) => {
            useCallStore.getState().endCall();
          });
          break;
        case 'typing.start':
          if (payload.user_id !== useAuthStore.getState().user?.id) {
            useRealtimeStore.getState().setRemoteTyping(true);
          }
          break;
        case 'typing.stop':
          if (payload.user_id !== useAuthStore.getState().user?.id) {
            useRealtimeStore.getState().setRemoteTyping(false);
          }
          break;
        case 'presence.online':
          if (payload.user_id !== useAuthStore.getState().user?.id) {
            useRealtimeStore.getState().setRemotePresence('online', payload.timestamp);
          }
          break;
        case 'presence.offline':
          if (payload.user_id !== useAuthStore.getState().user?.id) {
            useRealtimeStore.getState().setRemotePresence('offline', payload.timestamp);
          }
          break;
        case 'error':
          console.error('Realtime Error:', payload.message);
          break;
      }
    } catch (err) {
      console.error('Failed to parse websocket message', err);
    }
  }

  private handleClose(event: CloseEvent) {
    this.stopHeartbeat();
    useRealtimeStore.getState().setConnectionState(false, false, `Closed code: ${event.code}`);
    
    // Auto reconnect unless intentionally closed
    if (event.code !== 1000 && event.code !== 4001) {
      this.attemptReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket Error', event);
    this.ws?.close(); // Will trigger handleClose and auto-reconnect
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useRealtimeStore.getState().setConnectionState(false, false, 'Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Attempting reconnect ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send('heartbeat');
    }, 30000); // 30s heartbeat
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Singleton instance
export const wsClient = new RealtimeClient();
