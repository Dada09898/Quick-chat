import React from 'react';
import { X, QrCode, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface QrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrLoginModal: React.FC<QrLoginModalProps> = ({ isOpen, onClose }) => {
  const [qrCode, setQrCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const fetchQr = async () => {
      try {
        const { apiJson } = await import('../../lib/api');
        const res = await apiJson('/api/auth/devices/qr/');
        if (res.ok) {
          const data = await res.json();
          setQrCode(data.qr_code);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchQr();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2">
            <Smartphone className="text-[#00a884]" size={20} /> Device Pairing & QR Login
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="text-center py-8 px-6 space-y-4">
          {qrCode ? (
            <img src={qrCode} alt="Pairing QR Code" className="w-52 h-52 mx-auto rounded-2xl border-4 border-white shadow-xl" />
          ) : (
            <QrCode size={64} className="mx-auto text-[#8696a0] animate-pulse" />
          )}
          <p className="text-sm text-[#e9edef] font-medium">Scan to pair primary phone device</p>
          <p className="text-xs text-[#8696a0] leading-relaxed max-w-xs mx-auto">
            Open Quick Chat on your phone, go to Settings &gt; Linked Devices, and scan this QR code to log in instantly.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
