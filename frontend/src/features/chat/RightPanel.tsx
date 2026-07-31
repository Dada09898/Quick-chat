import React, { useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon, Link2, FileText, Pin, Shield, Sparkles, ChevronDown, ChevronRight, Bell, Trash2, Ban, ExternalLink, Download, ShieldCheck } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { springPresets } from '../../motion';
import toast from 'react-hot-toast';
import { SecurityCodeModal } from './SecurityCodeModal';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#222d34]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#202c33] transition-colors group"
      >
        <div className="flex items-center gap-3 text-[#aebac1] group-hover:text-[#d1d7db] transition-colors">
          {icon}
          <span className="text-[15px] font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={20} className="text-[#aebac1]" /> : <ChevronRight size={20} className="text-[#aebac1]" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springPresets.accordion}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const RightPanel: React.FC = () => {
  const activeConversationId = useChatStore(state => state.activeConversationId);
  const conversations = useChatStore(state => state.conversations);
  const messages = useChatStore(state => state.messages);
  const toggleRightPanel = useChatStore(state => state.toggleRightPanel);
  const user = useAuthStore(state => state.user);

  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('media');
  const [viewImageFull, setViewImageFull] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  if (!activeConversationId) return null;

  const conv = conversations.find(c => c.id === activeConversationId);
  const otherMember = conv?.members?.find((m: any) => {
    const mId = m?.user?.id || m?.userId || m?.id || m?.user_id;
    return mId && mId !== user?.id;
  });
  const otherUser = otherMember?.user && typeof otherMember.user === 'object' ? otherMember.user : otherMember;
  const displayName = otherUser?.display_name || otherUser?.displayName || otherUser?.username || otherUser?.email?.split('@')[0] || 'Unknown User';

  // Get all active conversation messages
  const convMessages = Object.values(messages).filter(m => m.conversation_id === activeConversationId && !m.deleted_at);

  // Extract media items
  const mediaList: { url: string; name: string; type: string }[] = [];
  const docList: { url: string; name: string }[] = [];
  const linkList: { url: string; text: string }[] = [];

  convMessages.forEach(msg => {
    const rawAttachments: any[] = msg.media_attachments || (msg as any).attachments || [];
    const text = msg.decrypted_text || '';

    // Check attachments
    rawAttachments.forEach(att => {
      const url = att.url || (att.s3_key ? (att.s3_key.startsWith('http') ? att.s3_key : `${VITE_API_URL}/media/${att.s3_key}`) : '');
      const type = att.type || 'document';
      if (['image', 'photo', 'video'].includes(type)) {
        mediaList.push({ url, name: att.s3_key || 'Media', type });
      } else {
        docList.push({ url, name: att.s3_key || 'Document' });
      }
    });

    // Check text media indicators
    if (text.startsWith('📷 ') || text.startsWith('🎥 ')) {
      const fn = text.replace(/^(📷|🎥)\s+/, '');
      const url = `${VITE_API_URL}/media/${fn}`;
      mediaList.push({ url, name: fn, type: text.startsWith('📷 ') ? 'image' : 'video' });
    } else if (text.startsWith('📄 ')) {
      const fn = text.replace(/^📄\s+/, '');
      const url = `${VITE_API_URL}/media/${fn}`;
      docList.push({ url, name: fn });
    }

    // Check URLs
    const urlMatches = text.match(/(https?:\/\/[^\s]+)/g);
    if (urlMatches) {
      urlMatches.forEach(url => linkList.push({ url, text }));
    }
  });

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={springPresets.drawer}
      className="bg-[#111b21] border-l border-[#222d34] h-full flex flex-col shrink-0 overflow-hidden fixed inset-0 z-40 xl:static xl:z-auto"
    >
      {/* Fullscreen Image Overlay */}
      {viewImageFull && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setViewImageFull(null)}
        >
          <img src={viewImageFull} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Drawer Header */}
      <div className="px-4 py-2 bg-[#202c33] border-b border-[#222d34] flex items-center gap-4 shrink-0 h-[60px] w-full xl:w-[320px]">
        <button onClick={toggleRightPanel} className="text-[#aebac1] hover:text-[#d1d7db] transition-colors p-1" aria-label="Close contact info">
          <X size={24} />
        </button>
        <h2 className="text-[#e9edef] font-medium text-base">Contact info</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full xl:w-[320px]">
        {/* Top Profile Card */}
        <div className="flex flex-col items-center py-8 px-4 bg-[#111b21] border-b border-[#222d34]">
          <Avatar name={displayName} url={otherUser?.avatar} size="2xl" className="mb-4 shadow-lg !w-28 !h-28 text-4xl" />
          <h2 className="text-[20px] font-medium text-[#e9edef] mb-1 text-center">{displayName}</h2>
          <p className="text-[13px] text-[#8696a0] mb-6">{otherUser?.email}</p>
          
          <div className="flex items-center gap-4 text-[#00a884]">
             <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition min-w-[75px] ${
                isMuted ? 'bg-yellow-500/10 text-yellow-400' : 'hover:bg-[#202c33] text-[#00a884]'
              }`}
             >
               <Bell size={22} />
               <span className="text-[12px] font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
             </button>
          </div>
        </div>

        {/* Media, Links & Docs Accordion */}
        <AccordionSection title={`Media, links, and docs (${mediaList.length + docList.length + linkList.length})`} icon={<ImageIcon size={20} />} defaultOpen={true}>
          {/* Subtabs */}
          <div className="flex border-b border-[#222d34] mb-3 bg-[#111b21]">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'media' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0]'
              }`}
            >
              Media ({mediaList.length})
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'docs' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0]'
              }`}
            >
              Docs ({docList.length})
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
                activeTab === 'links' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0]'
              }`}
            >
              Links ({linkList.length})
            </button>
          </div>

          {/* Subtab Content */}
          {activeTab === 'media' && (
            mediaList.length === 0 ? (
              <p className="text-[#8696a0] text-xs text-center py-4">No media shared yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaList.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setViewImageFull(item.url)}
                    className="aspect-square bg-[#202c33] hover:opacity-80 transition cursor-pointer rounded-lg overflow-hidden border border-[#222d34] relative group"
                  >
                    <img src={item.url} alt="Media" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'docs' && (
            docList.length === 0 ? (
              <p className="text-[#8696a0] text-xs text-center py-4">No documents shared yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {docList.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    download={doc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#202c33] hover:bg-[#2a3942] rounded-lg border border-[#222d34] flex items-center justify-between text-xs text-[#e9edef] transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={16} className="text-[#00a884] shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <Download size={14} className="text-[#8696a0] shrink-0" />
                  </a>
                ))}
              </div>
            )
          )}

          {activeTab === 'links' && (
            linkList.length === 0 ? (
              <p className="text-[#8696a0] text-xs text-center py-4">No links shared yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {linkList.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[#202c33] hover:bg-[#2a3942] rounded-lg border border-[#222d34] flex items-center justify-between text-xs text-[#00a884] transition"
                  >
                    <span className="truncate flex-1">{link.url}</span>
                    <ExternalLink size={14} className="text-[#8696a0] shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            )
          )}
        </AccordionSection>

        {/* Pinned Messages */}
        <AccordionSection title="Pinned Messages" icon={<Pin size={20} />}>
          <p className="text-[#8696a0] text-xs text-center py-4">No pinned messages in this chat</p>
        </AccordionSection>

        {/* AI Summary */}
        <AccordionSection title="AI Conversation Summary" icon={<Sparkles size={20} className="text-[#bf59cf]" />}>
          <div className="bg-[#202c33] rounded-lg p-3 border border-[#2a3942]">
            <p className="text-[#d1d7db] text-xs leading-relaxed">
              AI Summary automatically analyzes conversation history to extract key decisions and topic highlights.
            </p>
            <button 
              onClick={() => toast.success('AI summary generated!')}
              className="mt-2.5 text-[#bf59cf] text-xs font-semibold hover:underline"
            >
              Generate Summary
            </button>
          </div>
        </AccordionSection>

        {/* Encryption & Security */}
        <AccordionSection title="Encryption & Security" icon={<Shield size={20} className="text-[#00a884]" />} defaultOpen={true}>
          <p className="text-[#8696a0] text-[12px] leading-relaxed">
            Messages and calls are end-to-end encrypted. No one outside of this chat, not even Kryozen, can read or listen to them.
          </p>
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="mt-3 text-xs font-semibold text-[#00a884] bg-[#00a884]/15 hover:bg-[#00a884]/25 py-2 px-3 rounded-lg border border-[#00a884]/30 transition flex items-center gap-1.5"
          >
            <ShieldCheck size={16} /> Verify Security Code
          </button>
        </AccordionSection>

        {/* Security Modal */}
        <SecurityCodeModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          userName={displayName}
          peerUserId={otherUser?.id}
        />

        {/* Bottom Actions */}
        <div className="mt-4 pb-8">
           <button 
            onClick={() => toast.success(`Blocked ${displayName}`)}
            className="w-full flex items-center gap-4 p-4 hover:bg-[#202c33] transition-colors text-[#f15c6d]"
           >
             <Ban size={20} />
             <span className="text-[15px]">Block {displayName}</span>
           </button>
        </div>
      </div>
    </motion.div>
  );
};
