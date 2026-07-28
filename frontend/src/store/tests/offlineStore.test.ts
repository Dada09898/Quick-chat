import { describe, it, expect, beforeEach } from 'vitest';
import { offlineDB, CachedMessage, OutboxMessage } from '../offlineStore';

describe('Offline IndexedDB Storage Unit Tests', () => {
  beforeEach(async () => {
    await offlineDB.clearAll();
  });

  it('should cache and retrieve messages for a conversation', async () => {
    const testMessage: CachedMessage = {
      id: 'msg-101',
      conversationId: 'conv-001',
      senderId: 'user-a',
      ciphertext: 'Y2lwaGVydGV4dA==',
      decryptedText: 'Hello Offline Store',
      status: 'delivered',
      createdAt: new Date().toISOString(),
      isEdited: false,
      deletedAt: null,
      replyTo: null,
      mediaAttachments: [],
      reactions: []
    };

    await offlineDB.cacheMessage(testMessage);

    const retrieved = await offlineDB.getMessage('msg-101');
    expect(retrieved).toBeDefined();
    expect(retrieved?.decryptedText).toBe('Hello Offline Store');

    const convMessages = await offlineDB.getMessagesForConversation('conv-001');
    expect(convMessages.length).toBe(1);
    expect(convMessages[0].id).toBe('msg-101');
  });

  it('should manage outbox queueing, retries, and removal', async () => {
    const outboxMsg: OutboxMessage = {
      id: 'outbox-1',
      conversationId: 'conv-001',
      ciphertext: 'b3V0Ym94',
      nonce: 'pending',
      signature: 'UNVERIFIED',
      keyVersion: 1,
      algorithm: 'AES-256-GCM',
      createdAt: new Date().toISOString(),
      replyToId: null,
      mediaId: null,
      mediaKey: null,
      retryCount: 0,
      lastRetryAt: Date.now()
    };

    await offlineDB.enqueueOutbox(outboxMsg);

    let outboxList = await offlineDB.getOutboxMessages();
    expect(outboxList.length).toBe(1);
    expect(outboxList[0].id).toBe('outbox-1');

    await offlineDB.updateOutboxRetry('outbox-1');
    outboxList = await offlineDB.getOutboxMessages();
    expect(outboxList[0].retryCount).toBe(1);

    await offlineDB.removeFromOutbox('outbox-1');
    outboxList = await offlineDB.getOutboxMessages();
    expect(outboxList.length).toBe(0);
  });

  it('should save, retrieve, and delete draft messages', async () => {
    await offlineDB.saveDraft({
      conversationId: 'conv-draft-1',
      text: 'Draft in progress...',
      updatedAt: Date.now()
    });

    let draft = await offlineDB.getDraft('conv-draft-1');
    expect(draft?.text).toBe('Draft in progress...');

    await offlineDB.deleteDraft('conv-draft-1');
    draft = await offlineDB.getDraft('conv-draft-1');
    expect(draft).toBeUndefined();
  });
});
