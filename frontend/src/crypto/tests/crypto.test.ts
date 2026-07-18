import { describe, it, expect, beforeAll } from 'vitest';
import { 
  generateRandomBytes, 
  generateNonce, 
  bufferToBase64, 
  base64ToBuffer 
} from '../random';
import { 
  generateEd25519KeyPair, 
  generateX25519KeyPair, 
  signData, 
  verifySignature, 
  deriveSharedSecret,
  exportPublicKey,
  importPublicKey
} from '../keys';
import { encryptAESGCM, decryptAESGCM, importAesGcmKey } from '../aes';
import { deriveHKDFKey } from '../hkdf';

describe('Cryptography Primitives', () => {
  it('should generate secure random bytes', () => {
    const r1 = generateRandomBytes(32);
    const r2 = generateRandomBytes(32);
    expect(r1.length).toBe(32);
    expect(r1).not.toEqual(r2); // Extremely unlikely to match
  });

  it('should generate a 12-byte nonce', () => {
    const nonce = generateNonce();
    expect(nonce.length).toBe(12);
  });

  it('should encode and decode base64 safely', () => {
    const original = new Uint8Array([1, 2, 3, 255]);
    const b64 = bufferToBase64(original);
    const decoded = base64ToBuffer(b64);
    expect(decoded).toEqual(original);
  });

  it('should generate Ed25519 keys, sign and verify', async () => {
    const keyPair = await generateEd25519KeyPair();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();

    const data = "hello world";
    const signature = await signData(keyPair.privateKey, data);
    expect(signature).toBeTypeOf('string');

    const isValid = await verifySignature(keyPair.publicKey, signature, data);
    expect(isValid).toBe(true);

    const isInvalid = await verifySignature(keyPair.publicKey, signature, "tampered");
    expect(isInvalid).toBe(false);
  });

  it('should generate X25519 keys, export/import, and derive shared secret', async () => {
    const aliceKeys = await generateX25519KeyPair();
    const bobKeys = await generateX25519KeyPair();

    const alicePubExport = await exportPublicKey(aliceKeys.publicKey);
    const bobPubExport = await exportPublicKey(bobKeys.publicKey);

    const importedBobPub = await importPublicKey(bobPubExport, 'X25519');
    const importedAlicePub = await importPublicKey(alicePubExport, 'X25519');

    const aliceShared = await deriveSharedSecret(aliceKeys.privateKey, importedBobPub);
    const bobShared = await deriveSharedSecret(bobKeys.privateKey, importedAlicePub);

    // Derive AES keys from shared secret
    const aliceHKDF = await deriveHKDFKey(aliceShared, new Uint8Array(32)); // Fixed salt for test
    const bobHKDF = await deriveHKDFKey(bobShared, new Uint8Array(32));

    // Both should now be able to encrypt/decrypt each other's messages
    const plaintext = "super secret message";
    const encrypted = await encryptAESGCM(aliceHKDF.key, plaintext);
    
    const decrypted = await decryptAESGCM(bobHKDF.key, encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
