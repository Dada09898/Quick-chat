import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  url: string;
  durationText?: string;
  isOwn?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ url, durationText, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl bg-black/15 border border-white/10 my-1 w-full max-w-[280px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition shadow-md ${
          isOwn ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#00a884] text-[#111b21]'
        }`}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1">
        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-[2px] h-6 w-full cursor-pointer overflow-hidden">
          {Array.from({ length: 24 }).map((_, idx) => {
            const heightPct = [40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 35, 95, 65, 85, 40, 70, 55, 90, 30, 60, 80, 45, 70, 50][idx % 24];
            const isPassed = (idx / 24) * 100 <= progress;
            return (
              <div
                key={idx}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isPassed ? 'bg-[#00a884]' : 'bg-[#8696a0]/40'
                } ${isPlaying ? 'animate-pulse' : ''}`}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8696a0] font-mono px-0.5">
          <span className="flex items-center gap-1">
            <Mic size={10} className="text-[#00a884]" /> {durationText || '0:15'}
          </span>
          <button
            onClick={cycleSpeed}
            className="px-1.5 py-0.5 bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942] rounded-md font-sans text-[10px] font-bold border border-[#2a3942] transition"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
