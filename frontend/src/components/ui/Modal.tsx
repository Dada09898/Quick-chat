import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div 
        className="relative bg-[#111b21] border-t sm:border border-[#222d34] shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] fixed bottom-0 left-0 right-0 sm:static sm:rounded-xl rounded-t-2xl animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true" 
        aria-label={title}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222d34] bg-[#202c33] shrink-0">
          <h2 className="text-lg font-semibold text-[#e9edef]">{title}</h2>
          <button 
            onClick={onClose}
            className="text-[#aebac1] hover:text-[#d1d7db] transition-colors p-2 rounded-lg hover:bg-[#374248] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-[max(24px,env(safe-area-inset-bottom))] custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
