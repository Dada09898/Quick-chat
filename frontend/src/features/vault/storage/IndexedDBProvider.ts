import { SecureStorageProvider } from './SecureStorageProvider';

/**
 * Web-based Storage Provider using IndexedDB.
 * While secure, this relies strictly on the Browser's sandbox 
 * and doesn't benefit from OS-level hardware encryption.
 */
export class IndexedDBProvider implements SecureStorageProvider {
  private db: IDBDatabase | null = null;
  
  async init(vaultId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`dualconnect_vault_${vaultId}`, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('secure_keys')) {
          db.createObjectStore('secure_keys');
        }
      };
      request.onsuccess = (e: any) => {
        this.db = e.target.result;
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.db) throw new Error("DB not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('secure_keys', 'readonly');
      const store = tx.objectStore('secure_keys');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e);
    });
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('secure_keys', 'readwrite');
      const store = tx.objectStore('secure_keys');
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  }

  async remove(key: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('secure_keys', 'readwrite');
      const store = tx.objectStore('secure_keys');
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  }

  isDesktop(): boolean {
    return false;
  }
}
