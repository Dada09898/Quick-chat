import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoredKey } from './types';
import { CryptoError, ErrorCodes } from './errors';

interface DualConnectDB extends DBSchema {
  keys: {
    key: string;
    value: StoredKey;
  };
}

let dbPromise: Promise<IDBPDatabase<DualConnectDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DualConnectDB>('dualconnect-crypto', 1, {
      upgrade(db) {
        db.createObjectStore('keys', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

/**
 * Stores a CryptoKey securely in IndexedDB.
 */
export async function storeKey(id: string, type: StoredKey['type'], keyPath: CryptoKey): Promise<void> {
  try {
    const db = await getDB();
    await db.put('keys', {
      id,
      type,
      keyPath,
      createdAt: Date.now(),
    });
  } catch (err) {
    throw new CryptoError('Failed to store key in IndexedDB', ErrorCodes.STORAGE_ERROR, err);
  }
}

/**
 * Retrieves a CryptoKey from IndexedDB.
 */
export async function getKey(id: string): Promise<CryptoKey | null> {
  try {
    const db = await getDB();
    const record = await db.get('keys', id);
    return record ? record.keyPath : null;
  } catch (err) {
    throw new CryptoError('Failed to retrieve key from IndexedDB', ErrorCodes.STORAGE_ERROR, err);
  }
}

/**
 * Deletes a CryptoKey from IndexedDB.
 */
export async function deleteKey(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('keys', id);
  } catch (err) {
    throw new CryptoError('Failed to delete key from IndexedDB', ErrorCodes.STORAGE_ERROR, err);
  }
}

/**
 * Wipes all keys from the database (Global Logout / Emergency Lock).
 */
export async function clearAllKeys(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('keys');
  } catch (err) {
    throw new CryptoError('Failed to clear keys', ErrorCodes.STORAGE_ERROR, err);
  }
}
