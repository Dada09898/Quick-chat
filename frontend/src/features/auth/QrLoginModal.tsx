import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, ShieldCheck, RefreshCw, MessageSquareCode, ArrowRight } from 'lucide-react';

interface QrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLinkedDevices?: () => void;
}

export const QrLoginModal: React.FC<QrLoginModalProps> = ({ isOpen, onClose, onOpenLinkedDevices }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQrCode = async () => {
    setIsRefreshing(true);
    try {
      const { apiJson } = await import('../../lib/api');
      const res = await apiJson('/api/auth/devices/qr/');
      if (res.ok) {
        const data = await res.json();
        setQrCode(data.qr_code);
        setCountdown(30);
      }
    } catch (err) {
      console.error('Failed to fetch QR code:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchQrCode();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQrCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[480px] bg-[#111b21] border border-[#222d34] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-[#e9edef]"
        >
          {/* Top Header */}
          <div className="px-6 py-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <MessageSquareCode size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#e9edef]">Log in to Quick Chat Web</h3>
                <p className="text-xs text-[#8696a0]">Link your account using QR code scan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8696a0] hover:text-white hover:bg-[#374248] rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Card */}
          <div className="p-6 flex flex-col items-center text-center gap-6">
            {/* Step by Step Guidance */}
            <div className="w-full text-left bg-[#182229] border border-[#222d34] rounded-2xl p-4 space-y-2 text-xs text-[#8696a0]">
              <div className="font-semibold text-sm text-[#e9edef] flex items-center gap-2 mb-1">
                <Smartphone size={16} className="text-[#00a884]" /> How to pair your phone:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#d1d7db] font-medium leading-relaxed">
                <li>Open <strong>Quick Chat</strong> on your phone</li>
                <li>Tap <strong>Settings</strong> ➔ <strong>Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong> and point your camera here</li>
              </ol>
            </div>

            {/* WhatsApp Web Style QR Code Frame */}
            <div className="relative p-5 bg-white rounded-3xl shadow-2xl border-4 border-[#00a884]/30 group">
              {/* Corner Green Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00a884]" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00a884]" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00a884]" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00a884]" />

              {/* Animated Green Laser Beam Scanner Line */}
              <motion.div
                animate={{ y: [0, 190, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#00a884] to-transparent shadow-[0_0_12px_#00a884] z-10 pointer-events-none"
              />

              {qrCode ? (
                <img
                  src={qrCode}
                  alt="Quick Chat Pairing QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gray-100 rounded-xl flex items-center justify-center text-[#8696a0]">
                  <RefreshCw size={36} className="animate-spin text-[#00a884]" />
                </div>
              )}

              {/* WhatsApp Icon Badge in Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-white p-1 shadow-xl flex items-center justify-center border-2 border-[#00a884]">
                  <MessageSquareCode size={24} className="text-[#00a884]" />
                </div>
              </div>
            </div>

            {/* Live Countdown & Manual Refresh Button */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8696a0]">
                QR Code refreshes in <strong className="text-[#00a884]">{countdown}s</strong>
              </span>
              <button
                onClick={fetchQrCode}
                disabled={isRefreshing}
                className="p-1.5 text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition disabled:opacity-50"
                title="Refresh QR Code"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Open Linked Devices Modal Link */}
            {onOpenLinkedDevices && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLinkedDevices();
                }}
                className="w-full py-3 bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] font-semibold text-xs rounded-xl border border-[#222d34] transition flex items-center justify-center gap-2 group"
              >
                <span>Manage Linked Devices on this Account</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          {/* Footer Security Badge */}
          <div className="px-6 py-3.5 bg-[#202c33] border-t border-[#222d34] flex items-center justify-center gap-2 text-xs text-[#8696a0]">
            <ShieldCheck size={16} className="text-[#00a884]" />
            <span>End-to-End Encrypted Pairing • Signal Protocol</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
