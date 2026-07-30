import React, { useState } from 'react';
import { X, Crop, RotateCw, Type, Pencil, Send, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSend: (editedImageSrc: string, caption: string) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, imageSrc, onSend }) => {
  const [caption, setCaption] = useState('');
  const [rotation, setRotation] = useState(0);
  const [activeTool, setActiveTool] = useState<'none' | 'draw' | 'text'>('none');

  if (!isOpen) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSend = () => {
    onSend(imageSrc, caption);
    toast.success('Photo attached & sent!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-3 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-sm font-semibold flex items-center gap-2">
            <Pencil size={18} className="text-[#00a884]" /> Photo Editor & Annotator
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-[#374248] rounded-full text-[#aebac1] hover:text-white transition"
              title="Rotate 90°"
            >
              <RotateCw size={18} />
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'text' ? 'none' : 'text')}
              className={`p-2 rounded-full transition ${activeTool === 'text' ? 'bg-[#00a884] text-[#111b21]' : 'hover:bg-[#374248] text-[#aebac1]'}`}
              title="Add text"
            >
              <Type size={18} />
            </button>
            <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6 flex items-center justify-center bg-black relative">
          <img
            src={imageSrc}
            alt="Preview"
            style={{ transform: `rotate(${rotation}deg)` }}
            className="max-w-full max-h-[55vh] object-contain rounded-xl transition-transform duration-200"
          />
        </div>

        <div className="p-4 bg-[#182229] border-t border-[#222d34] flex items-center gap-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="flex-1 bg-[#202c33] border border-[#2a3942] rounded-full px-4 py-2.5 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
          />
          <button
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] flex items-center justify-center transition shadow-lg shrink-0"
          >
            <Send size={18} className="translate-x-0.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
