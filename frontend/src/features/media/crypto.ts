// Advanced AES-256-GCM chunk encryption pipeline

export async function generateMediaKey(): Promise<{ key: CryptoKey, rawKey: ArrayBuffer, iv: ArrayBuffer }> {
  const rawKey = crypto.getRandomValues(new Uint8Array(32)); // 256-bit MediaKey
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM
  return { key, rawKey: rawKey.buffer, iv: iv.buffer };
}

export async function encryptMediaChunk(
  key: CryptoKey,
  iv: ArrayBuffer,
  chunkData: ArrayBuffer
): Promise<ArrayBuffer> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
      tagLength: 128
    },
    key,
    chunkData
  );
  return encrypted;
}

export async function decryptMediaChunk(
  key: CryptoKey,
  iv: ArrayBuffer,
  encryptedChunk: ArrayBuffer
): Promise<ArrayBuffer> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
      tagLength: 128
    },
    key,
    encryptedChunk
  );
  return decrypted;
}
