import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Sparkles, Copy, Check, Clock } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

interface ReasoningStage {
  stage: 'understanding' | 'planning' | 'evidence' | 'verification';
  text: string;
  completed: boolean;
}

interface ReasoningAccordionProps {
  summary?: string;
  durationMs?: number;
  stages?: ReasoningStage[];
  thought?: string;
  defaultExpanded?: boolean;
}

export const ReasoningAccordion: React.FC<ReasoningAccordionProps> = ({
  summary = 'Thought process',
  durationMs = 0,
  stages = [],
  thought,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const displayTime =
    durationMs > 0
      ? `Thought for ${formatDuration(durationMs)}`
      : thought
      ? 'Thought process'
      : 'Thought for a few moments';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = thought || stages.map((s) => `[${s.stage.toUpperCase()}] ${s.text}`).join('\n') || summary;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 select-none">
      {/* Gemini-Style Thought Pill Trigger */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] transition-all text-xs text-zinc-300 hover:text-white group shadow-sm active:scale-[0.98]"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="font-medium text-[12px] tracking-wide text-zinc-200 group-hover:text-white">
          {displayTime}
        </span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform" />
        )}
      </button>

      {/* Expanded Glassmorphic Thought Stream */}
      {expanded && (
        <div className="mt-2.5 rounded-2xl bg-[#1e1e22]/90 border border-white/[0.08] shadow-lg overflow-hidden animate-slide-down">
          {/* Internal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.05] text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-zinc-300 font-semibold">REASONING CHAIN</span>
              {durationMs > 0 && (
                <span className="text-[10px] text-zinc-500">· {formatDuration(durationMs)}</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-white text-zinc-400 transition-colors"
              title="Copy reasoning trace"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Thought Content Body */}
          <div className="p-4 space-y-3 text-xs text-zinc-300 font-sans leading-relaxed">
            {thought ? (
              <div className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-zinc-300 select-text max-h-80 overflow-y-auto pr-1">
                {thought}
              </div>
            ) : stages.length > 0 ? (
              <div className="space-y-3">
                {stages.map((stg, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    <div>
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
                        {stg.stage}
                      </div>
                      <p className="text-zinc-300 text-xs mt-0.5 leading-relaxed select-text">
                        {stg.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 italic select-text">
                {summary}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
