export interface KeyPairBase64 {
  publicKey: string; // Base64 encoded SPKI
  privateKey?: string; // Base64 encoded PKCS8 (only used for export backups)
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64
  salt?: string;      // Base64 (if derived key was used)
  mac?: string;       // GCM auth tag is usually appended to ciphertext, but can be explicit
}

export interface StoredKey {
  id: string;
  type: 'identity' | 'x25519' | 'ed25519' | 'session';
  keyPath: CryptoKey;
  createdAt: number;
}
