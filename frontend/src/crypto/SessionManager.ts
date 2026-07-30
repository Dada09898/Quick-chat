import { generateX25519KeyPair, deriveSharedSecret, exportPublicKey, importPublicKey } from './keys';
import { deriveHKDFKey } from './hkdf';
import { encryptAESGCM, decryptAESGCM } from './aes';
import { bufferToBase64, base64ToBuffer, wipeMemory, generateRandomBytes } from './random';
import { getDB } from './storage';
import { CryptoError, ErrorCodes } from './errors';
import type { EncryptedPayload } from './types';

/** Represents a remote user's X3DH key bundle fetched from the server. */
export interface KeyBundle {
  deviceId: string;
  identityKey: string;  // Base64 SPKI - Ed25519 (for verification)
  signedPreKey: string; // Base64 SPKI - X25519
  signedPreKeySignature: string; // Base64 Ed25519 signature of signedPreKey
  oneTimePreKey?: string; // Base64 SPKI - X25519 (optional, consumed on use)
}

/** Wire format for an encrypted message. */
export interface EncryptedMessage {
  sessionId: string;
  ephemeralKey?: string; // Base64 SPKI - only sent on initial message
  senderSignedPreKeyId?: number;
  senderOneTimePreKeyId?: number;
  senderDeviceId?: string;
  messageNumber: number;
  chainIndex: number;
  payload: EncryptedPayload;
  senderIdentityKey: string; // For receiver to look up session
}

/** Internal session state stored in IndexedDB. */
export interface SessionState {
  id: string;
  remoteUserId: string;
  remoteDeviceId: string;
  remoteIdentityKey: string;
  localIdentityKey: string;
  rootKey: string;         // Base64 - current root key
  sendChainKey: string;    // Base64 - current sending chain key
  receiveChainKey: string; // Base64 - current receiving chain key
  sendMessageNumber: number;
  receiveMessageNumber: number;
  localRatchetKey: string;  // Base64 - our current X25519 private key (exported)
  remoteRatchetKey: string; // Base64 - their current X25519 public key
  createdAt: number;
  lastUsedAt: number;
}

// Extend the IndexedDB schema for sessions
async function getSessionDB() {
  const { openDB } = await import('idb');
  return openDB('quick-chat-sessions', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' });
        store.createIndex('by-remote', ['remoteUserId', 'remoteDeviceId']);
      }
      if (!db.objectStoreNames.contains('skipped-keys')) {
        db.createObjectStore('skipped-keys', { keyPath: 'id' });
      }
    }
  });
}

/**
 * Performs HKDF to derive a 32-byte key from input key material.
 * Uses the existing deriveHKDFKey but works with raw bytes.
 */
async function kdfDerive(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: string
): Promise<Uint8Array> {
  const ikm = await window.crypto.subtle.importKey(
    'raw', inputKeyMaterial, { name: 'HKDF' }, false, ['deriveBits']
  );
  const encoder = new TextEncoder();
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'HKDF', salt, info: encoder.encode(info), hash: 'SHA-256' },
    ikm,
    512 // 64 bytes = 32 for new root key + 32 for chain key
  );
  return new Uint8Array(bits);
}

/**
 * Derives a message key from a chain key using HKDF.
 * Returns [newChainKey, messageKey] - each 32 bytes.
 */
