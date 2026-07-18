import React, { useEffect, useRef, useState } from 'react';
import { useCallStore } from './CallStore';
import { MediaManager } from './MediaManager';
import { PeerConnectionManager } from './PeerConnectionManager';
import { useRealtimeStore } from '../../realtime/store';
import { realtimeSocket } from '../../realtime/socket';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mediaManager = new MediaManager();
const pcManager = new PeerConnectionManager();

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { state, sessionId, isMuted, isVideoOn, toggleMute, toggleVideo, endCall, setState } = useCallStore();
  // sendEvent was erroneously taken from useRealtimeStore
  // We'll import realtimeSocket directly for sending.
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [networkQuality, setNetworkQuality] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Excellent');

  // Initialize WebRTC on incoming or outgoing call
  useEffect(() => {
    if (state === 'OUTGOING' || state === 'CONNECTING') {
      const initMedia = async () => {
        const stream = await mediaManager.requestMedia(true, true);
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        await pcManager.init(stream!);
        pcManager.onRemoteTrack = (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        if (state === 'OUTGOING') {
          // Send offer
          const offer = await pcManager.createOffer();
          realtimeSocket.send('call.offer', { 
            session_id: sessionId, 
            conversation_id: useCallStore.getState().conversationId,
            sdp: offer 
          });
        }
      };
      initMedia();
    }
  }, [state, sessionId, sendEvent]);

  // Handle incoming signaling
  useEffect(() => {
    const handleOffer = async (e: Event) => {
      const { sdp } = (e as CustomEvent).detail;
      await pcManager.setRemoteDescription(sdp);
      const answer = await pcManager.createAnswer();
      sendEvent('call.answer', {
        session_id: sessionId,
        conversation_id: useCallStore.getState().conversationId,
        sdp: answer
      });
    };
    
    const handleAnswer = async (e: Event) => {
      const { sdp } = (e as CustomEvent).detail;
      await pcManager.setRemoteDescription(sdp);
    };
    
    const handleIceCandidate = (e: Event) => {
      const { candidate } = (e as CustomEvent).detail;
      pcManager.addIceCandidate(candidate);
    };
    // Use window event listeners which are triggered by socket.ts
    window.addEventListener('webrtc:offer', handleOffer);
    window.addEventListener('webrtc:answer', handleAnswer);
    window.addEventListener('webrtc:ice_candidate', handleIceCandidate);

    return () => {
      window.removeEventListener('webrtc:offer', handleOffer);
      window.removeEventListener('webrtc:answer', handleAnswer);
      window.removeEventListener('webrtc:ice_candidate', handleIceCandidate);
    };
  }, []);

  // Handle Mute/Video toggles
  useEffect(() => {
    mediaManager.toggleAudio(!isMuted);
    mediaManager.toggleVideo(isVideoOn);
  }, [isMuted, isVideoOn]);

  // Network Quality Monitor
  useEffect(() => {
    if (state !== 'CONNECTED' || !pcManager.pc) return;
    const interval = setInterval(async () => {
      const stats = await pcManager.pc?.getStats();
      if (!stats) return;
      let rtt = 0;
      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime || report.roundTripTime || 0;
        }
      });
      
      // Basic RTT to Quality synthesizer
      if (rtt < 0.05) setNetworkQuality('Excellent');
      else if (rtt < 0.15) setNetworkQuality('Good');
      else if (rtt < 0.3) setNetworkQuality('Fair');
      else setNetworkQuality('Poor');
    }, 2000);
    return () => clearInterval(interval);
  }, [state]);

  const handleEndCall = () => {
    pcManager.close();
    mediaManager.stopAll();
    realtimeSocket.send('call.end', { session_id: sessionId });
    endCall();
  };

  const handleAcceptCall = () => {
    setState('CONNECTING');
    realtimeSocket.send('call.accept', { session_id: sessionId });
  };

  const handleRejectCall = () => {
    realtimeSocket.send('call.reject', { session_id: sessionId });
    endCall();
  };

  return (
    <>
      {children}

      {/* Floating Call UI overlay */}
      <AnimatePresence>
        {state !== 'IDLE' && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed ${state === 'RINGING' ? 'top-10 right-10' : 'bottom-10 right-10'} w-80 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-700`}
          >
            {/* Remote Video Background */}
            <div className="relative h-48 bg-black">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              
              {/* Local Video PiP */}
              <div className="absolute bottom-2 right-2 w-20 h-28 bg-gray-800 rounded overflow-hidden shadow-lg border border-gray-600">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
              
              {/* Status Overlay */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium flex gap-2">
                <span>{state}</span>
                {state === 'CONNECTED' && <span className={`${networkQuality === 'Poor' ? 'text-red-400' : 'text-green-400'}`}>{networkQuality}</span>}
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 flex items-center justify-between bg-gray-800">
              {state === 'RINGING' ? (
                <>
                  <button onClick={handleRejectCall} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition">Decline</button>
                  <button onClick={handleAcceptCall} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition shadow-[0_0_15px_rgba(34,197,94,0.5)]">Accept</button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button onClick={toggleMute} className={`p-3 rounded-full transition ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button onClick={toggleVideo} className={`p-3 rounded-full transition ${!isVideoOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                      {!isVideoOn ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  </div>
                  <button onClick={handleEndCall} className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition">
                    <PhoneOff size={20} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
