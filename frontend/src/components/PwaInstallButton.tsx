import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { createPortal } from 'react-dom';

export const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show mobile step-by-step installation instructions modal
      setShowInstructionsModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="px-2.5 py-1.5 bg-[#00a884]/20 hover:bg-[#00a884]/30 text-[#00a884] rounded-full transition-all flex items-center gap-1.5 text-xs font-semibold border border-[#00a884]/40 shadow-sm"
        title="Install Quick Chat Mobile App"
        aria-label="Install App"
      >
        <Download size={16} className="animate-bounce" />
        <span className="text-[12px] font-medium">Install App</span>
      </button>

      {/* Mobile Installation Instructions Portal Modal */}
      {showInstructionsModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#222e35] border border-[#2a3942] rounded-2xl w-full max-w-[420px] p-5 shadow-2xl text-[#e9edef] animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3942] mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="text-[#00a884]" size={22} />
                <h3 className="text-base font-semibold">Install QuickChat App</h3>
              </div>
              <button 
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 hover:bg-[#2a3942] rounded-full text-[#8696a0] hover:text-[#e9edef]"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-[#8696a0] mb-4 leading-relaxed">
              Install Kryozen Quick Chat on your phone to use it full-screen like a native WhatsApp mobile app:
            </p>

            <div className="space-y-3.5 mb-6 text-xs">
              <div className="flex items-start gap-3 bg-[#111b21] p-3 rounded-xl border border-[#2a3942]">
                <div className="p-2 bg-[#00a884]/20 rounded-lg text-[#00a884] shrink-0">
                  <Share size={18} />
                </div>
                <div>
                  <div className="font-medium text-[#e9edef]">1. Open Browser Menu / Share</div>
                  <div className="text-[#8696a0] text-[11px] mt-0.5">
                    Tap the <strong>Share icon</strong> (bottom on Safari) or <strong>3-dots menu</strong> (top right on Chrome/Edge).
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#111b21] p-3 rounded-xl border border-[#2a3942]">
                <div className="p-2 bg-[#00a884]/20 rounded-lg text-[#00a884] shrink-0">
                  <PlusSquare size={18} />
                </div>
                <div>
                  <div className="font-medium text-[#e9edef]">2. Select "Add to Home Screen"</div>
                  <div className="text-[#8696a0] text-[11px] mt-0.5">
                    Scroll down in the menu options and tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#111b21] p-3 rounded-xl border border-[#2a3942]">
                <div className="p-2 bg-[#00a884]/20 rounded-lg text-[#00a884] shrink-0">
                  <Download size={18} />
                </div>
                <div>
                  <div className="font-medium text-[#e9edef]">3. Launch App</div>
                  <div className="text-[#8696a0] text-[11px] mt-0.5">
                    Tap <strong>Add</strong>. Open the app directly from your mobile home screen!
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-xs rounded-xl transition"
            >
              Got it, thanks!
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
