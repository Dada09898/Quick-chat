import React from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface GroupCallLayoutProps {
  participants: Participant[];
}

export const GroupCallLayout: React.FC<GroupCallLayoutProps> = ({ participants }) => {
  const getGridCols = () => {
    if (participants.length <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (participants.length <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  return (
    <div className={`grid ${getGridCols()} gap-3 w-full h-full p-3 bg-[#0b141a]`}>
      {participants.map(p => (
        <div
          key={p.id}
          className="relative bg-[#111b21] border border-[#222d34] rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-[160px] shadow-lg group"
        >
          {p.isVideoOff ? (
            <div className="w-16 h-16 rounded-full bg-[#202c33] border border-[#00a884]/40 flex items-center justify-center text-[#00a884] font-bold text-xl shadow-inner">
              {p.name[0].toUpperCase()}
            </div>
          ) : (
            <div className="w-full h-full bg-[#182229] flex items-center justify-center text-[#8696a0]">
              <span className="text-xs">Video Stream</span>
            </div>
          )}

          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-xs text-[#e9edef]">
            <span className="font-medium">{p.name}</span>
            {p.isMuted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-[#00a884]" />}
          </div>
        </div>
      ))}
    </div>
  );
};
