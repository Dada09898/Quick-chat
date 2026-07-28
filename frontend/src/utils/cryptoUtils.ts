/**
 * Centralized Ciphertext Decoding Utility.
 * Supports full Unicode decoding for legacy and current plaintext payloads.
 */
export function decodeCiphertext(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    // Attempt JSON parse in case it's an EncryptedMessage payload
    if (ciphertext.trim().startsWith('{')) {
      const parsed = JSON.parse(ciphertext);
      if (parsed.sessionId && parsed.payload) {
        return `[Encrypted Message]`;
      }
    }
    return decodeURIComponent(escape(atob(ciphertext)));
  } catch {
    try { return atob(ciphertext); } catch { return ciphertext; }
  }
}
