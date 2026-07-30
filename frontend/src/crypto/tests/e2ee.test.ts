import { describe, it, expect, beforeEach } from 'vitest';
import { generateX25519KeyPair, generateEd25519KeyPair, exportPublicKey, deriveSharedSecret, signData, verifySignature } from '../keys';
import { SessionManager, KeyBundle } from '../SessionManager';
import { encryptAESGCM, decryptAESGCM } from '../aes';
import { deriveHKDFKey } from '../hkdf';
import { generateRandomBytes } from '../random';

describe('Signal Protocol & E2E Encryption Test Suite', () => {
  it('should execute full X3DH key agreement and session setup', async () => {
    // 1. Setup Bob's keys (remote user)
    const bobIdentity = await generateEd25519KeyPair();
    const bobSignedPreKey = await generateX25519KeyPair();
    const bobOneTimePreKey = await generateX25519KeyPair();

    const bobIdentityPubB64 = await exportPublicKey(bobIdentity.publicKey);
    const bobSignedPreKeyPubB64 = await exportPublicKey(bobSignedPreKey.publicKey);
    const bobOTPKPubB64 = await exportPublicKey(bobOneTimePreKey.publicKey);
    const signature = await signData(bobIdentity.privateKey, bobSignedPreKeyPubB64);

    const bobBundle: KeyBundle = {
      deviceId: 'bob-device-1',
      identityKey: bobIdentityPubB64,
      signedPreKey: bobSignedPreKeyPubB64,
      signedPreKeySignature: signature,
      oneTimePreKey: bobOTPKPubB64,
    };

    // 2. Setup Alice's identity (local user)
    const aliceIdentity = await generateX25519KeyPair();
    const aliceIdentityEd = await generateEd25519KeyPair();
    const aliceIdentityPubB64 = await exportPublicKey(aliceIdentityEd.publicKey);

    // 3. Initiate X3DH session
    const { session, ephemeralPublicKey } = await SessionManager.initiateSession(
      aliceIdentity.privateKey,
      aliceIdentityPubB64,
      bobBundle
    );

    expect(session.id).toBeDefined();
    expect(ephemeralPublicKey).toBeDefined();
    expect(session.remoteDeviceId).toBe('bob-device-1');

    // 4. Responder (Bob) derives responder session matching Alice's initiator session
    const responderSession = await SessionManager.respondToSession({
      ownSignedPreKeyPrivate: bobSignedPreKey.privateKey,
      ownOneTimePreKeyPrivate: bobOneTimePreKey.privateKey,
      senderIdentityPublicKeyB64: await exportPublicKey(aliceIdentity.publicKey),
      senderEphemeralPublicKeyB64: ephemeralPublicKey,
      remoteUserId: 'alice-user-id',
      remoteDeviceId: 'alice-device-1',
      sessionId: session.id,
      localIdentityPublicKeyB64: bobSignedPreKeyPubB64
    });

    expect(responderSession.rootKey).toBe(session.rootKey);
    expect(responderSession.receiveChainKey).toBe(session.sendChainKey);
  });

  it('should encrypt and decrypt messages with Double Ratchet forward secrecy', async () => {
    const keyPair = await generateX25519KeyPair();
    const sharedSecret = await deriveSharedSecret(keyPair.privateKey, keyPair.publicKey);
    const hkdf = await deriveHKDFKey(sharedSecret, generateRandomBytes(32));

    const plaintext = 'Secret payload for verification';
    const encrypted = await encryptAESGCM(hkdf.key, plaintext);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();

    const decrypted = await decryptAESGCM(hkdf.key, encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should reject tampered ciphertext or modified auth tag', async () => {
    const keyPair = await generateX25519KeyPair();
    const sharedSecret = await deriveSharedSecret(keyPair.privateKey, keyPair.publicKey);
    const hkdf = await deriveHKDFKey(sharedSecret, generateRandomBytes(32));

    const plaintext = 'Tamper test message';
    const encrypted = await encryptAESGCM(hkdf.key, plaintext);

    // Modify 1 byte in ciphertext
    const tamperedBuf = new Uint8Array(atob(encrypted.ciphertext).split('').map(c => c.charCodeAt(0)));
    tamperedBuf[0] ^= 0xff;
    const tamperedB64 = btoa(String.fromCharCode(...tamperedBuf));

    await expect(decryptAESGCM(hkdf.key, { ...encrypted, ciphertext: tamperedB64 })).rejects.toThrow();
  });

  it('should verify Ed25519 signatures and reject invalid signatures', async () => {
    const edKeyPair = await generateEd25519KeyPair();
    const data = 'Critical System Message';
    const signature = await signData(edKeyPair.privateKey, data);

    const isValid = await verifySignature(edKeyPair.publicKey, signature, data);
    expect(isValid).toBe(true);

    const isFakeValid = await verifySignature(edKeyPair.publicKey, signature, 'Altered System Message');
    expect(isFakeValid).toBe(false);
  });
});
