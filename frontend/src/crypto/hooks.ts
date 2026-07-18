import { useState, useCallback } from 'react';
import { useCrypto } from './CryptoProvider';
import { KeyManager } from './KeyManager';
import { signData, verifySignature, deriveSharedSecret, importPublicKey } from './keys';
import { encryptAESGCM, decryptAESGCM, importAesGcmKey } from './aes';
import { deriveHKDFKey } from './hkdf';

export function useCryptoOperations() {
  const { isInitialized } = useCrypto();

  const signMessage = useCallback(async (message: string) => {
    if (!isInitialized) throw new Error('Crypto not initialized');
    const privateKey = await KeyManager.getIdentityPrivateKey();
    return await signData(privateKey, message);
  }, [isInitialized]);

  const verifyMessage = useCallback(async (publicKeyBase64: string, signatureBase64: string, data: string) => {
    const pubKey = await importPublicKey(publicKeyBase64, 'Ed25519');
    return await verifySignature(pubKey, signatureBase64, data);
  }, []);

  const establishSessionKey = useCallback(async (remoteX25519PublicBase64: string) => {
    if (!isInitialized) throw new Error('Crypto not initialized');
    const privateKey = await KeyManager.getExchangePrivateKey();
    const remotePublicKey = await importPublicKey(remoteX25519PublicBase64, 'X25519');
    
    // 1. ECDH to get shared bits
    const sharedSecret = await deriveSharedSecret(privateKey, remotePublicKey);
    
    // 2. HKDF to derive strong AES key
    const { key, salt } = await deriveHKDFKey(sharedSecret);
    return { sessionKey: key, salt };
  }, [isInitialized]);

  return { signMessage, verifyMessage, establishSessionKey };
}
