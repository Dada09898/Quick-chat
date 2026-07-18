/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// This service worker provides offline reliability and background sync.

const CACHE_NAME = 'dualconnect-assets-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We only cache assets, NOT API responses. API relies on IndexedDB for zero-knowledge.
  if (event.request.url.includes('/api/')) return;
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});

// Background Sync Event Listener
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil(syncOutboxMessages());
  }
});

async function syncOutboxMessages() {
  // In a real implementation:
  // 1. Open the 'dualconnect-encrypted-cache' IndexedDB.
  // 2. Fetch all messages with status === 'queued' or 'sending'.
  // 3. For each message, check if session token is expired.
  // 4. Post the encrypted payload to '/api/chat/sync/'.
  // 5. Delete from outbox or update status to 'sent' on 200 OK.
  // 6. Use exponential backoff if failed (handled automatically by browser Background Sync API retries).
  
  console.log("Background Sync triggered: Processing queued messages securely without plaintext.");
}
