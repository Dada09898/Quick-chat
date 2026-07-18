import React from 'react';
import { useChatStore } from './chatStore';

export const RightPanel: React.FC = () => {
  const activeConversationId = useChatStore(state => state.activeConversationId);

  if (!activeConversationId) {
    return null;
  }

  return (
    <div className="w-[320px] bg-[#111b21] border-l border-[#222d34] h-full hidden xl:flex flex-col shrink-0">
      <div className="px-4 py-3 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between shrink-0 h-[60px]">
        <h2 className="text-[#e9edef] font-semibold">Contact Info</h2>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col items-center">
        {/* Placeholder for Profile Details */}
        <div className="w-24 h-24 rounded-full bg-gray-600 mb-4 flex items-center justify-center">
          <span className="text-3xl text-gray-300">?</span>
        </div>
        <h3 className="text-xl font-semibold text-[#e9edef] mb-1">Target User</h3>
        <p className="text-[#8696a0] text-sm mb-6">Online</p>
        
        {/* Placeholder for Media/Links/Docs */}
        <div className="w-full bg-[#202c33] rounded-lg p-4 mb-4">
          <p className="text-[#8696a0] text-sm">Media, links and docs</p>
        </div>

        {/* Placeholder for AI Summary */}
        <div className="w-full bg-[#202c33] rounded-lg p-4 mb-4">
          <p className="text-[#8696a0] text-sm mb-2">AI Summary</p>
          <p className="text-sm text-[#e9edef]">Not available in this phase.</p>
        </div>
      </div>
    </div>
  );
};
