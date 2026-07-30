import React, { useState, useEffect } from 'react';
import { X, QrCode, Smartphone, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface QrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrLoginModal: React.FC<QrLoginModalProps> = ({ isOpen, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [usePhonePairing, setUsePhonePairing] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [qrToken, setQrToken] = useState(() => Math.random().toString(36).substr(2, 10));
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrToken(Math.random().toString(36).substr(2, 10));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGeneratePhoneCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const formatted = `${code.slice(0, 3)}-${code.slice(3)}`;
    setPairingCode(formatted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-[720px] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        {/* Left Side Instructions */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#222d34]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
                <Smartphone className="text-[#00a884]" size={22} /> Use Quick Chat on Web
              </h2>
              <button onClick={onClose} className="md:hidden text-[#8696a0] hover:text-[#e9edef]">
                <X size={20} />
              </button>
            </div>

            <ol className="space-y-4 text-xs sm:text-sm text-[#8696a0] list-decimal list-inside leading-relaxed">
              <li className="pl-1">
                Open <strong className="text-[#e9edef]">Kryozen Quick Chat</strong> on your phone.
              </li>
              <li className="pl-1">
                Tap <strong className="text-[#e9edef]">Menu</strong> or <strong className="text-[#e9edef]">Settings</strong> and select <strong className="text-[#e9edef]">Linked Devices</strong>.
              </li>
              <li className="pl-1">
                Tap on <strong className="text-[#e9edef]">Link a Device</strong>.
              </li>
              <li className="pl-1">
                Point your phone at this screen to capture the QR code.
              </li>
            </ol>
          </div>

          <div className="mt-8 pt-4 border-t border-[#222d34] flex items-center justify-between">
            <button
              onClick={() => { setUsePhonePairing(!usePhonePairing); setPairingCode(''); }}
              className="text-[#00a884] hover:underline text-xs font-semibold"
            >
              {usePhonePairing ? '← Link with QR code' : 'Link with phone number instead'}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8696a0]">
              <ShieldCheck size={14} className="text-[#00a884]" /> E2EE
            </div>
          </div>
        </div>

        {/* Right Side QR / Code Canvas */}
        <div className="p-6 md:p-8 w-full md:w-[300px] bg-[#182229] flex flex-col items-center justify-center text-center relative">
          <button onClick={onClose} className="hidden md:block absolute top-4 right-4 text-[#8696a0] hover:text-[#e9edef]">
            <X size={20} />
          </button>

          {!usePhonePairing ? (
            <div className="flex flex-col items-center">
              {/* Simulated Dynamic QR Code */}
              <div className="relative p-4 bg-white rounded-2xl shadow-xl border-4 border-[#00a884]/30 mb-4">
                <div className="w-40 h-40 bg-gradient-to-br from-black via-gray-900 to-black rounded-lg flex flex-col items-center justify-center p-3 relative">
                  {/* Pattern grid */}
                  <div className="grid grid-cols-5 gap-1.5 w-full h-full opacity-90">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${
                          (i % 2 === 0 || i % 5 === 0) ? 'bg-[#00a884]' : 'bg-white'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-[#00a884]/10 rounded-lg backdrop-blur-[1px] flex items-center justify-center">
                    <QrCode size={40} className="text-[#00a884] animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8696a0]">
                <RefreshCw size={14} className="animate-spin text-[#00a884]" />
                <span>Auto-refreshing code in <strong>{countdown}s</strong></span>
              </div>
            </div>
          ) : (
            <div className="w-full">
              {!pairingCode ? (
                <form onSubmit={handleGeneratePhoneCode} className="space-y-3 text-left">
                  <label className="block text-xs text-[#8696a0]">Enter Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#111b21] border border-[#2a3942] rounded-xl px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-[#00a884]"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-xs rounded-full transition flex items-center justify-center gap-1"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#8696a0]">Enter this code on your phone:</p>
                  <div className="text-2xl font-mono font-bold tracking-widest text-[#00a884] bg-[#111b21] py-3 rounded-xl border border-[#00a884]/40 shadow-inner">
                    {pairingCode}
                  </div>
                  <p className="text-[11px] text-[#8696a0]">Waiting for confirmation...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
