import React from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  isRecording?: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isRecording = false }) => {
  if (isRecording) {
    return (
      <div className="flex items-center gap-1.5 text-[#00a884] text-xs font-medium">
        <Mic size={13} className="animate-pulse" />
        <span>recording audio...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[#00a884] text-xs font-medium">
      <span>typing</span>
      <div className="flex items-center gap-0.5">
        <motion.span
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          className="w-1 h-1 bg-[#00a884] rounded-full"
        />
        <motion.span
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2, ease: 'easeInOut' }}
          className="w-1 h-1 bg-[#00a884] rounded-full"
        />
        <motion.span
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4, ease: 'easeInOut' }}
          className="w-1 h-1 bg-[#00a884] rounded-full"
        />
      </div>
    </div>
  );
};
