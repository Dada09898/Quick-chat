import React, { useState, useEffect } from 'react';
import { useRealtimeStore } from '../../realtime/store';

// Basic LWW (Last-Writer-Wins) implementation for shared text
interface CollaborativeNote {
  id: string;
  text: string;
  sync_version: number;
}

export const SharedNotesPanel = ({ conversationId }: { conversationId: string }) => {
  const [note, setNote] = useState<CollaborativeNote>({ id: '', text: '', sync_version: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const sendRealtimeEvent = useRealtimeStore(state => state.sendEvent);
  const addSubscription = useRealtimeStore(state => state.addSubscription);

  useEffect(() => {
    // Subscribe to backend collaboration.sync events
    const unsub = addSubscription('collaboration.sync', (payload) => {
      if (payload.conversation_id === conversationId && payload.object_type === 'note') {
        // LWW Conflict Resolution
        if (payload.sync_version > note.sync_version) {
          setNote({
            id: payload.id,
            text: payload.decrypted_text || '', // Handled by a crypto middleware
            sync_version: payload.sync_version
          });
        }
      }
    });

    // Load saved note from IndexedDB
    const loadNote = async () => {
      try {
        const { offlineDB } = await import('../../store/offlineStore');
        const savedDraft = await offlineDB.getDraft(`note_${conversationId}`);
        if (savedDraft) {
          setNote({ id: conversationId, text: savedDraft.text, sync_version: savedDraft.updatedAt });
        } else {
          setNote({ id: conversationId, text: 'Shared workspace notes for this chat.', sync_version: Date.now() });
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadNote();

    return () => unsub();
  }, [conversationId, note.sync_version, addSubscription]);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newVersion = note.sync_version + 1;
    
    setNote(prev => ({ ...prev, text: newText, sync_version: newVersion }));
    
    try {
      const { offlineDB } = await import('../../store/offlineStore');
      await offlineDB.saveDraft({ conversationId: `note_${conversationId}`, text: newText, updatedAt: newVersion });
    } catch (err) {
      console.error(err);
    }
    
    setIsSyncing(true);
    sendRealtimeEvent('collaboration.update', {
      conversation_id: conversationId,
      object_type: 'note',
      sync_version: newVersion,
      ciphertext: btoa(unescape(encodeURIComponent(newText))),
    });
    
    setTimeout(() => setIsSyncing(false), 300);
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border w-80">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Shared Notes</h3>
        {isSyncing && <span className="text-xs text-accent animate-pulse">Syncing...</span>}
      </div>
      <div className="flex-1 p-2">
        <textarea
          value={note.text}
          onChange={handleTextChange}
          className="w-full h-full p-2 bg-transparent text-foreground resize-none focus:outline-none scrollbar-thin scrollbar-thumb-border"
          placeholder="Type collaborative notes here..."
          aria-label="Shared collaborative notes"
        />
      </div>
    </div>
  );
};
