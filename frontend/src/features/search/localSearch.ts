import { getDB } from '../sync/idb';

/**
 * A strictly local, zero-knowledge search index.
 * Words are hashed so that the plaintext terms never exist statically on disk.
 */

async function hashKeyword(word: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(word.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function indexMessageLocally(messageId: string, plaintext: string) {
  const db = await getDB();
  const words = plaintext.match(/\b\w+\b/g) || [];
  
  // Create a unique set of lowercase words
  const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase())));
  
  const tx = db.transaction('search', 'readwrite');
  const store = tx.objectStore('search');
  
  for (const word of uniqueWords) {
    const hashed = await hashKeyword(word);
    const existing = await store.get(hashed);
    
    if (existing) {
      if (!existing.message_ids.includes(messageId)) {
        existing.message_ids.push(messageId);
        await store.put(existing);
      }
    } else {
      await store.put({
        keyword_hash: hashed,
        message_ids: [messageId]
      });
    }
  }
  
  await tx.done;
}

export async function searchLocalMessages(query: string): Promise<string[]> {
  const db = await getDB();
  const words = query.match(/\b\w+\b/g) || [];
  if (words.length === 0) return [];
  
  let resultIds: string[] | null = null;
  const store = db.transaction('search', 'readonly').objectStore('search');
  
  for (const word of words) {
    const hashed = await hashKeyword(word.toLowerCase());
    const match = await store.get(hashed);
    
    if (!match) {
      // AND logic: if any word doesn't match, return empty
      return [];
    }
    
    if (resultIds === null) {
      resultIds = match.message_ids;
    } else {
      // Intersect for AND matching
      resultIds = resultIds.filter(id => match.message_ids.includes(id));
    }
  }
  
  return resultIds || [];
}
