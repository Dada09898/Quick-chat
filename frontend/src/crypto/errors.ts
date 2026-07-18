export class CryptoError extends Error {
  constructor(message: string, public readonly code: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'CryptoError';
  }
}

export const ErrorCodes = {
  KEY_GENERATION_FAILED: 'KEY_GENERATION_FAILED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  KEY_DERIVATION_FAILED: 'KEY_DERIVATION_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  KEY_NOT_FOUND: 'KEY_NOT_FOUND',
  INTEGRITY_CHECK_FAILED: 'INTEGRITY_CHECK_FAILED',
} as const;
