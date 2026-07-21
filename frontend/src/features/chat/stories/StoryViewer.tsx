import React, { useState, useEffect, useRef } from 'react';
import { type Story, useStoryStore } from '../../../store/storyStore';
import { motion } from 'framer-motion';
import { X, Eye } from 'lucide-react';

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const markViewed = useStoryStore(state => state.markViewed);
  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000;

  useEffect(() => {
    if (currentStory) {
      markViewed(currentStory.id);
    }
  }, [currentStory, markViewed]);

  useEffect(() => {
    let animationFrame: number;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      if (isPaused) {
        startTime = timestamp - (progress * STORY_DURATION) / 100;
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const elapsed = timestamp - startTime;
      const currentProgress = (elapsed / STORY_DURATION) * 100;

      if (currentProgress < 100) {
        setProgress(currentProgress);
        animationFrame = requestAnimationFrame(animate);
      } else {
        handleNext();
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const screenWidth = window.innerWidth;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

    if (clientX < screenWidth / 3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col sm:p-4"
    >
      <div
        className="flex-1 w-full max-w-md mx-auto relative sm:rounded-xl overflow-hidden"
        style={{ backgroundColor: currentStory.background_color || '#1f2937' }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onClick={handleTap}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-3 flex space-x-1 z-10 bg-gradient-to-b from-black/50 to-transparent">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 px-4 pt-2 flex justify-between items-center z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              {currentStory.author.email.substring(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm drop-shadow-md">
                {currentStory.author.display_name || currentStory.author.email.split('@')[0]}
              </p>
              <p className="text-xs text-white/70 drop-shadow-md">
                {new Date(currentStory.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 hover:bg-white/20 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center pointer-events-none">
          {currentStory.media ? (
            <div className="text-white/50 text-sm">(Media rendering placeholder)</div>
          ) : (
            <h2 className="text-2xl font-medium drop-shadow-lg">{currentStory.ciphertext}</h2>
          )}
        </div>

        {/* Viewers Footer (if author) */}
        {currentStory.viewers_count !== undefined && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
            <button
              className="flex flex-col items-center hover:bg-white/10 p-2 rounded-xl transition"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye size={20} className="mb-1 text-white/80" />
              <span className="text-xs text-white/80 font-medium">{currentStory.viewers_count} views</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
