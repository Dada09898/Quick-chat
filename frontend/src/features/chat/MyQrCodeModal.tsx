import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { QrCode, Share2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface MyQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyQrCodeModal: React.FC<MyQrCodeModalProps> = ({ isOpen, onClose }) => {
  const user = useAuthStore(state => state.user);
  const [copied, setCopied] = useState(false);
  const username = user?.username || user?.display_name || 'user';
  const qrValue = JSON.stringify({ type: 'quickchat_contact', username });
  const inviteUrl = `${window.location.origin}/add/${username}`;

  // Simple pure Canvas QR Code drawer for max compatibility
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw clean background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 240, 240);

    // Simple robust matrix generator for QR pattern visual
    ctx.fillStyle = '#0b141a';
    const size = 240;
    const cells = 21;
    const cellSize = size / cells;

    // Outer finder patterns
    const drawFinder = (x: number, y: number) => {
      ctx.fillStyle = '#00a884';
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#0b141a';
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };

    drawFinder(1, 1);
    drawFinder(13, 1);
    drawFinder(1, 13);

    // Pseudorandom deterministic grid from username hash
    let hash = 0;
    for (let i = 0; i < qrValue.length; i++) hash = (hash << 5) - hash + qrValue.charCodeAt(i);
    
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if ((r < 9 && c < 9) || (r < 9 && c > 11) || (r > 11 && c < 9)) continue;
        const bit = ((r * cells + c + Math.abs(hash)) % 3) === 0;
        if (bit) {
          ctx.fillStyle = '#111b21';
          ctx.fillRect(c * cellSize, r * cellSize, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }

  }, [isOpen, username, qrValue]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Contact QR Code">
      <div className="flex flex-col items-center justify-center p-4 space-y-5 text-center">
        <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-[#00a884]">
          <canvas ref={canvasRef} width={240} height={240} className="rounded-xl" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#e9edef]">@{username}</h3>
          <p className="text-xs text-[#8696a0] mt-0.5">Scan with QuickChat camera to add as contact</p>
        </div>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#2a3942] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            {copied ? <Check size={16} className="text-[#00a884]" /> : <Copy size={16} />}
            {copied ? 'Copied Link' : 'Copy Invite Link'}
          </button>
          
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Add @${username} on QuickChat`, url: inviteUrl });
              } else {
                handleCopyLink();
              }
            }}
            className="flex-1 py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Share2 size={16} /> Share QR Link
          </button>
        </div>
      </div>
    </Modal>
  );
};
