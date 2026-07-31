import { CryptoError, ErrorCodes } from './errors';
import { generateRandomBytes, bufferToBase64, base64ToBuffer } from './random';
import { importAesGcmKey, encryptAESGCM, decryptAESGCM } from './aes';
import { KeyManager } from './KeyManager';

/**
 * Generates a strong random Recovery Key for encrypting backups.
 */
export function generateRecoveryKey(): string {
  const rawKey = generateRandomBytes(32); // 256 bits
  return bufferToBase64(rawKey);
}

/**
 * Exports all private keys, encrypts them with the recovery key, and returns a JSON string.
 */
export async function createEncryptedBackup(recoveryKeyBase64: string): Promise<string> {
  try {
    const recoveryKeyRaw = base64ToBuffer(recoveryKeyBase64);
    const aesKey = await importAesGcmKey(recoveryKeyRaw);

    const identityKey = await KeyManager.getIdentityPrivateKey();
    const exchangeKey = await KeyManager.getExchangePrivateKey();

    // Export raw private keys (must be generated with extractable=true)
    const identityExport = await window.crypto.subtle.exportKey('pkcs8', identityKey);
    const exchangeExport = await window.crypto.subtle.exportKey('pkcs8', exchangeKey);

    const backupPayload = {
      version: 1,
      identity: bufferToBase64(identityExport),
      exchange: bufferToBase64(exchangeExport),
    };

    const encrypted = await encryptAESGCM(aesKey, JSON.stringify(backupPayload));
    
    return JSON.stringify({
      format: 'dualconnect-backup',
      ...encrypted
    });
  } catch (err) {
    throw new CryptoError('Backup generation failed', ErrorCodes.ENCRYPTION_FAILED, err);
  }
}

/**
 * Restores keys from an encrypted backup using the recovery key.
 */
export async function restoreEncryptedBackup(backupJson: string, recoveryKeyBase64: string): Promise<void> {
  try {
    const backup = JSON.parse(backupJson);
    if (backup.format !== 'dualconnect-backup') throw new Error('Invalid backup format');

    const recoveryKeyRaw = base64ToBuffer(recoveryKeyBase64);
    const aesKey = await importAesGcmKey(recoveryKeyRaw);

    const decryptedStr = await decryptAESGCM(aesKey, {
      ciphertext: backup.ciphertext,
      iv: backup.iv
    });

    const parsed = JSON.parse(decryptedStr);

    const identityRaw = base64ToBuffer(parsed.identity);
    const exchangeRaw = base64ToBuffer(parsed.exchange);

    const importedIdentity = await window.crypto.subtle.importKey(
      'pkcs8',
      identityRaw as BufferSource,
      { name: 'Ed25519' },
      true,
      ['sign']
    );

    const importedExchange = await window.crypto.subtle.importKey(
      'pkcs8',
      exchangeRaw as BufferSource,
      { name: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    );

    // Save back to IndexedDB
    const { storeKey, clearAllKeys } = await import('./storage');
    await clearAllKeys();
    
    await storeKey('identity_private', 'ed25519', importedIdentity);
    await storeKey('exchange_private', 'x25519', importedExchange);
  } catch (err) {
    throw new CryptoError('Backup restoration failed', ErrorCodes.DECRYPTION_FAILED, err);
  }
}
