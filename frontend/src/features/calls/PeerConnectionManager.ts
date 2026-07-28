import { IceServerProvider } from './IceServerProvider';
import { useCallStore } from './CallStore';
import { useRealtimeStore } from '../../realtime/store';

export class PeerConnectionManager {
  public pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  public onRemoteTrack: ((stream: MediaStream) => void) | null = null;

  async init(stream: MediaStream) {
    this.localStream = stream;
    const servers = await IceServerProvider.getIceServers();
    
    this.pc = new RTCPeerConnection({ iceServers: servers });

    // Handle incoming media
    this.pc.ontrack = (event) => {
      if (this.onRemoteTrack && event.streams[0]) {
        this.onRemoteTrack(event.streams[0]);
      }
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const sessionId = useCallStore.getState().sessionId;
        if (!sessionId) return;
        
        import('../../realtime/socket').then(({ wsClient }) => {
          wsClient.send('call.ice_candidate', {
            session_id: sessionId,
            conversation_id: useCallStore.getState().conversationId,
            candidate: event.candidate
          });
        });
      }
    };

    // Track ICE connection state for Reconneting UI / Failures
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      const store = useCallStore.getState();
      
      if (state === 'disconnected') {
        store.setState('RECONNECTING');
        // Triggers automated ICE restart negotiation if we are the caller
      } else if (state === 'connected' || state === 'completed') {
        store.setState('CONNECTED');
      } else if (state === 'failed') {
        store.setState('FAILED');
      }
    };

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.pc?.addTrack(track, this.localStream!);
    });
  }

  async createOffer() {
    if (!this.pc) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    if (!this.pc) return;
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  close() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
