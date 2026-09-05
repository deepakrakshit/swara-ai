import React, { useEffect, useState } from 'react';
import {
  X,
  Terminal,
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../api/client';

interface ContextDebugModalProps {
  sessionId: string | null;
  onClose: () => void;
}

export const ContextDebugModal: React.FC<ContextDebugModalProps> = ({ sessionId, onClose }) => {
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchDebug = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const data = await api.getSessionDebug(sessionId);
      setDebugData(data);
    } catch (err) {
      console.error('Failed to load debug context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebug();
  }, [sessionId]);

  const handleCopyJson = () => {
    if (!debugData) return;
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-3xl max-h-[85vh] bg-[#212121] border border-white/[0.12] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Context & Runtime Introspection</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Session: {sessionId || 'N/A'} · Token Estimate: {debugData?.token_estimate ?? '~'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-colors"
              title="Copy JSON"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'JSON'}</span>
            </button>
            <button
              onClick={fetchDebug}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 font-mono">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span>Inspecting backend context graph...</span>
            </div>
          ) : debugData ? (
            <>
              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    <span>Host Hardware</span>
                  </div>
                  <div className="text-white font-semibold text-[13px] truncate">
                    {debugData.runtime_context?.hardware?.gpu_name || 'GPU'}
                  </div>
                  <div className="text-zinc-500 text-[10px]">
                    {debugData.runtime_context?.hardware?.vram_total_mb} MB VRAM · {debugData.runtime_context?.hardware?.gpu_backend}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Brain / Reasoning LLM</span>
                  </div>
                  <div className="text-white font-semibold text-[13px] truncate">
                    {debugData.runtime_context?.models?.brain?.model_name || 'Qwen2.5-1.5B'}
                  </div>
                  <div className="text-zinc-500 text-[10px]">
                    {debugData.runtime_context?.models?.brain?.parameter_count} · {debugData.runtime_context?.models?.brain?.quantization}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sovereignty Status</span>
                  </div>
                  <div className="text-emerald-400 font-semibold text-[13px]">
                    {debugData.runtime_context?.sovereignty?.network_egress || 'BLOCKED'}
                  </div>
                  <div className="text-zinc-500 text-[10px]">
                    {debugData.runtime_context?.sovereignty?.data_storage}
                  </div>
                </div>
              </div>

              {/* Models Registry Table */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                <div className="text-zinc-300 font-semibold text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Authoritative Sovereign Model Registry</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-400 border-b border-white/[0.06] pb-1">
                  <span>Role</span>
                  <span>Model Name</span>
                  <span>Parameters</span>
                  <span>Status</span>
                </div>
                {Object.entries(debugData.runtime_context?.models || {}).map(([key, m]: [string, any]) => (
                  <div key={key} className="grid grid-cols-4 gap-2 text-[11px] text-zinc-300 py-0.5">
                    <span className="text-zinc-400 capitalize">{key}</span>
                    <span className="text-white truncate">{m.model_name || key}</span>
                    <span className="text-zinc-400">{m.parameter_count || 'Local'}</span>
                    <span className="text-emerald-400 uppercase text-[10px]">{m.status || 'READY'}</span>
                  </div>
                ))}
              </div>

              {/* System Prompt Preview */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-1.5">
                <div className="text-zinc-300 font-semibold text-[11px] flex items-center justify-between">
                  <span>Assembled System Context Preview</span>
                  <span className="text-[10px] text-zinc-500 font-normal">ContextBuilder authoritative synthesis</span>
                </div>
                <pre className="text-[11px] text-zinc-300 leading-relaxed bg-[#181818] p-3 rounded-lg border border-white/[0.04] max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {debugData.system_prompt_preview}
                </pre>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-zinc-500">No context debug data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
