import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  timestamp?: string;
}

interface MediaGalleryProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ items, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const current = items[currentIndex];
  if (!current) return null;

  const goNext = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCurrentIndex(i => Math.min(i + 1, items.length - 1));
  }, [items.length]);

  const goPrev = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 0.5));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1) return; // Don't swipe when zoomed
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || zoom > 1) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dt = Date.now() - touchStartRef.current.time;
    if (Math.abs(dx) > 50 && dt < 500) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartRef.current = null;
  };

  // Double tap to zoom
  const lastTapRef = useRef(0);
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      setZoom(z => z === 1 ? 2 : 1);
      setOffset({ x: 0, y: 0 });
    }
    lastTapRef.current = now;
  };

  // Mouse drag when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({ x: dragStartRef.current.offsetX + dx, y: dragStartRef.current.offsetY + dy });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = current.url;
    a.download = `media-${current.id}`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Close gallery">
          <X size={24} />
        </button>
        <span className="text-white/70 text-sm">{currentIndex + 1} / {items.length}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => { setZoom(z => Math.max(z - 0.5, 0.5)); setOffset({ x: 0, y: 0 }); }}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={20} />
          </button>
          <button onClick={handleDownload} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Download">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative select-none"
        onClick={handleDoubleTap}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease'
            }}
          >
            {current.type === 'image' ? (
              <img
                src={current.url}
                alt={current.caption || 'Media'}
                className="max-w-[95vw] max-h-[80vh] object-contain rounded"
                draggable={false}
              />
            ) : (
              <video
                src={current.url}
                controls
                autoPlay
                className="max-w-[95vw] max-h-[80vh] object-contain rounded"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors hidden md:flex"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors hidden md:flex"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Caption */}
      {current.caption && (
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent text-center">
          <p className="text-white/80 text-sm">{current.caption}</p>
        </div>
      )}
    </div>
  );
};
