import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Image as ImageIcon, Send } from 'lucide-react';
import { useStoryStore } from '../../../store/storyStore';
import { apiJson } from '../../../lib/api';
import { v4 as uuidv4 } from 'uuid';

interface UploadStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadStoryModal: React.FC<UploadStoryModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'text' | 'media'>('text');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#4f46e5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addStory = useStoryStore(state => state.addStory);

  const colors = ['#4f46e5', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#0f172a'];

  const handleSubmit = async () => {
    if (type === 'text' && !text.trim()) return;
    setIsSubmitting(true);

    try {
      // Mock crypto payload matching existing patterns
      const payload = {
        ciphertext: type === 'text' ? text : 'Media story',
        nonce: uuidv4().substring(0, 16),
        signature: 'mock_signature',
        key_version: 1,
        algorithm: 'AES-256-GCM',
        background_color: bgColor,
      };

      const response = await apiJson('/api/chat/stories/', { method: 'POST', body: payload });
      const data = await response.json();
      addStory(data);
      onClose();
      setText('');
    } catch (error) {
      console.error('Failed to create story', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
        <motion.div
          initial={{ y: 50, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col"
          style={{ height: '80vh' }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Create Story</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <X size={20} />
            </button>
          </div>

          {/* Preview Area */}
          <div
            className="flex-1 flex items-center justify-center relative p-6 transition-colors duration-300"
            style={{ backgroundColor: bgColor }}
          >
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a status..."
              className="w-full bg-transparent text-center text-3xl font-medium text-white placeholder:text-white/50 focus:outline-none resize-none overflow-hidden drop-shadow-md"
              rows={4}
            />
          </div>

          {/* Controls Area */}
          <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-col space-y-4">

            {/* Color picker */}
            <div className="flex justify-center space-x-3">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${bgColor === c ? 'border-white' : 'border-transparent'} transition`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <div className="flex space-x-2">
                <button className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition">
                  <Type size={20} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition">
                  <ImageIcon size={20} />
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !text.trim()}
                className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                <span>{isSubmitting ? 'Sending...' : 'Send'}</span>
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
