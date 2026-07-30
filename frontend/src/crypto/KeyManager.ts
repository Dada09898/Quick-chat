import { generateEd25519KeyPair, generateX25519KeyPair, exportPublicKey, signData } from './keys';
import { storeKey, getKey, clearAllKeys } from './storage';
import { CryptoError, ErrorCodes } from './errors';

export class KeyManager {
  /**
   * Initializes the device by generating Identity (Ed25519) and Key Exchange (X25519) keys.
   * Stores private keys in IndexedDB and returns Base64 public keys for server registration.
   */
  static async initializeDeviceKeys(): Promise<{ x25519Public: string; ed25519Public: string }> {
    try {
      // 1. Generate Keys
      const ed25519 = await generateEd25519KeyPair();
      const x25519 = await generateX25519KeyPair();

      // 2. Store Private Keys locally
      await storeKey('identity_private', 'ed25519', ed25519.privateKey);
      await storeKey('exchange_private', 'x25519', x25519.privateKey);
      
      // Store Public Keys as well for easy access
      await storeKey('identity_public', 'ed25519', ed25519.publicKey);
      await storeKey('exchange_public', 'x25519', x25519.publicKey);

      // 3. Export Public Keys for server
      const ed25519PublicBase64 = await exportPublicKey(ed25519.publicKey);
      const x25519PublicBase64 = await exportPublicKey(x25519.publicKey);

      return {
        x25519Public: x25519PublicBase64,
        ed25519Public: ed25519PublicBase64,
      };
    } catch (err) {
      console.error(err);
      throw new CryptoError('Device key initialization failed', ErrorCodes.KEY_GENERATION_FAILED, err);
    }
  }

  static async generatePreKeyBundle(count: number = 50): Promise<{
    signedPreKey: { public_key: string; signature: string; key_id: number };
    oneTimePreKeys: { public_key: string; key_id: number }[];
  }> {
    const identityPrivate = await this.getIdentityPrivateKey();

    const spk = await generateX25519KeyPair();
    const spkPublicB64 = await exportPublicKey(spk.publicKey);
    const spkKeyId = Math.floor(Date.now() / 1000) % 1000000;
    const signature = await signData(identityPrivate, spkPublicB64);
    await storeKey(`signed_pre_key_private_${spkKeyId}`, 'x25519', spk.privateKey);

    const oneTimePreKeys = [];
    for (let i = 0; i < count; i++) {
      const otpk = await generateX25519KeyPair();
      const keyId = Date.now() + i;
      const pubB64 = await exportPublicKey(otpk.publicKey);
      await storeKey(`otpk_private_${keyId}`, 'x25519', otpk.privateKey);
      oneTimePreKeys.push({ public_key: pubB64, key_id: keyId });
    }

    return {
      signedPreKey: { public_key: spkPublicB64, signature, key_id: spkKeyId },
      oneTimePreKeys
    };
  }

  static async getIdentityPrivateKey(): Promise<CryptoKey> {
    const key = await getKey('identity_private');
    if (!key) throw new CryptoError('Identity private key not found', ErrorCodes.KEY_NOT_FOUND);
    return key;
  }

  static async getExchangePrivateKey(): Promise<CryptoKey> {
    const key = await getKey('exchange_private');
    if (!key) throw new CryptoError('Exchange private key not found', ErrorCodes.KEY_NOT_FOUND);
    return key;
  }

  static async destroyAllKeys(): Promise<void> {
    await clearAllKeys();
  }
}
