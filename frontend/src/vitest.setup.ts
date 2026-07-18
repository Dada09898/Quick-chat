import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto API for JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    configurable: true
  });
}
