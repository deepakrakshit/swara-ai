import React from 'react';
import { Bookmark, FileText } from 'lucide-react';
import { CitationItem } from '../../types/api';

interface CitationChipProps {
  citation: CitationItem;
  onClick: (citation: CitationItem) => void;
}

export const CitationChip: React.FC<CitationChipProps> = ({ citation, onClick }) => {
  return (
    <button
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#27272a] hover:bg-[#323236] border border-white/[0.1] hover:border-white/[0.22] text-xs font-mono text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95"
      title={`Inspect source: ${citation.filename}`}
    >
      <FileText className="w-3 h-3 text-blue-400" />
      <span>{citation.citation_tag}</span>
    </button>
  );
};
