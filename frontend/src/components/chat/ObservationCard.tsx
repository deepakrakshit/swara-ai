import React, { useState } from 'react';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { truncateString } from '../../utils/formatters';

interface ObservationCardProps {
  observation: string;
}

export const ObservationCard: React.FC<ObservationCardProps> = ({ observation }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = observation.length > 250;

  return (
    <div className="border border-workbench-border/70 bg-workbench-card/50 rounded-lg p-3 text-xs font-mono space-y-1.5 shadow-sm">
      <div className="flex items-center justify-between text-workbench-muted text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 text-workbench-cyan">
          <Eye className="w-3.5 h-3.5" />
          Observation Log
        </span>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="hover:text-workbench-text transition-colors flex items-center gap-1 text-[10px]"
          >
            <span>{expanded ? 'Show Less' : 'Show Full'}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="text-workbench-text/90 leading-relaxed whitespace-pre-wrap bg-workbench-panel/40 p-2 rounded border border-workbench-border/40 text-[11px]">
        {expanded || !isLong ? observation : truncateString(observation, 250)}
      </div>
    </div>
  );
};
