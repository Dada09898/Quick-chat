import React, { useState, useEffect } from 'react';
import { PhoneCall, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { useCallStore } from './CallStore';
import { apiJson } from '../../lib/api';

export const CallsTab: React.FC = () => {
  const startCall = useCallStore(state => state.startCall);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiJson('/api/calls/history/')
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.results || [];
          if (isMounted) setRecentCalls(items);
        } else {
          if (isMounted) setRecentCalls([]);
        }
      })
      .catch(() => {
        if (isMounted) setRecentCalls([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <h3 className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Recent Calls</h3>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-xs text-[#8696a0]">Loading calls...</div>
      ) : recentCalls.length === 0 ? (
        <div className="text-center py-12 px-4 space-y-2">
          <PhoneCall size={44} className="mx-auto text-[#8696a0]/50" />
          <h4 className="text-sm font-semibold text-[#e9edef]">No recent calls</h4>
          <p className="text-xs text-[#8696a0]">Audio and video calls made in QuickChat will appear here.</p>
        </div>
      ) : (
        recentCalls.map(call => {
          const callerName = call.caller_name || call.participants?.[0] || 'Unknown User';
          const callDate = call.started_at
            ? new Date(call.started_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Recent';

          return (
            <div
              key={call.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold text-sm flex items-center justify-center border border-[#00a884]/30">
                  {callerName[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#e9edef] group-hover:text-[#00a884] transition">
                    {callerName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-[#8696a0] mt-0.5">
                    {call.direction === 'incoming' && <PhoneIncoming size={13} className="text-[#00a884]" />}
                    {call.direction === 'outgoing' && <PhoneOutgoing size={13} className="text-[#00a884]" />}
                    {call.direction === 'missed' && <PhoneMissed size={13} className="text-red-400" />}
                    <span>{callDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall(call.id, callerName, call.call_type === 'video')}
                  className="p-2 hover:bg-[#374248] rounded-full text-[#00a884] transition"
                  title="Call Back"
                >
                  {call.call_type === 'video' ? <Video size={18} /> : <PhoneCall size={18} />}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
