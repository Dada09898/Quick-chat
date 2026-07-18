export class DeviceManager {
  static async getAudioInputs(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }

  static async getVideoInputs(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  }

  static onDeviceChange(callback: () => void) {
    navigator.mediaDevices.addEventListener('devicechange', callback);
    return () => navigator.mediaDevices.removeEventListener('devicechange', callback);
  }
}

export class MediaManager {
  private localStream: MediaStream | null = null;

  async requestMedia(audio: boolean, video: boolean): Promise<MediaStream | null> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      return this.localStream;
    } catch (e) {
      console.error("Media permission denied or hardware unavailable.", e);
      return null; // Graceful fallback
    }
  }

  getStream(): MediaStream | null {
    return this.localStream;
  }

  toggleAudio(enabled: boolean) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach(t => t.enabled = enabled);
  }

  toggleVideo(enabled: boolean) {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach(t => t.enabled = enabled);
  }

  stopAll() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }
}
