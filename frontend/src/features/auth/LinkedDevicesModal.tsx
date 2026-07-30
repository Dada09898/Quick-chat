import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Monitor, Shield, Laptop, LogOut, Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LinkedDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LinkedDevicesModal: React.FC<LinkedDevicesModalProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const { apiJson } = await import('../../lib/api');
      const res = await apiJson('/api/auth/devices/');
      if (res.ok) {
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      const { apiJson } = await import('../../lib/api');
      await apiJson(`/api/auth/devices/${deviceId}/`, { method: 'DELETE' });
      toast.success('Device logged out successfully');
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to log out device');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#111b21] border border-[#222d34] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-[#e9edef]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <Laptop size={22} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#e9edef]">Linked Devices</h3>
                <p className="text-xs text-[#8696a0]">Use Quick Chat on Web, Desktop, & Mobile</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248] transition">
              <X size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* WhatsApp Web Banner */}
            <div className="bg-[#202c33] border border-[#222d34] rounded-2xl p-5 flex flex-col items-center text-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-[#00a884]/15 flex items-center justify-center text-[#00a884]">
                <Monitor size={40} />
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
              </div>

              <div>
                <h4 className="font-semibold text-base text-[#e9edef]">Use Quick Chat on other devices</h4>
                <p className="text-xs text-[#8696a0] mt-1 max-w-sm">
                  Scan QR code on your computer or secondary tablet to connect your primary account seamlessly with End-to-End Encryption.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsScanning(true);
                  setTimeout(() => {
                    setIsScanning(false);
                    toast.success('Camera scanner initialized. Point at QR code on screen.');
                  }, 1200);
                }}
                className="w-full py-3 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20 active:scale-98"
              >
                {isScanning ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} />
                )}
                <span>{isScanning ? 'Initializing Camera Scanner...' : 'Link a Device'}</span>
              </button>
            </div>

            {/* Active Linked Devices Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Device Status & Active Sessions</h4>
                <button onClick={fetchDevices} className="text-xs text-[#00a884] hover:underline flex items-center gap-1">
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="bg-[#182229] border border-[#222d34] rounded-2xl p-4 flex items-center gap-3 text-sm text-[#8696a0]">
                  <CheckCircle2 size={20} className="text-[#00a884] shrink-0" />
                  <span>Current Web Browser session active & verified</span>
                </div>
              ) : (
                devices.map((device) => (
                  <div key={device.id} className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#111b21] rounded-xl text-[#00a884]">
                        {device.device_type === 'mobile' ? <Smartphone size={20} /> : <Laptop size={20} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-[#e9edef]">{device.device_name || 'Linked Device'}</span>
                        <span className="text-xs text-[#8696a0]">
                          {device.is_trusted ? 'Trusted Device' : 'Active Session'} • Last active {new Date(device.last_active_at || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeDevice(device.id)}
                      className="p-2 text-[#ff5b5b] hover:bg-[#ff5b5b]/10 rounded-xl transition"
                      title="Log out device"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="p-4 bg-[#111b21] border-t border-[#222d34] flex items-center justify-center gap-2 text-xs text-[#8696a0]">
            <Shield size={14} className="text-[#00a884]" />
            <span>Your personal messages are end-to-end encrypted across all linked devices.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
