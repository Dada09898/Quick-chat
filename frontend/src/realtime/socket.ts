import { useRealtimeStore } from './store';
import { useChatStore } from '../features/chat/chatStore';

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Determine WS protocol based on current origin
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
    this.url = `${protocol}//${host}/ws/realtime/`;
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
          // Decrypt payload here in a real E2EE system, for now store as is with decrypted text stub
          useChatStore.getState().upsertMessage({
            ...payload,
            status: 'delivered',
            decrypted_text: atob(payload.ciphertext), // Demo decryption
          });
          
          // Send delivered receipt back
          this.send('message.delivered', { message_id: payload.id });
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
        case 'conversation.sync_response':
          payload.messages.forEach((msg: any) => {
            useChatStore.getState().upsertMessage({
              ...msg,
              decrypted_text: atob(msg.ciphertext), // Demo decryption
              status: 'delivered'
            });
          });
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
