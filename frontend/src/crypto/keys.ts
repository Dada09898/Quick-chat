import { CryptoError, ErrorCodes } from './errors';
import { bufferToBase64, base64ToBuffer } from './random';
import { KeyPairBase64 } from './types';

/**
 * Generates an Ed25519 KeyPair for Identity and Digital Signatures.
 */
export async function generateEd25519KeyPair(): Promise<CryptoKeyPair> {
  try {
    return await window.crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true, // extractable (so we can save it to IDB or backup)
      ['sign', 'verify']
    );
  } catch (err) {
    throw new CryptoError('Ed25519 Generation failed. Browser might not support it natively.', ErrorCodes.KEY_GENERATION_FAILED, err);
  }
}

/**
 * Generates an X25519 KeyPair for Key Exchange (ECDH).
 */
export async function generateX25519KeyPair(): Promise<CryptoKeyPair> {
  try {
    return await window.crypto.subtle.generateKey(
      { name: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    );
  } catch (err) {
    throw new CryptoError('X25519 Generation failed.', ErrorCodes.KEY_GENERATION_FAILED, err);
  }
}

/**
 * Signs a payload using an Ed25519 private key.
 */
export async function signData(privateKey: CryptoKey, data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const signatureBuffer = await window.crypto.subtle.sign(
      { name: 'Ed25519' },
      privateKey,
      encoder.encode(data)
    );
    return bufferToBase64(signatureBuffer);
  } catch (err) {
    throw new CryptoError('Failed to sign data', ErrorCodes.SIGNATURE_FAILED, err);
  }
}

/**
 * Verifies an Ed25519 signature using a public key.
 */
export async function verifySignature(publicKey: CryptoKey, signatureBase64: string, data: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    return await window.crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      base64ToBuffer(signatureBase64),
      encoder.encode(data)
    );
  } catch (err) {
    throw new CryptoError('Failed to verify signature', ErrorCodes.VERIFICATION_FAILED, err);
  }
}

/**
 * Exports a public key to Base64 (SPKI format) for server upload.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return bufferToBase64(exported);
}

/**
 * Imports a Base64 public key (SPKI format) from the server.
 */
export async function importPublicKey(base64Key: string, algo: 'X25519' | 'Ed25519'): Promise<CryptoKey> {
  const buffer = base64ToBuffer(base64Key);
  const keyUsages = algo === 'X25519' ? [] : ['verify'];
  
  return await window.crypto.subtle.importKey(
    'spki',
    buffer,
    { name: algo },
    true,
    keyUsages as KeyUsage[]
  );
}

/**
 * Derives shared secret bits using ECDH (X25519).
 */
export async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  try {
    return await window.crypto.subtle.deriveKey(
      {
        name: 'X25519',
        public: publicKey
      },
      privateKey,
      { name: 'HKDF' },
      false,
      ['deriveKey', 'deriveBits']
    );
  } catch (err) {
    throw new CryptoError('ECDH Key Exchange failed', ErrorCodes.KEY_DERIVATION_FAILED, err);
  }
}
