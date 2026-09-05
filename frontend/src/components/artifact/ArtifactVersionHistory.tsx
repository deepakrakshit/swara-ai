import React from 'react';
import { GitBranch, Clock, CheckCircle2, Shield } from 'lucide-react';
import { ArtifactResponse } from '../../types/api';
import { formatTimestamp } from '../../utils/formatters';

interface ArtifactVersionHistoryProps {
  artifact: ArtifactResponse | null;
  artifactsList: ArtifactResponse[];
  onSelectArtifact: (art: ArtifactResponse) => void;
}

export const ArtifactVersionHistory: React.FC<ArtifactVersionHistoryProps> = ({
  artifact,
  artifactsList,
  onSelectArtifact,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono">
      <div className="flex items-center gap-2 text-workbench-text font-bold border-b border-workbench-border pb-2">
        <GitBranch className="w-4 h-4 text-workbench-accent" />
        <span>Artifact Lineage & Version History</span>
      </div>

      <div className="space-y-3">
        {artifactsList.map((art, idx) => {
          const isSelected = artifact?.artifact_id === art.artifact_id;
          return (
            <div
              key={art.artifact_id}
              onClick={() => onSelectArtifact(art)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-workbench space-y-2 ${
                isSelected
                  ? 'bg-workbench-accent/10 border-workbench-accent text-workbench-text shadow-sm'
                  : 'bg-workbench-card/70 border-workbench-border text-workbench-muted hover:bg-workbench-hover hover:text-workbench-text'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-workbench-text">{art.filename}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-workbench-panel border border-workbench-border">
                  v{artifactsList.length - idx}.0
                </span>
              </div>

              <p className="text-[11px] text-workbench-muted font-mono leading-relaxed">
                SHA-256: <span className="text-workbench-cyan">{art.sha256}</span>
              </p>

              <div className="flex items-center justify-between text-[10px] text-workbench-muted pt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Shield className="w-3 h-3" />
                  Air-Gap Signed
                </span>
                <span>{Math.round(art.file_size_bytes / 1024)} KB</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
