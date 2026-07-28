import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Pause, Play, Send, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  // States: 'idle' | 'recording' | 'paused' | 'preview'
  const [state, setState] = useState<'recording' | 'paused' | 'preview'>('recording');
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio analysis for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/webm';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('preview');
      };
      
      recorder.start(100); // Collect data every 100ms
      setState('recording');
      
      // Timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      
      // Waveform visualization
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        // Calculate RMS amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalized = Math.min(1, rms * 3); // Amplify for visibility
        setWaveformData(prev => [...prev.slice(-60), normalized]);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
      
    } catch (err) {
      console.error('Microphone access denied:', err);
      onCancel();
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;
    if (state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setState('paused');
    } else if (state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalized = Math.min(1, rms * 3);
        setWaveformData(prev => [...prev.slice(-60), normalized]);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
      setState('recording');
    }
  };

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const handleSend = () => {
    if (blobRef.current) {
      onSend(blobRef.current, duration);
    }
    cleanup();
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 w-full bg-[#202c33] px-3 py-2 rounded-xl"
    >
      {/* Cancel button */}
      <button
        onClick={handleCancel}
        className="p-2 text-[#f15c6d] hover:bg-[#f15c6d]/10 rounded-full transition-colors shrink-0"
        aria-label="Cancel recording"
      >
        <Trash2 size={20} />
      </button>

      {/* Waveform / Preview */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {state === 'preview' ? (
          <>
            <button
              onClick={togglePlayback}
              className="p-2 text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition-colors shrink-0"
              aria-label={isPlaying ? 'Pause playback' : 'Play preview'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); }}
                onTimeUpdate={(e) => {
                  const audio = e.target as HTMLAudioElement;
                  setPlaybackProgress(audio.currentTime / (audio.duration || 1));
                }}
              />
            )}
            {/* Playback progress bar */}
            <div className="flex-1 h-1 bg-[#374248] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00a884] rounded-full transition-all duration-100"
                style={{ width: `${playbackProgress * 100}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Live waveform bars */}
            <div className="flex-1 flex items-center gap-[2px] h-8 overflow-hidden">
              {waveformData.map((amp, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-[#00a884] shrink-0 transition-all duration-75"
                  style={{ height: `${Math.max(4, amp * 32)}px` }}
                />
              ))}
              {waveformData.length === 0 && (
                <div className="flex items-center gap-[2px]">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-[3px] h-1 rounded-full bg-[#374248]" />
                  ))}
                </div>
              )}
            </div>
            {/* Recording indicator */}
            {state === 'recording' && (
              <div className="w-2 h-2 rounded-full bg-[#f15c6d] animate-pulse shrink-0" />
            )}
          </>
        )}

        {/* Duration */}
        <span className="text-[#8696a0] text-sm font-mono tabular-nums shrink-0 min-w-[40px] text-right">
          {formatTime(duration)}
        </span>
      </div>

      {/* Pause/Stop/Send */}
      {state !== 'preview' ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePauseResume}
            className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors"
            aria-label={state === 'recording' ? 'Pause' : 'Resume'}
          >
            {state === 'recording' ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={handleStop}
            className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors"
            aria-label="Stop recording"
          >
            <Square size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleSend}
          className="p-3 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full transition-colors shrink-0"
          aria-label="Send voice message"
        >
          <Send size={18} />
        </button>
      )}
    </motion.div>
  );
};
