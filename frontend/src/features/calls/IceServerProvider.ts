// Abstract Provider for ICE Configuration (STUN/TURN)
export class IceServerProvider {
  static async getIceServers(): Promise<RTCIceServer[]> {
    // In production, this would make an authenticated API call to retrieve 
    // ephemeral TURN credentials from Twilio, Coturn, or Metered.
    // For development, we fallback to public STUN.
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }
}
