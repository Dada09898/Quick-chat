import { CryptoError, ErrorCodes } from './errors';

/**
 * Securely generates random bytes using the Web Crypto API.
 */
export function generateRandomBytes(length: number): Uint8Array {
  try {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array;
  } catch (err) {
    throw new CryptoError('Failed to generate random bytes', ErrorCodes.KEY_GENERATION_FAILED, err);
  }
}

/**
 * Generates a standard 12-byte (96-bit) nonce/IV for AES-GCM.
 */
export function generateNonce(): Uint8Array {
  return generateRandomBytes(12);
}

/**
 * Encodes a Uint8Array to a Base64 string safely.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string to a Uint8Array securely.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

/**
 * Secure memory cleanup attempt.
 * JavaScript doesn't allow explicit memory freeing, but we can overwrite typed arrays
 * before letting them be garbage collected to prevent secrets lingering in memory.
 */
export function wipeMemory(array: Uint8Array) {
  if (array && array.length > 0) {
    window.crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      array[i] = 0;
    }
  }
}
