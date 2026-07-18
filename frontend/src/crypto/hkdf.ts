import { CryptoError, ErrorCodes } from './errors';
import { generateRandomBytes } from './random';

/**
 * Derives an AES-GCM key from a shared secret using HKDF-SHA256.
 * @param sharedSecret The ECDH derived bits (raw).
 * @param salt Optional salt (should be same on both ends, or passed along).
 * @param info Application specific info binding.
 * @returns An AES-GCM CryptoKey and the salt used.
 */
export async function deriveHKDFKey(
  sharedSecret: CryptoKey, 
  salt?: Uint8Array, 
  info: string = 'DualConnect-E2EE-v1'
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  try {
    const actualSalt = salt || generateRandomBytes(32);
    const encoder = new TextEncoder();
    
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: actualSalt,
        info: encoder.encode(info),
        hash: 'SHA-256',
      },
      sharedSecret,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return { key: derivedKey, salt: actualSalt };
  } catch (err) {
    throw new CryptoError('HKDF Key Derivation failed', ErrorCodes.KEY_DERIVATION_FAILED, err);
  }
}
