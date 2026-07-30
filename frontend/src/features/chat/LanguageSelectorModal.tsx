import React, { useState } from 'react';
import { X, Globe, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { id: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { id: 'hinglish', name: 'Hinglish', native: 'Hinglish (Hindi+English)', flag: '🇮🇳' },
  { id: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { id: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' }
];

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onClose }) => {
  const [selectedLang, setSelectedLang] = useState('en');

  if (!isOpen) return null;

  const handleSelectLanguage = (langId: string, langName: string) => {
    setSelectedLang(langId);
    toast.success(`App language changed to ${langName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <Globe size={18} className="text-[#00a884]" /> App Language
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => handleSelectLanguage(lang.id, lang.name)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition ${
                selectedLang === lang.id
                  ? 'bg-[#00a884]/15 border-[#00a884]/40 text-[#e9edef]'
                  : 'bg-[#202c33] border-[#2a3942] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-[#e9edef]">{lang.name}</h4>
                  <p className="text-xs text-[#8696a0]">{lang.native}</p>
                </div>
              </div>
              {selectedLang === lang.id && <Check size={18} className="text-[#00a884]" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
