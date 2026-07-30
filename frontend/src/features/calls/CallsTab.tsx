import React from 'react';
import { PhoneCall, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { useCallStore } from './CallStore';

export const CallsTab: React.FC = () => {
  const startCall = useCallStore(state => state.startCall);

  // Mock recent calls history matching WhatsApp Web Call Log format
  const recentCalls = [
    {
      id: '1',
      name: 'Alex Johnson',
      type: 'video' as const,
      direction: 'incoming' as const,
      timestamp: 'Today, 10:30 AM',
      duration: '4m 12s'
    },
    {
      id: '2',
      name: 'Sarah Connor',
      type: 'audio' as const,
      direction: 'outgoing' as const,
      timestamp: 'Yesterday, 8:15 PM',
      duration: '12m 45s'
    },
    {
      id: '3',
      name: 'Development Group Call',
      type: 'video' as const,
      direction: 'missed' as const,
      timestamp: 'Jul 28, 4:20 PM',
      duration: 'Missed'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <h3 className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Recent Calls</h3>
      </div>

      {recentCalls.map(call => (
        <div
          key={call.id}
          className="flex items-center justify-between p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] transition cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold text-sm flex items-center justify-center border border-[#00a884]/30">
              {call.name[0].toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#e9edef] group-hover:text-[#00a884] transition">
                {call.name}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-[#8696a0] mt-0.5">
                {call.direction === 'incoming' && <PhoneIncoming size={13} className="text-[#00a884]" />}
                {call.direction === 'outgoing' && <PhoneOutgoing size={13} className="text-[#00a884]" />}
                {call.direction === 'missed' && <PhoneMissed size={13} className="text-red-400" />}
                <span>{call.timestamp}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startCall(call.id, call.type === 'video')}
              className="p-2.5 rounded-full bg-[#111b21] hover:bg-[#00a884] hover:text-[#111b21] text-[#00a884] border border-[#222d34] transition shadow-sm"
              title={`Call ${call.name}`}
            >
              {call.type === 'video' ? <Video size={18} /> : <PhoneCall size={18} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
