import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install Kryozen Quick Chat on your phone:\n\n1. Open your browser menu (3 dots or share button)\n2. Tap "Install app" or "Add to Home screen"');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="p-2 hover:bg-[#374248] text-[#00a884] rounded-full transition-colors flex items-center gap-1.5 text-xs font-semibold"
      title="Install Quick Chat Mobile App"
      aria-label="Install App"
    >
      <Download size={20} />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
};
