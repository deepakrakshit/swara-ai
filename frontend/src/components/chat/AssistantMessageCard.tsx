import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  FileText,
  Boxes,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage } from '../../types/workbench';
import { ArtifactResponse, CitationItem } from '../../types/api';
import { ReasoningAccordion } from './ReasoningAccordion';
import { ToolExecutionCard } from './ToolExecutionCard';
import { CitationChip } from './CitationChip';
import { HITLApprovalCard } from './HITLApprovalCard';
import { MarkdownRenderer } from './MarkdownRenderer';

const DYNAMIC_THINKING_PHRASES = [
  'Brewing...',
  'Pondering...',
  'Cogitating...',
  'Synthesizing verified findings...',
  'Deliberating...',
  'Ruminating...',
  'Formulating response...',
  'Contemplating...',
  'Connecting dots...',
  'Distilling insights...',
  'Analyzing context...',
  'Deciphering nuances...',
  'Brainstorming...',
  'Evaluating findings...',
  'Reasoning through constraints...',
  'Piecing it together...',
];

const ThinkingStateIndicator: React.FC = () => {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * DYNAMIC_THINKING_PHRASES.length)
  );
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => {
          let next: number;
          do {
            next = Math.floor(Math.random() * DYNAMIC_THINKING_PHRASES.length);
          } while (next === prev && DYNAMIC_THINKING_PHRASES.length > 1);
          return next;
        });
        setFade(true);
      }, 200);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3 py-2 animate-fade-in select-none">
      <div className="flex items-center gap-2.5 text-xs font-medium">
        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" />
        <span
          className={`shimmer-wave-text font-semibold tracking-wide text-xs transition-all duration-300 ${
            fade ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
          }`}
        >
          {DYNAMIC_THINKING_PHRASES[index]}
        </span>
      </div>

      {/* Shimmering horizontal skeleton wave bars */}
      <div className="space-y-2 max-w-md pt-1">
        <div className="h-2 rounded-full shimmer-wave-bar border border-white/[0.04] w-full" />
        <div className="h-2 rounded-full shimmer-wave-bar border border-white/[0.04] w-4/5" />
        <div className="h-2 rounded-full shimmer-wave-bar border border-white/[0.04] w-3/5" />
      </div>
    </div>
  );
};

interface AssistantMessageCardProps {
  message: ChatMessage;
  onInspectCitation: (citation: CitationItem) => void;
  onSelectArtifact: (artifact: ArtifactResponse) => void;
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string, reason?: string) => Promise<void>;
}

export const AssistantMessageCard: React.FC<AssistantMessageCardProps> = ({
  message,
  onInspectCitation,
  onSelectArtifact,
  onApproveAction,
  onRejectAction,
}) => {
  const isStreaming = message.isStreaming;

  // Extract genuine model thinking from <think>...</think> or <thought>...</thought> tags if present in content
  let displayContent = message.content || '';
  let genuineThought = message.thought || '';

  const thinkMatch = displayContent.match(/<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/i);
  if (thinkMatch) {
    if (!genuineThought) genuineThought = thinkMatch[1].trim();
    displayContent = displayContent.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>\s*/i, '').trim();
  } else {
    const openThinkMatch = displayContent.match(/<(?:think|thought)>([\s\S]*)$/i);
    if (openThinkMatch && openThinkMatch[1].length > 15) {
      if (!genuineThought) genuineThought = openThinkMatch[1].trim();
      displayContent = displayContent.replace(/<(?:think|thought)>[\s\S]*$/i, '').trim();
    }
  }

  return (
    <div className="flex gap-4 my-6 w-full max-w-3xl mx-auto animate-fade-in select-text">
      {/* 4-Point Gemini Star Icon Drop-In */}
      <div className="shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-[#242429] border border-white/[0.14] flex items-center justify-center shadow-lg shadow-purple-500/10 animate-star-drop">
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* Message Body Column */}
      <div className="flex-1 min-w-0 space-y-3.5">
        {/* 1. Reasoning Accordion */}
        {(genuineThought || message.reasoningSummary || message.executionTimeMs) && (
          <ReasoningAccordion
            summary={message.reasoningSummary || 'Thought process'}
            durationMs={message.executionTimeMs || 0}
            stages={message.reasoningDetails}
            thought={genuineThought}
          />
        )}

        {/* 2. Tool Executions */}
        {message.tools && message.tools.length > 0 && (
          <div className="space-y-1.5">
            {message.tools.map((t) => (
              <ToolExecutionCard key={t.id} tool={t} />
            ))}
          </div>
        )}

        {/* 3. Citations Chips Row */}
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.citations.map((cite, idx) => (
              <CitationChip key={idx} citation={cite} onClick={onInspectCitation} />
            ))}
          </div>
        )}

        {/* 4. Human-In-The-Loop Approval Banner */}
        {message.pendingApprovals && message.pendingApprovals.length > 0 && (
          <div className="space-y-2 pt-1">
            {message.pendingApprovals.map((appr) => (
              <HITLApprovalCard
                key={appr.action_id}
                approval={appr}
                onApprove={onApproveAction}
                onReject={onRejectAction}
              />
            ))}
          </div>
        )}

        {/* 5. Natural Markdown Prose Stream & Typing Effect */}
        <div className="text-[15px] chat-prose-text leading-[1.75] font-sans prose-chat">
          {displayContent ? (
            <div className="relative">
              <MarkdownRenderer
                content={displayContent}
                citations={message.citations}
                onInspectCitation={onInspectCitation}
                isStreaming={isStreaming}
              />
            </div>
          ) : isStreaming ? (
            <ThinkingStateIndicator />
          ) : null}
        </div>

        {/* 6. Artifact Deliverable Preview Card */}
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="pt-2">
            {message.artifacts.map((art) => (
              <div
                key={art.artifact_id}
                onClick={() => onSelectArtifact(art)}
                className="group p-4 rounded-2xl bg-[#222227] hover:bg-[#292930] border border-white/[0.1] hover:border-purple-500/30 transition-all duration-200 cursor-pointer shadow-xl flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shadow-inner">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold text-white group-hover:text-purple-200 transition-colors">
                        {art.filename}
                      </h5>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300">
                        {art.file_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Click to open in Canvas · {Math.round(art.file_size_bytes / 1024)} KB · Air-Gap Signed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-white transition-colors text-xs font-medium">
                  <span className="hidden sm:inline">Open Canvas</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-purple-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
