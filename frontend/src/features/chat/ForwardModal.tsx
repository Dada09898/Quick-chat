import React, { useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { X, Search } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';

export const ForwardModal: React.FC = () => {
  const forwardingMessageIds = useChatStore(state => state.forwardingMessageIds);
  const setForwardingMessageIds = useChatStore(state => state.setForwardingMessageIds);
  const conversations = useChatStore(state => state.conversations);
  const enqueueMessage = useChatStore(state => state.enqueueMessage);
  const messages = useChatStore(state => state.messages);
  const user = useAuthStore(state => state.user);
  const { sendEvent } = useRealtime();

  const [search, setSearch] = useState('');
  const [selectedConvs, setSelectedConvs] = useState<string[]>([]);

  if (forwardingMessageIds.length === 0) return null;

  const handleForward = () => {
    if (!user) return;

    selectedConvs.forEach(convId => {
      forwardingMessageIds.forEach(msgId => {
        const originalMsg = messages[msgId];
        if (!originalMsg) return;

        const newMsgId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        // Forwarding implies re-encrypting for the new conversation in a real E2EE scenario.
        // For now, we simulate it by copying the plaintext and running the mock encryption.
        const plaintext = originalMsg.decrypted_text || "Forwarded media";
        const ciphertext = btoa(unescape(encodeURIComponent(plaintext)));

        const newMsg = {
          id: newMsgId,
          conversation_id: convId,
          sender_id: user.id,
          ciphertext,
          nonce: 'pending',
          signature: 'UNVERIFIED',
          key_version: 1,
          algorithm: 'AES-256-GCM',
          created_at: createdAt,
          is_edited: false,
          deleted_at: null,
          status: 'queued' as const,
          decrypted_text: plaintext,
          media_attachments: originalMsg.media_attachments
        };

        enqueueMessage(newMsg);

        sendEvent('message.send', {
          id: newMsgId,
          conversation_id: convId,
          ciphertext,
          nonce: 'pending',
          signature: 'UNVERIFIED',
          key_version: 1,
          algorithm: 'AES-256-GCM',
          created_at: createdAt
          // Real backend might need media_id if attaching media
        });
      });
    });

    setForwardingMessageIds([]);
  };

  const filteredConvs = conversations.filter(c => {
    const otherMember = c.members?.find((m: any) => m.user?.id !== user?.id)?.user;
    const name = otherMember?.display_name || otherMember?.username || otherMember?.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#111b21] w-full max-w-md rounded-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 bg-[#202c33]">
          <h2 className="text-[#e9edef] font-medium text-lg">Forward message to</h2>
          <button onClick={() => setForwardingMessageIds([])} className="text-[#aebac1] hover:text-[#d1d7db]">
            <X size={24} />
          </button>
        </div>

        <div className="p-3 bg-[#111b21] border-b border-[#222d34]">
          <div className="relative bg-[#202c33] rounded-lg flex items-center px-3 py-2">
            <Search size={18} className="text-[#8696a0]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none text-[#d1d7db] ml-3 w-full focus:outline-none placeholder-[#8696a0]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredConvs.map(conv => {
            const otherMember = conv.members?.find((m: any) => m.user?.id !== user?.id)?.user;
            const name = otherMember?.display_name || otherMember?.username || otherMember?.email?.split('@')[0] || 'Unknown';
            const isSelected = selectedConvs.includes(conv.id);

            return (
              <label key={conv.id} className="flex items-center gap-3 p-3 hover:bg-[#202c33] rounded-lg cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedConvs([...selectedConvs, conv.id]);
                    else setSelectedConvs(selectedConvs.filter(id => id !== conv.id));
                  }}
                  className="w-5 h-5 rounded border-[#8696a0] bg-transparent checked:bg-[#00a884] checked:border-transparent focus:ring-0 focus:ring-offset-0"
                />
                <Avatar name={name} url={otherMember?.avatar} size="md" />
                <span className="text-[#e9edef] text-[15px]">{name}</span>
              </label>
            );
          })}
        </div>

        {selectedConvs.length > 0 && (
          <div className="p-4 bg-[#202c33] flex justify-end">
            <button
              onClick={handleForward}
              className="bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-medium py-2 px-6 rounded-full transition-colors"
            >
              Send ({selectedConvs.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
