import React from 'react';
import { FileText, Download, FileSpreadsheet, FileArchive, FileCode, File } from 'lucide-react';

interface DocumentCardProps {
  url: string;
  filename: string;
  isOwn: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ url, filename, isOwn }) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const getDocTheme = () => {
    if (['pdf'].includes(ext)) {
      return { bg: 'bg-[#ea4335]', label: 'PDF', icon: FileText };
    }
    if (['doc', 'docx'].includes(ext)) {
      return { bg: 'bg-[#3b82f6]', label: 'DOC', icon: FileText };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { bg: 'bg-[#10b981]', label: 'SPREADSHEET', icon: FileSpreadsheet };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { bg: 'bg-[#f59e0b]', label: 'ARCHIVE', icon: FileArchive };
    }
    if (['html', 'js', 'ts', 'py', 'cpp', 'json', 'css'].includes(ext)) {
      return { bg: 'bg-[#6366f1]', label: 'CODE', icon: FileCode };
    }
    return { bg: 'bg-[#00a884]', label: ext.toUpperCase() || 'FILE', icon: File };
  };

  const theme = getDocTheme();
  const IconComponent = theme.icon;

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg my-1 border transition ${
      isOwn ? 'bg-[#025144] border-[#00473a]' : 'bg-[#1d282f] border-[#162127]'
    }`}>
      {/* File Type Icon Badge */}
      <div className={`w-10 h-10 rounded-lg ${theme.bg} text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs`}>
        <IconComponent size={20} />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-[13.5px] font-medium text-[#e9edef] truncate leading-snug">
          {filename}
        </h4>
        <span className="text-[11px] text-[#8696a0] font-semibold uppercase tracking-wider block mt-0.5">
          {theme.label}
        </span>
      </div>

      {/* Download Action Button */}
      <a
        href={url || '#'}
        download={filename}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-black/20 rounded-full transition shrink-0"
        title={`Download ${filename}`}
      >
        <Download size={18} />
      </a>
    </div>
  );
};
