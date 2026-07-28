import '@testing-library/jest-dom';

// Simple in-memory indexedDB stub for Vitest
if (typeof globalThis.indexedDB === 'undefined') {
  const storeMap = new Map<string, any>();
  const mockIDB: any = {
    open: () => ({
      result: {
        createObjectStore: () => {},
        transaction: () => ({
          objectStore: () => ({
            put: async (val: any) => storeMap.set(val.id, val),
            get: async (key: any) => storeMap.get(key),
            delete: async (key: any) => storeMap.delete(key),
            getAll: async () => Array.from(storeMap.values()),
            clear: async () => storeMap.clear()
          }),
          done: Promise.resolve()
        })
      },
      addEventListener: () => {},
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    })
  };
  // @ts-ignore
  globalThis.indexedDB = mockIDB;
}
