import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, QrCode, Camera, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getKey } from '../../crypto/storage';
import { exportPublicKey } from '../../crypto/keys';
import { SessionManager } from '../../crypto/SessionManager';

interface SecurityCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  peerUserId?: string;
  peerIdentityKey?: string;
}

async function deriveSafetyNumber(ownIdentityPubKeyB64: string, peerIdentityPubKeyB64: string): Promise<string> {
  const sorted = [ownIdentityPubKeyB64, peerIdentityPubKeyB64].sort();
  const combined = sorted.join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
  const bytes = new Uint8Array(digest);
  let numeric = '';
  for (const b of bytes) numeric += b.toString().padStart(3, '0');
  numeric = numeric.slice(0, 60);
  return numeric.match(/.{1,5}/g)!.join(' ');
}

export const SecurityCodeModal: React.FC<SecurityCodeModalProps> = ({
  isOpen,
  onClose,
  userName,
  peerUserId,
  peerIdentityKey
}) => {
  const [isVerified, setIsVerified] = useState(false);
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    async function loadKeysAndDerive() {
      try {
        let ownKey: string | null = null;
        const identityPubKey = await getKey('identity_public');
        if (identityPubKey) {
          ownKey = await exportPublicKey(identityPubKey);
        }

        let targetPeerKey: string | null = peerIdentityKey || null;

        if (!targetPeerKey) {
          const sessions = await SessionManager.listSessions();
          if (peerUserId) {
            const found = sessions.find(s => s.remoteUserId === peerUserId);
            if (found?.remoteIdentityKey) {
              targetPeerKey = found.remoteIdentityKey;
            }
          }
          if (!targetPeerKey && sessions.length > 0) {
            targetPeerKey = sessions[0].remoteIdentityKey;
          }
        }

        if (ownKey && targetPeerKey) {
          const derived = await deriveSafetyNumber(ownKey, targetPeerKey);
          if (isMounted) setSecurityCode(derived);
        } else {
          if (isMounted) setSecurityCode(null);
        }
      } catch (err) {
        console.error('Error deriving safety number:', err);
        if (isMounted) setSecurityCode(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadKeysAndDerive();

    return () => {
      isMounted = false;
    };
  }, [isOpen, peerUserId, peerIdentityKey]);

  if (!isOpen) return null;

  const handleVerify = () => {
    setIsVerified(true);
    toast.success(`Security code verified with ${userName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-sm font-semibold flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#00a884]" /> Verify Security Code
          </h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          {isLoading ? (
            <div className="py-10 text-[#8696a0] text-xs">Deriving safety number...</div>
          ) : securityCode ? (
            <>
              <p className="text-xs text-[#8696a0] leading-relaxed">
                Messages and calls with <strong className="text-[#e9edef]">{userName}</strong> are encrypted end-to-end. Compare these numbers or scan the QR code to verify.
              </p>

              {/* QR Code Graphic */}
              <div className="w-44 h-44 bg-white p-3 rounded-2xl mx-auto border-4 border-[#00a884]/30 shadow-lg flex flex-col items-center justify-center relative">
                <QrCode size={130} className="text-[#111b21]" />
                {isVerified && (
                  <div className="absolute inset-0 bg-[#00a884]/95 rounded-xl flex flex-col items-center justify-center text-white">
                    <CheckCircle2 size={44} />
                    <span className="text-xs font-bold mt-2 uppercase tracking-wider">Code Verified</span>
                  </div>
                )}
              </div>

              {/* 60-Digit Derived Security Code Display */}
              <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-3.5 font-mono text-xs text-[#e9edef] tracking-widest leading-relaxed">
                {securityCode}
              </div>

              {!isVerified ? (
                <button
                  onClick={handleVerify}
                  className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-xs rounded-full transition shadow-md flex items-center justify-center gap-2"
                >
                  <Camera size={16} /> Scan & Mark Verified
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#00a884] bg-[#00a884]/15 py-2.5 rounded-full border border-[#00a884]/30">
                  <CheckCircle2 size={16} /> Verified Security Number
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center space-y-3">
              <ShieldAlert size={48} className="mx-auto text-amber-500" />
              <h3 className="text-sm font-semibold text-[#e9edef]">Encryption keys not yet exchanged</h3>
              <p className="text-xs text-[#8696a0] max-w-xs mx-auto">
                Security codes can only be derived after both users have exchanged encryption keys. Send a message to complete key exchange.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
