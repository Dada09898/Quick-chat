import React, { useState } from 'react';
import { X, Code, Copy, Check, Terminal, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language?: string;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ isOpen, onClose, code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = () => {
    try {
      if (language === 'javascript' || language === 'js') {
        const logs: string[] = [];
        const customConsole = {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('Error: ' + args.join(' '))
        };
        const run = new Function('console', code);
        run(customConsole);
        setOutput(logs.join('\n') || 'Code executed successfully with no output.');
      } else {
        setOutput(`Simulated output for ${language}:\nCode executed cleanly.`);
      }
    } catch (e: any) {
      setOutput(`Runtime Error: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111b21] border border-[#222d34] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#202c33] border-b border-[#222d34]">
          <h2 className="text-[#e9edef] text-base font-semibold flex items-center gap-2 font-mono">
            <Code size={18} className="text-[#00a884]" /> Code Snippet ({language})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCode}
              className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Play size={14} fill="currentColor" /> Run Code
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] rounded-lg transition border border-[#2a3942]"
              title="Copy code"
            >
              {copied ? <Check size={16} className="text-[#00a884]" /> : <Copy size={16} />}
            </button>
            <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] p-1 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar">
          <div className="bg-[#0b141a] p-4 rounded-xl border border-[#222d34] overflow-x-auto text-[#e9edef] leading-relaxed shadow-inner">
            <pre>{code}</pre>
          </div>

          {output !== null && (
            <div className="bg-[#182229] border border-[#00a884]/40 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
              <h4 className="text-xs font-semibold text-[#00a884] flex items-center gap-1.5">
                <Terminal size={14} /> Execution Console Output:
              </h4>
              <pre className="text-xs text-[#d1d7db] bg-[#111b21] p-3 rounded-lg border border-[#222d34] overflow-x-auto whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
