import { useRealtimeStore } from './store';
import { useChatStore } from '../features/chat/chatStore';
import { useAuthStore } from '../store/authStore';
import { decodeCiphertext, decryptMessageText } from '../utils/cryptoUtils';
import { chatSounds } from '../utils/chatSounds';

export { decodeCiphertext };

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly connectTimeoutMs = 8000;

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

    if (this.connectTimeout) clearTimeout(this.connectTimeout);
    this.connectTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        console.warn(`WebSocket handshake did not complete within ${this.connectTimeoutMs}ms; forcing reconnect`);
        this.ws.close();
      }
    }, this.connectTimeoutMs);
  }

  public disconnect() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
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

  private async handleOpen() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this.reconnectAttempts = 0;
    useRealtimeStore.getState().setConnectionState(true, false, null);
    this.startHeartbeat();
    await this.flushOutbox();
  }

  public async flushOutbox() {
    try {
      const { offlineDB } = await import('../store/offlineStore');
      const outboxMessages = await offlineDB.getOutboxMessages();
      for (const msg of outboxMessages) {
        this.send('message.send', {
          id: msg.id,
          conversation_id: msg.conversationId,
          ciphertext: msg.ciphertext,
          nonce: msg.nonce,
          signature: msg.signature,
          key_version: msg.keyVersion,
          algorithm: msg.algorithm,
          created_at: msg.createdAt,
          reply_to_id: msg.replyToId,
          media_id: msg.mediaId,
          media_key: msg.mediaKey
        }, msg.id);
        useChatStore.getState().removeFromOutbox(msg.id);
      }
    } catch (err) {
      console.error('Failed to flush outbox:', err);
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const { type, payload } = data;

      switch (type) {
        case 'presence.online':
        case 'presence.offline':
        case 'presence.away':
        case 'presence.busy':
        case 'presence.dnd':
          const statusVal = type.replace('presence.', '') as any;
          if (payload.user_id) {
            useRealtimeStore.getState().updateUserPresence(payload.user_id, {
              status: statusVal,
              lastSeen: payload.timestamp || Date.now()
            });
          }
          useRealtimeStore.getState().setRemotePresence(
            statusVal, 
            payload.timestamp || Date.now()
          );
          break;
        case 'activity.change':
          if (payload.user_id) {
            useRealtimeStore.getState().setUserActivity(payload.user_id, payload.activity || 'idle');
          }
          break;
        case 'typing.start':
          if (payload.user_id && payload.user_id !== useAuthStore.getState().user?.id) {
            useRealtimeStore.getState().setUserActivity(payload.user_id, 'typing');
            useRealtimeStore.getState().setRemoteTyping(true);
          }
          break;
        case 'typing.stop':
          if (payload.user_id && payload.user_id !== useAuthStore.getState().user?.id) {
            useRealtimeStore.getState().setUserActivity(payload.user_id, 'idle');
            useRealtimeStore.getState().setRemoteTyping(false);
          }
          break;
        case 'ack':
          // The backend sends back an ack when a message is processed
          if (payload.status === 'sent') {
            useChatStore.getState().updateMessageStatus(payload.message_id, 'sent', payload.sequence_number);
          }
          break;
        case 'message.new': {
          const existingMsg = useChatStore.getState().messages[payload.id];
          const media_attachments = (payload.media_attachments && payload.media_attachments.length > 0)
            ? payload.media_attachments
            : (payload.attachments || existingMsg?.media_attachments);

          if (payload.sender_id !== useAuthStore.getState().user?.id) {
            chatSounds.playReceiveSound();
          }

          decryptMessageText(payload).then(decrypted_text => {
            useChatStore.getState().upsertMessage({
              ...payload,
              media_attachments,
              status: 'delivered',
              decrypted_text,
            });
          });
          
          // Send delivered receipt back (include conversation_id for group routing)
          this.send('message.delivered', {
            message_id: payload.id,
            conversation_id: payload.conversation_id
          });
          break;
        }
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
          payload.messages.forEach(async (msg: any) => {
            const decrypted_text = await decryptMessageText(msg);
            useChatStore.getState().upsertMessage({
              ...msg,
              decrypted_text,
              status: 'delivered'
            });
          });
          break;
        case 'call.offer':
          window.dispatchEvent(new CustomEvent('webrtc:offer', { detail: payload }));
          break;
        case 'call.answer':
          window.dispatchEvent(new CustomEvent('webrtc:answer', { detail: payload }));
          break;
        case 'call.ice_candidate':
          window.dispatchEvent(new CustomEvent('webrtc:ice_candidate', { detail: payload }));
          break;
        case 'call.reject':
        case 'call.end':
          window.dispatchEvent(new CustomEvent('webrtc:call_ended', { detail: payload }));
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
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
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

let _wsClientInstance: RealtimeClient | null = null;

export function getWsClient(): RealtimeClient {
  if (!_wsClientInstance) {
    _wsClientInstance = new RealtimeClient();
  }
  return _wsClientInstance;
}

// Singleton Proxy wrapper for lazy initialization
export const wsClient = new Proxy({} as RealtimeClient, {
  get(_, prop) {
    const instance = getWsClient() as any;
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export const realtimeSocket = wsClient;
