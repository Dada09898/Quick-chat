// Using WebCrypto API for AES-256-GCM operations
export class VaultCryptoEngine {
  
  /**
   * Generates a unique Data Encryption Key (DEK) for a VaultItem.
   */
  static async generateDEK(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Wraps the VaultItem's DEK with the user's Master Key using AES-KW or AES-GCM.
   */
  static async wrapDEK(dek: CryptoKey, masterKey: CryptoKey): Promise<string> {
    const exportedDEK = await window.crypto.subtle.exportKey('raw', dek);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const wrapped = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      exportedDEK
    );
    
    // Concatenate IV + WrappedKey and encode as Base64 for transit
    const combined = new Uint8Array(iv.length + wrapped.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrapped), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Unwraps the VaultItem's DEK using the user's Master Key.
   */
  static async unwrapDEK(wrappedKeyB64: string, masterKey: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(atob(wrappedKeyB64).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const wrapped = combined.slice(12);

    const exportedDEK = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      wrapped
    );

    return await window.crypto.subtle.importKey(
      'raw',
      exportedDEK,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts the JSON payload of a VaultItem using the item's raw DEK.
   */
  static async encryptPayload(payload: object, dek: CryptoKey): Promise<string> {
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      encoded
    );
    
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts the JSON payload using the VaultItem's raw DEK.
   */
  static async decryptPayload(ciphertextB64: string, dek: CryptoKey): Promise<any> {
    const combined = new Uint8Array(atob(ciphertextB64).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dek,
      ciphertext
    );

    const jsonStr = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonStr);
  }
}
