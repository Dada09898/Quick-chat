import { CryptoError, ErrorCodes } from './errors';
import { generateNonce, bufferToBase64, base64ToBuffer, wipeMemory } from './random';
import type { EncryptedPayload } from './types';

/**
 * Imports a raw AES key (e.g., from HKDF) into a CryptoKey for AES-GCM.
 */
export async function importAesGcmKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext using AES-256-GCM.
 */
export async function encryptAESGCM(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  try {
    const iv = generateNonce();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128, // 16 bytes auth tag
      },
      key,
      data
    );

    // Wipe plaintext from memory
    wipeMemory(data);

    return {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv),
    };
  } catch (err) {
    throw new CryptoError('AES Encryption failed', ErrorCodes.ENCRYPTION_FAILED, err);
  }
}

/**
 * Decrypts AES-256-GCM ciphertext.
 */
export async function decryptAESGCM(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  try {
    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new CryptoError('AES Decryption failed - possible integrity check failure', ErrorCodes.DECRYPTION_FAILED, err);
  }
}
