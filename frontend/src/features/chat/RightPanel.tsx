import React, { useState } from 'react';
import { useChatStore } from './chatStore';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon, Link2, FileText, Users, Pin, Shield, Info, Sparkles, ChevronDown, ChevronRight, Bell, Trash2, Ban } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { layoutVariants, springPresets } from '../../motion';

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
  const toggleRightPanel = useChatStore(state => state.toggleRightPanel);
  const user = useAuthStore(state => state.user);
  
  if (!activeConversationId) return null;

  const conv = conversations.find(c => c.id === activeConversationId);
  const otherUser = conv?.members?.find((m: any) => m.user && m.user.id !== user?.id)?.user;
  const displayName = otherUser?.display_name || otherUser?.username || otherUser?.email?.split('@')[0] || 'Unknown User';

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={springPresets.drawer}
      className="bg-[#111b21] border-l border-[#222d34] h-full flex flex-col shrink-0 overflow-hidden fixed inset-0 z-40 xl:static xl:z-auto"
    >
      <div className="px-4 py-2 bg-[#202c33] border-b border-[#222d34] flex items-center gap-4 shrink-0 h-[60px] w-full xl:w-[320px]">
        <button onClick={toggleRightPanel} className="text-[#aebac1] hover:text-[#d1d7db] transition-colors p-1" aria-label="Close contact info">
          <X size={24} />
        </button>
        <h2 className="text-[#e9edef] font-medium text-base">Contact info</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full xl:w-[320px]">
        {/* Top Section */}
        <div className="flex flex-col items-center py-8 px-4 bg-[#111b21] border-b border-[#222d34]">
          <Avatar name={displayName} url={otherUser?.avatar} size="2xl" className="mb-4 shadow-lg !w-32 !h-32 sm:!w-48 sm:!h-48 text-4xl sm:text-5xl" />
          <h2 className="text-[22px] font-normal text-[#e9edef] mb-1 text-center">{displayName}</h2>
          <p className="text-[14px] text-[#8696a0] mb-6">{otherUser?.email}</p>
          
          <div className="flex items-center gap-6 text-[#00a884]">
             <button className="flex flex-col items-center gap-2 hover:bg-[#202c33] p-3 rounded-xl transition-colors min-w-[70px]">
               <Search size={24} />
               <span className="text-[13px]">Search</span>
             </button>
             <button className="flex flex-col items-center gap-2 hover:bg-[#202c33] p-3 rounded-xl transition-colors min-w-[70px]">
               <Bell size={24} />
               <span className="text-[13px]">Mute</span>
             </button>
          </div>
        </div>

        {/* Accordion Sections */}
        <AccordionSection title="Media, links, and docs" icon={<ImageIcon size={20} />} defaultOpen={true}>
          <div className="grid grid-cols-3 gap-1 mt-2">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-square bg-[#202c33] hover:opacity-80 transition-opacity cursor-pointer rounded-sm flex items-center justify-center">
                 <ImageIcon size={20} className="text-[#8696a0]" />
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection title="Pinned Messages" icon={<Pin size={20} />}>
          <p className="text-[#8696a0] text-sm text-center py-4">No pinned messages</p>
        </AccordionSection>

        <AccordionSection title="AI Conversation Summary" icon={<Sparkles size={20} className="text-[#bf59cf]" />}>
          <div className="bg-[#202c33] rounded-lg p-4 border border-[#2a3942]">
            <p className="text-[#d1d7db] text-sm leading-relaxed">
              AI Summary automatically analyzes conversation history to extract key decisions, action items, and topic highlights.
            </p>
            <button className="mt-3 text-[#bf59cf] text-sm font-medium hover:underline">Generate Summary</button>
          </div>
        </AccordionSection>

        <AccordionSection title="Encryption & Security" icon={<Shield size={20} className="text-[#00a884]" />}>
          <p className="text-[#8696a0] text-[13px] leading-relaxed">
            Messages and calls are end-to-end encrypted. No one outside of this chat, not even Kryozen, can read or listen to them. Click to verify.
          </p>
        </AccordionSection>

        {/* Bottom Actions */}
        <div className="mt-4 pb-8">
           <button className="w-full flex items-center gap-4 p-4 hover:bg-[#202c33] transition-colors text-[#f15c6d]">
             <Ban size={22} />
             <span className="text-[16px]">Block {displayName}</span>
           </button>
           <button className="w-full flex items-center gap-4 p-4 hover:bg-[#202c33] transition-colors text-[#f15c6d]">
             <Trash2 size={22} />
             <span className="text-[16px]">Report contact</span>
           </button>
        </div>

      </div>
    </motion.div>
  );
};