async function advanceChain(chainKeyBase64: string): Promise<{ newChainKey: string; messageKey: Uint8Array }> {
  const chainKey = base64ToBuffer(chainKeyBase64);
  const encoder = new TextEncoder();
  
  // Chain key advance: HMAC-SHA256(chainKey, 0x01) for message key
  const ckMaterial = await window.crypto.subtle.importKey(
    'raw', chainKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const messageKeyBuf = await window.crypto.subtle.sign(
    'HMAC', ckMaterial, encoder.encode('\x01')
  );
  
  // New chain key: HMAC-SHA256(chainKey, 0x02)
  const newChainKeyBuf = await window.crypto.subtle.sign(
    'HMAC', ckMaterial, encoder.encode('\x02')
  );
  
  // Wipe old chain key
  wipeMemory(chainKey);
  
  return {
    newChainKey: bufferToBase64(newChainKeyBuf),
    messageKey: new Uint8Array(messageKeyBuf)
  };
}

export class SessionManager {
  /**
   * Performs X3DH key agreement to establish a new session.
   * Called by the initiator (sender of the first message).
   */
  static async initiateSession(
    localIdentityPrivateKey: CryptoKey,
    localIdentityPublicKeyBase64: string,
    remoteBundle: KeyBundle
  ): Promise<{ session: SessionState; ephemeralPublicKey: string }> {
    // 1. Generate ephemeral X25519 key pair
    const ephemeral = await generateX25519KeyPair();
    const ephemeralPublicBase64 = await exportPublicKey(ephemeral.publicKey);
    
    // 2. Import remote keys
    const remoteSignedPreKey = await importPublicKey(remoteBundle.signedPreKey, 'X25519');
    
    // 3. X3DH: Compute shared secrets
    // DH1: localIdentity × remoteSignedPreKey
    // DH2: ephemeral × remoteIdentityKey (we skip this since identity is Ed25519, not X25519)
    // DH3: ephemeral × remoteSignedPreKey
    // We use DH1 + DH3 (2-agreement X3DH variant)
    
    // DH1: Our identity exchange key × their signed pre-key
    const dh1Secret = await deriveSharedSecret(localIdentityPrivateKey, remoteSignedPreKey);
    const dh1Bits = await window.crypto.subtle.deriveBits(
      { name: 'HKDF', salt: new Uint8Array(32), info: new TextEncoder().encode('X3DH-DH1'), hash: 'SHA-256' },
      dh1Secret, 256
    );
    
    // DH3: Our ephemeral × their signed pre-key
    const dh3Secret = await deriveSharedSecret(ephemeral.privateKey, remoteSignedPreKey);
    const dh3Bits = await window.crypto.subtle.deriveBits(
      { name: 'HKDF', salt: new Uint8Array(32), info: new TextEncoder().encode('X3DH-DH3'), hash: 'SHA-256' },
      dh3Secret, 256
    );
    
    // DH4: If one-time pre-key available
    let dh4Bits: ArrayBuffer | null = null;
    if (remoteBundle.oneTimePreKey) {
      const remoteOTPK = await importPublicKey(remoteBundle.oneTimePreKey, 'X25519');
      const dh4Secret = await deriveSharedSecret(ephemeral.privateKey, remoteOTPK);
      dh4Bits = await window.crypto.subtle.deriveBits(
        { name: 'HKDF', salt: new Uint8Array(32), info: new TextEncoder().encode('X3DH-DH4'), hash: 'SHA-256' },
        dh4Secret, 256
      );
    }
    
    // 4. Concatenate DH outputs
    const totalLen = 32 + 32 + (dh4Bits ? 32 : 0);
    const combined = new Uint8Array(totalLen);
    combined.set(new Uint8Array(dh1Bits), 0);
    combined.set(new Uint8Array(dh3Bits), 32);
    if (dh4Bits) combined.set(new Uint8Array(dh4Bits), 64);
    
    // 5. Derive root key and chain keys via HKDF
    const derived = await kdfDerive(
      combined,
      new Uint8Array(32), // Zero salt for initial derivation
      'QuickChat-X3DH-v1'
    );
    
    const rootKey = derived.slice(0, 32);
    const chainKey = derived.slice(32, 64);
    
    // Wipe combined secret
    wipeMemory(combined);
    wipeMemory(derived);
    
    // 6. Export ephemeral private key for ratchet
    const ephPrivRaw = await window.crypto.subtle.exportKey('pkcs8', ephemeral.privateKey);
    
    const sessionId = `${localIdentityPublicKeyBase64.slice(0, 8)}_${remoteBundle.deviceId}_${Date.now()}`;
    
    const session: SessionState = {
      id: sessionId,
      remoteUserId: '', // Set by caller
      remoteDeviceId: remoteBundle.deviceId,
      remoteIdentityKey: remoteBundle.identityKey,
      localIdentityKey: localIdentityPublicKeyBase64,
      rootKey: bufferToBase64(rootKey),
      sendChainKey: bufferToBase64(chainKey),
      receiveChainKey: '', // Set on first received message
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
      localRatchetKey: bufferToBase64(ephPrivRaw),
      remoteRatchetKey: remoteBundle.signedPreKey,
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    };
    
    // 7. Persist session
    const db = await getSessionDB();
    await db.put('sessions', session);
    
    return { session, ephemeralPublicKey: ephemeralPublicBase64 };
  }
  
  /**
   * Encrypts a plaintext message using the Double Ratchet.
   */
  static async encrypt(sessionId: string, plaintext: string): Promise<EncryptedMessage> {
    const db = await getSessionDB();
    const session = await db.get('sessions', sessionId) as SessionState | undefined;
    if (!session) throw new CryptoError('Session not found', ErrorCodes.KEY_NOT_FOUND);
    
    // Advance sending chain
    const { newChainKey, messageKey } = await advanceChain(session.sendChainKey);
    
    // Import message key for AES-GCM
    const aesKey = await window.crypto.subtle.importKey(
      'raw', messageKey, { name: 'AES-GCM' }, false, ['encrypt']
    );
    
    // Encrypt
    const iv = generateRandomBytes(12);
    const encoder = new TextEncoder();
    const ciphertextBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      encoder.encode(plaintext)
    );
    
    // Wipe message key
    wipeMemory(messageKey);
    
    const msgNumber = session.sendMessageNumber;
    
    // Update session state
    session.sendChainKey = newChainKey;
    session.sendMessageNumber = msgNumber + 1;
    session.lastUsedAt = Date.now();
    await db.put('sessions', session);
    
    return {
      sessionId,
      messageNumber: msgNumber,
      chainIndex: 0,
      ephemeralKey: msgNumber === 0 ? session.localRatchetKey : undefined, // Only first message
      payload: {
        ciphertext: bufferToBase64(ciphertextBuf),
        iv: bufferToBase64(iv)
      },
      senderIdentityKey: session.localIdentityKey
    };
  }
  
  /**
   * Decrypts an incoming encrypted message.
   */
  static async decrypt(sessionId: string, encrypted: EncryptedMessage): Promise<string> {
    const db = await getSessionDB();
    const session = await db.get('sessions', sessionId) as SessionState | undefined;
    if (!session) throw new CryptoError('Session not found for decryption', ErrorCodes.KEY_NOT_FOUND);
    
    // Advance receiving chain to the correct message number
    let currentChainKey = session.receiveChainKey;
    let messageKey: Uint8Array | null = null;
    
    // Skip forward if needed (out-of-order messages)
    for (let i = session.receiveMessageNumber; i <= encrypted.messageNumber; i++) {
      const result = await advanceChain(currentChainKey);
      currentChainKey = result.newChainKey;
      if (i === encrypted.messageNumber) {
        messageKey = result.messageKey;
      } else {
        // Store skipped keys for out-of-order decryption
        await db.put('skipped-keys', {
          id: `${sessionId}_${i}`,
          sessionId,
          messageNumber: i,
          messageKey: bufferToBase64(result.messageKey),
          createdAt: Date.now()
        });
        wipeMemory(result.messageKey);
      }
    }
    
    if (!messageKey) throw new CryptoError('Failed to derive message key', ErrorCodes.KEY_DERIVATION_FAILED);
    
    // Import and decrypt
    const aesKey = await window.crypto.subtle.importKey(
      'raw', messageKey, { name: 'AES-GCM' }, false, ['decrypt']
    );
    
    const iv = base64ToBuffer(encrypted.payload.iv);
    const ciphertext = base64ToBuffer(encrypted.payload.ciphertext);
    
    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      ciphertext
    );
    
    // Wipe message key
    wipeMemory(messageKey);
    
    // Update session
    session.receiveChainKey = currentChainKey;
    session.receiveMessageNumber = encrypted.messageNumber + 1;
    session.lastUsedAt = Date.now();
    await db.put('sessions', session);
    
    return new TextDecoder().decode(decryptedBuf);
  }
  
  /**
   * Called by the RECEIVER on the first message from a new sender.
   * Independently derives the same root key the sender computed.
   */
  static async respondToSession(params: {
    ownSignedPreKeyPrivate: CryptoKey;
    ownOneTimePreKeyPrivate?: CryptoKey;
    senderIdentityPublicKeyB64: string;
    senderEphemeralPublicKeyB64: string;
    remoteUserId: string;
    remoteDeviceId: string;
    sessionId: string;
    localIdentityPublicKeyB64: string;
  }): Promise<SessionState> {
    const senderIdentityPub = await importPublicKey(params.senderIdentityPublicKeyB64, 'X25519');
    const senderEphemeralPub = await importPublicKey(params.senderEphemeralPublicKeyB64, 'X25519');

    // DH1: our signed pre-key private × sender identity exchange public
    const dh1Secret = await deriveSharedSecret(params.ownSignedPreKeyPrivate, senderIdentityPub);
    const dh1Bits = await window.crypto.subtle.deriveBits(
      { name: 'HKDF', salt: new Uint8Array(32), info: new TextEncoder().encode('X3DH-DH1'), hash: 'SHA-256' },
      dh1Secret, 256
    );

    // DH3: our signed pre-key private × sender ephemeral public
    const dh3Secret = await deriveSharedSecret(params.ownSignedPreKeyPrivate, senderEphemeralPub);
    const dh3Bits = await window.crypto.subtle.deriveBits(
      { name: 'HKDF', salt: new Uint8Array(32), info: new TextEncoder().encode('X3DH-DH3'), hash: 'SHA-256' },
      dh3Secret, 256
    );

    // DH4: our one-time pre-key private × sender ephemeral public (if used)
    let dh4Bits: ArrayBuffer | null = null;
    if (params.ownOneTimePreKeyPrivate) {
      const dh4Secret = await deriveSharedSecret(params.ownOneTimePreKeyPrivate, senderEphemeralPub);
      dh4Bits = await window.crypto.subtle.deriveBits(
        { name: 'HKDF', salt: new Uint8Array(32), info: new TextEncoder().encode('X3DH-DH4'), hash: 'SHA-256' },
        dh4Secret, 256
      );
    }

    const totalLen = 32 + 32 + (dh4Bits ? 32 : 0);
    const combined = new Uint8Array(totalLen);
    combined.set(new Uint8Array(dh1Bits), 0);
    combined.set(new Uint8Array(dh3Bits), 32);
    if (dh4Bits) combined.set(new Uint8Array(dh4Bits), 64);

    const derived = await kdfDerive(combined, new Uint8Array(32), 'QuickChat-X3DH-v1');
    const rootKey = derived.slice(0, 32);
    const chainKey = derived.slice(32, 64);
    wipeMemory(combined);
    wipeMemory(derived);

    const session: SessionState = {
      id: params.sessionId,
      remoteUserId: params.remoteUserId,
      remoteDeviceId: params.remoteDeviceId,
      remoteIdentityKey: params.senderIdentityPublicKeyB64,
      localIdentityKey: params.localIdentityPublicKeyB64,
      rootKey: bufferToBase64(rootKey),
      sendChainKey: '',
      receiveChainKey: bufferToBase64(chainKey),
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
      localRatchetKey: '',
      remoteRatchetKey: params.senderEphemeralPublicKeyB64,
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    };

    const db = await getSessionDB();
    await db.put('sessions', session);
    return session;
  }

  /**
   * Gets or creates a session for a remote user.
   */
  static async getSessionForUser(remoteUserId: string, remoteDeviceId?: string): Promise<SessionState | null> {
    const db = await getSessionDB();
    const all = await db.getAll('sessions') as SessionState[];
    if (remoteDeviceId) {
      const match = all.find(s => s.remoteUserId === remoteUserId && s.remoteDeviceId === remoteDeviceId);
      if (match) return match;
    }
    return all.find(s => s.remoteUserId === remoteUserId) || null;
  }
  
  /**
   * Lists all active sessions.
   */
  static async listSessions(): Promise<SessionState[]> {
    const db = await getSessionDB();
    return await db.getAll('sessions') as SessionState[];
  }
  
  /**
   * Destroys a session and wipes its keys.
   */
  static async destroySession(sessionId: string): Promise<void> {
    const db = await getSessionDB();
    await db.delete('sessions', sessionId);
  }
  
  /**
   * Destroys all sessions (used on logout).
   */
  static async destroyAllSessions(): Promise<void> {
    const db = await getSessionDB();
    await db.clear('sessions');
    await db.clear('skipped-keys');
  }
}
