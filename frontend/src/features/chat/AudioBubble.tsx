import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioBubbleProps {
  url: string;
  duration?: number;
  isOwn: boolean;
}

export const AudioBubble: React.FC<AudioBubbleProps> = ({ url, duration: initialDuration, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [waveformBars] = useState(() =>
    Array.from({ length: 30 }, () => 0.2 + Math.random() * 0.8)
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) audioRef.current.playbackRate = newRate;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
    setProgress(ratio);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[280px] sm:max-w-[320px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const audio = e.target as HTMLAudioElement;
          if (!isNaN(audio.duration) && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        }}
        onTimeUpdate={(e) => {
          const audio = e.target as HTMLAudioElement;
          setCurrentTime(audio.currentTime);
          setProgress(audio.currentTime / (audio.duration || 1));
        }}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
      />

      {/* Play/Pause button */}
      <button
        onClick={togglePlayback}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isOwn ? 'bg-[#00a884]/20 text-[#e9edef]' : 'bg-[#00a884]/20 text-[#00a884]'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Waveform with progress */}
        <div
          className="flex items-center gap-[2px] h-6 cursor-pointer"
          onClick={handleSeek}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {waveformBars.map((height, i) => {
            const barProgress = i / waveformBars.length;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-100 ${
                  isActive
                    ? (isOwn ? 'bg-[#e9edef]' : 'bg-[#00a884]')
                    : (isOwn ? 'bg-[#e9edef]/30' : 'bg-[#8696a0]/40')
                }`}
                style={{ height: `${height * 24}px` }}
              />
            );
          })}
        </div>

        {/* Time and speed */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-mono tabular-nums ${isOwn ? 'text-[#e9edef]/60' : 'text-[#8696a0]'}`}>
            {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
          </span>
          <button
            onClick={cycleSpeed}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isOwn ? 'bg-[#e9edef]/10 text-[#e9edef]/70' : 'bg-[#8696a0]/20 text-[#8696a0]'
            } hover:opacity-80 transition-opacity`}
            aria-label={`Playback speed: ${playbackRate}x`}
          >
            {playbackRate}×
          </button>
        </div>
      </div>
    </div>
  );
};
