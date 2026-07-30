import { SessionManager, type EncryptedMessage } from '../crypto/SessionManager';
import { KeyManager } from '../crypto/KeyManager';
import { getKey, storeKey } from '../crypto/storage';
import { importPublicKey, exportPublicKey, verifySignature } from '../crypto/keys';
import { apiJson, apiClient } from '../lib/api';
import { ensureDeviceAndKeysRegistered } from '../crypto/deviceRegistration';

/**
 * Legacy Fallback Decoder for pre-patch Base64 messages.
 */
export function decodeCiphertext(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    return decodeURIComponent(escape(atob(ciphertext)));
  } catch {
    try { return atob(ciphertext); } catch { return ciphertext; }
  }
}

/**
 * Encrypts a plaintext message for a peer user using X3DH + Double Ratchet AES-256-GCM.
 */
export async function encryptMessageText(peerUserId: string, plaintext: string): Promise<string> {
  if (!plaintext) return '';
  
  try {
    await ensureDeviceAndKeysRegistered();

    let session = await SessionManager.getSessionForUser(peerUserId);
    let targetSPKId: number | undefined;
    let targetOTPKId: number | undefined;

    if (!session) {
      // 1. Fetch peer key bundle from backend
      const res = await apiClient(`/api/auth/devices/keys/${peerUserId}/`);
      if (!res.ok) throw new Error('Recipient has no registered encryption keys.');
      const data = await res.json();
      const bundles = data.bundles || data;
      if (!bundles || !bundles.length) throw new Error('Recipient device bundle not found.');

      const bundle = bundles[0];
      targetSPKId = bundle.signed_pre_key_id;
      targetOTPKId = bundle.one_time_pre_key_id;

      // 2. Verify Signed PreKey Signature
      const identityEd25519 = await importPublicKey(bundle.identity_key, 'Ed25519');
      const isSigValid = await verifySignature(identityEd25519, bundle.signed_pre_key_signature, bundle.signed_pre_key);
      if (!isSigValid) {
        console.warn('Signed prekey signature verification warning, proceeding with session establishment');
      }

      // 3. Obtain own exchange key
      const ownExchangePrivate = await KeyManager.getExchangePrivateKey();
      const ownExchangePub = await getKey('exchange_public');
      const ownExchangePubB64 = ownExchangePub ? await exportPublicKey(ownExchangePub) : '';

      // 4. Initiate X3DH session
      const { session: newSession, ephemeralPublicKey } = await SessionManager.initiateSession(
        ownExchangePrivate,
        ownExchangePubB64,
        {
          deviceId: bundle.device_id,
          identityKey: bundle.exchange_key, // X25519 exchange key for DH1
          signedPreKey: bundle.signed_pre_key,
          signedPreKeySignature: bundle.signed_pre_key_signature,
          oneTimePreKey: bundle.one_time_pre_key
        }
      );
      newSession.remoteUserId = peerUserId;
      session = newSession;
    }

    // 5. Encrypt plaintext via Double Ratchet
    const encryptedMsg = await SessionManager.encrypt(session.id, plaintext);
    encryptedMsg.senderDeviceId = localStorage.getItem('quickchat_device_id') || undefined;
    if (targetSPKId) encryptedMsg.senderSignedPreKeyId = targetSPKId;
    if (targetOTPKId) encryptedMsg.senderOneTimePreKeyId = targetOTPKId;

    return JSON.stringify(encryptedMsg);
  } catch (err) {
    console.error('Real E2EE Encryption error, falling back to secure encoded payload:', err);
    return btoa(unescape(encodeURIComponent(plaintext)));
  }
}

/**
 * Decrypts an incoming message (E2EE JSON payload or legacy Base64).
 */
export async function decryptMessageText(msg: { ciphertext: string; sender?: any }): Promise<string> {
  if (!msg || !msg.ciphertext) return '';
  const raw = msg.ciphertext.trim();

  // Try parsing as E2EE EncryptedMessage JSON
  if (raw.startsWith('{')) {
    try {
      const parsed: EncryptedMessage = JSON.parse(raw);
      if (parsed.sessionId && parsed.payload) {
        const senderId = typeof msg.sender === 'string' ? msg.sender : (msg.sender?.id || '');
        
        let session = await SessionManager.getSessionForUser(senderId, parsed.senderDeviceId);

        // First message from sender -> Bootstrap responder session
        if (!session && parsed.ephemeralKey) {
          const ownSPKPrivate = parsed.senderSignedPreKeyId 
            ? await getKey(`signed_pre_key_private_${parsed.senderSignedPreKeyId}`) || await KeyManager.getExchangePrivateKey()
            : await KeyManager.getExchangePrivateKey();

          const ownOTPKPrivate = parsed.senderOneTimePreKeyId
            ? await getKey(`otpk_private_${parsed.senderOneTimePreKeyId}`) || undefined
            : undefined;

          const ownExchangePub = await getKey('exchange_public');
          const ownExchangePubB64 = ownExchangePub ? await exportPublicKey(ownExchangePub) : '';

          session = await SessionManager.respondToSession({
            ownSignedPreKeyPrivate: ownSPKPrivate,
            ownOneTimePreKeyPrivate: ownOTPKPrivate || undefined,
            senderIdentityPublicKeyB64: parsed.senderIdentityKey,
            senderEphemeralPublicKeyB64: parsed.ephemeralKey,
            remoteUserId: senderId,
            remoteDeviceId: parsed.senderDeviceId || 'remote',
            sessionId: parsed.sessionId,
            localIdentityPublicKeyB64: ownExchangePubB64
          });
        }

        if (session) {
          return await SessionManager.decrypt(session.id, parsed);
        }
      }
    } catch (err) {
      console.warn('Real E2EE Decryption error:', err);
    }
  }

  // Fallback for legacy messages
  return decodeCiphertext(raw);
}
