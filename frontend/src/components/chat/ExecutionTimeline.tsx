import React, { useState } from 'react';
import {
  CheckCircle2,
  CircleDot,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ExecutionTimelineStep } from '../../types/workbench';
import { formatDuration } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface ExecutionTimelineProps {
  steps: ExecutionTimelineStep[];
  defaultExpanded?: boolean;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  steps,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="border border-workbench-border/80 bg-workbench-card/70 rounded-lg overflow-hidden transition-workbench text-xs shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-workbench-hover/50 text-workbench-muted hover:text-workbench-text transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-workbench-accent" />
          <span className="font-mono text-xs font-semibold text-workbench-text uppercase tracking-wider">
            Agent Execution Timeline ({steps.filter((s) => s.status === 'completed').length}/{steps.length})
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-workbench-muted">
          <span>{expanded ? 'Collapse' : 'Expand'} Trace</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Steps content */}
      {expanded && (
        <div className="p-3 border-t border-workbench-border/60 bg-workbench-panel/40 space-y-1.5 animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {steps.map((step) => {
              const isCompleted = step.status === 'completed';
              const isRunning = step.status === 'running';
              const isFailed = step.status === 'failed';
              const isPending = step.status === 'pending';

              return (
                <div
                  key={step.id}
                  className={cn(
                    'p-2 rounded-md border text-xs font-mono flex flex-col justify-between gap-1 transition-workbench',
                    isCompleted && 'bg-emerald-500/5 border-emerald-500/20 text-workbench-text',
                    isRunning && 'bg-workbench-accent/10 border-workbench-accent/40 text-workbench-accent animate-pulse',
                    isFailed && 'bg-rose-500/10 border-rose-500/30 text-rose-400',
                    isPending && 'bg-workbench-card/40 border-workbench-border/60 text-workbench-muted opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] flex items-center gap-1.5">
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {isRunning && <CircleDot className="w-3.5 h-3.5 text-workbench-accent animate-spin shrink-0" />}
                      {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {isPending && <Clock className="w-3.5 h-3.5 text-workbench-muted shrink-0" />}
                      <span>{step.name}</span>
                    </span>
                    {step.durationMs ? (
                      <span className="text-[10px] text-workbench-muted">
                        {formatDuration(step.durationMs)}
                      </span>
                    ) : null}
                  </div>
                  {step.detail && (
                    <p className="text-[11px] text-workbench-muted truncate leading-tight">
                      {step.detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
