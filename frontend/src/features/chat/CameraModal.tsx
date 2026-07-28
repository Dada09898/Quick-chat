import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCw, Send, RefreshCw, Video, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, type: 'image' | 'video') => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const [mode, setMode] = useState<'camera' | 'preview'>('camera');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedType, setCapturedType] = useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startStream = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      console.error('Camera access denied:', err);
      setError('Camera access denied. Please grant permission and try again.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startStream();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [isOpen, facingMode, mode]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedType('image');
        setPreviewUrl(URL.createObjectURL(blob));
        setMode('preview');
        // Stop stream to save battery
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      }
    }, 'image/jpeg', 0.85);
  };

  const startVideoRecording = () => {
    if (!streamRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setCapturedBlob(blob);
      setCapturedType('video');
      setPreviewUrl(URL.createObjectURL(blob));
      setMode('preview');
    };
    recorder.start(100);
    setIsRecording(true);
    setRecordDuration(0);
    timerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl(null);
    setRecordDuration(0);
    setMode('camera');
  };

  const handleSend = () => {
    if (capturedBlob) {
      onCapture(capturedBlob, capturedType);
    }
    onClose();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 z-10">
        <button onClick={onClose} className="text-white p-2" aria-label="Close camera">
          <X size={24} />
        </button>
        {isRecording && (
          <div className="flex items-center gap-2 text-white">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm">{formatTime(recordDuration)}</span>
          </div>
        )}
        {mode === 'camera' && !isRecording && (
          <button onClick={switchCamera} className="text-white p-2" aria-label="Switch camera">
            <RotateCw size={22} />
          </button>
        )}
      </div>

      {/* Viewfinder / Preview */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
        {error ? (
          <div className="text-center p-8">
            <Camera size={48} className="text-[#8696a0] mx-auto mb-4" />
            <p className="text-[#8696a0] text-sm">{error}</p>
            <button onClick={startStream} className="mt-4 text-[#00a884] text-sm hover:underline">Try again</button>
          </div>
        ) : mode === 'camera' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        ) : previewUrl && (
          capturedType === 'image' ? (
            <img src={previewUrl} alt="Captured" className="max-w-full max-h-full object-contain" />
          ) : (
            <video src={previewUrl} controls className="max-w-full max-h-full object-contain" />
          )
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/80 flex items-center justify-center gap-8">
        {mode === 'camera' ? (
          <>
            {!isRecording ? (
              <>
                <button
                  onClick={startVideoRecording}
                  className="w-14 h-14 rounded-full border-4 border-red-500 flex items-center justify-center text-white hover:bg-red-500/20 transition-colors"
                  aria-label="Record video"
                >
                  <Video size={24} />
                </button>
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Take photo"
                >
                  <div className="w-12 h-12 rounded-full bg-white" />
                </button>
              </>
            ) : (
              <button
                onClick={stopVideoRecording}
                className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 transition-colors"
                aria-label="Stop recording"
              >
                <Square size={24} className="text-red-500" />
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-[#374248] flex items-center justify-center">
                <RefreshCw size={22} />
              </div>
              <span className="text-xs">Retake</span>
            </button>
            <button
              onClick={handleSend}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center">
                <Send size={22} />
              </div>
              <span className="text-xs">Send</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
