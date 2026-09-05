import React, { useState } from 'react';
import { Terminal, Check, Copy, ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { ToolRunInfo } from '../../types/workbench';
import { formatDuration } from '../../utils/formatters';

interface ToolExecutionCardProps {
  tool: ToolRunInfo;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ tool }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = tool.status === 'success';
  const isError = tool.status === 'error';
  const isRunning = tool.status === 'running';

  return (
    <div className="my-2 rounded-2xl bg-[#1b1b1e] border border-white/[0.08] hover:border-white/[0.14] overflow-hidden text-xs transition-all shadow-sm">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left select-none"
      >
        <div className="flex items-center gap-2.5 truncate">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          )}
          <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Terminal className="w-3 h-3" />
          </div>
          <span className="font-mono font-medium text-zinc-200 truncate tracking-tight">
            {tool.toolName}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.04]">
            {tool.category}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {tool.durationMs ? (
            <span className="text-[10px] font-mono text-zinc-400">
              {formatDuration(tool.durationMs)}
            </span>
          ) : null}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-blue-400 font-mono text-[10px] bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Running
            </span>
          )}
          {isSuccess && (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1 text-rose-400 text-[10px] font-mono">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </span>
          )}
        </div>
      </button>

      {/* Expanded Inspector Panel */}
      {expanded && (
        <div className="p-3.5 border-t border-white/[0.06] bg-[#141416] space-y-3 font-mono text-[11px] animate-slide-down select-text">
          {/* Inputs */}
          {tool.inputs && Object.keys(tool.inputs).length > 0 && (
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1 text-[10px] uppercase font-bold tracking-wider">
                <span>Arguments:</span>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/50 text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/[0.05]">
                {JSON.stringify(tool.inputs, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {tool.output && (
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1 text-[10px] uppercase font-bold tracking-wider">
                <span className="text-emerald-400">Result Output:</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-white text-zinc-400 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/50 text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/[0.05] max-h-52">
                {typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}

          {tool.error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <span className="font-bold block mb-1">Execution Error:</span>
              <pre className="whitespace-pre-wrap">{tool.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
