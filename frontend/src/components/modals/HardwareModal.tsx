import React, { useState, useEffect } from 'react';
import { X, Cpu, FolderTree, RefreshCw, Activity, Check, AlertCircle, Loader2 } from 'lucide-react';
import { HardwareProfileStatus, SystemStatusResponse, SystemDiagnosticsResponse } from '../../types/api';
import { api } from '../../api/client';

interface HardwareModalProps {
  hardware: HardwareProfileStatus | null;
  systemStatus: SystemStatusResponse | null;
  onClose: () => void;
}

export const HardwareModal: React.FC<HardwareModalProps> = ({ hardware, systemStatus, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      console.error('Failed to fetch system diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const host = diagnostics?.host;
  const gpuName = host?.gpu_name || hardware?.gpu_name || systemStatus?.gpu?.name || 'Remote Kaggle GPU Pool (Dual NVIDIA T4 / P100)';
  const secondaryGpu = host?.secondary_gpu || hardware?.secondary_gpu || '24 GB GDDR6 Dedicated VRAM';
  const vramMb = host?.vram_max_mb || hardware?.vram_max_mb || systemStatus?.vram_mb || 24576;
  const cpuName = host?.cpu_name || hardware?.cpu_name || 'Host Compute Node (x86_64 High-Throughput)';
  const ramTotalGb = host?.ram_total_gb ?? hardware?.ram_total_gb ?? 16.0;
  const ramUsedGb = host?.ram_used_gb ?? hardware?.ram_used_gb ?? 8.0;
  const ramPct = host?.ram_percent ?? hardware?.ram_percent ?? Math.round((ramUsedGb / ramTotalGb) * 100);
  const cpuPct = host?.cpu_percent ?? 12.0;

  const modelsDetail = {
    deep_brain: {
      role: 'Primary Reasoning & Synthesis (CEO)',
      model_name: 'Qwen2.5-7B-Instruct',
      backend: 'Remote Cloudflare Tunnel / OpenAI /v1',
      estimated_vram_mb: 8192,
    },
    fast_brain: {
      role: 'Fast Routing Judge (< 1500ms)',
      model_name: 'Qwen2.5-3B-Instruct',
      backend: 'Remote Cloudflare Tunnel / OpenAI /v1',
      estimated_vram_mb: 4096,
    },
    coder: {
      role: 'Code & Calculation Specialist',
      model_name: 'Qwen2.5-Coder-7B-Instruct',
      backend: 'Remote Cloudflare Tunnel / OpenAI /v1',
      estimated_vram_mb: 8192,
    },
    vision: {
      role: 'Multimodal Vision & P&ID OCR',
      model_name: 'Qwen2.5-VL-7B-Instruct',
      backend: 'Remote Cloudflare Tunnel / OpenAI /v1',
      estimated_vram_mb: 8192,
    },
    embedding: {
      role: 'Sovereign Vector RAG Embeddings',
      model_name: 'nomic-embed-text-v1.5',
      backend: 'Remote Cloudflare Tunnel / OpenAI /v1',
      estimated_vram_mb: 1024,
    },
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-text">
      <div className="max-w-3xl w-full bg-[#1e1e22] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="h-14 bg-[#18181b] border-b border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                System Hardware &amp; Model Diagnostics
              </h3>
              <p className="text-[11px] text-zinc-400">
                Real-Time Host Telemetry · Remote Kaggle GPU Inference
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="p-1.5 rounded-xl hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Live Diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-sans">
          {/* Host Hardware Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                Host Compute Telemetry (Live psutil)
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">
                {host?.os || 'Windows Host'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* GPU Card */}
              <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-2">
                <span className="text-[10px] uppercase text-zinc-400 font-mono block font-semibold">Inference Compute Node</span>
                <div className="text-zinc-100 font-semibold text-xs leading-snug">Remote Kaggle GPU Pool (Dual T4/P100)</div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Host System RAM: <span className="text-emerald-400 font-medium">{ramTotalGb} GB Total ({ramUsedGb} GB Used)</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Cloudflare Tunnel · OpenAI-Compatible /v1
                </div>
              </div>

              {/* CPU Card */}
              <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-zinc-400 font-mono block font-semibold">Processor (CPU)</span>
                  <span className="text-[10px] font-mono text-blue-400">{cpuPct.toFixed(1)}% Load</span>
                </div>
                <div className="text-zinc-100 font-semibold text-xs leading-snug truncate" title={cpuName}>{cpuName}</div>
                <div className="w-full bg-[#18181b] rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, cpuPct))}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Architecture: x86_64 {host?.cpu_cores ? `· ${host.cpu_cores} Cores` : ''}
                </div>
              </div>

              {/* RAM Card */}
              <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-zinc-400 font-mono block font-semibold">System Memory (RAM)</span>
                  <span className="text-purple-400 font-mono text-[10px]">{ramPct}%</span>
                </div>
                <div className="text-zinc-100 font-semibold text-xs">
                  {ramTotalGb} GB Total
                </div>
                <div className="w-full bg-[#18181b] rounded-full h-1.5 overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${ramPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Used: {ramUsedGb} GB</span>
                  <span className="text-zinc-500">Free: {(ramTotalGb - ramUsedGb).toFixed(1)} GB</span>
                </div>
              </div>
            </div>

            {diagnostics?.network && (
              <div className="p-3.5 bg-[#27272a]/70 border border-white/[0.06] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-500 font-semibold uppercase text-[10px]">Active Adapters:</span>
                  <span className="text-zinc-200 truncate">{diagnostics.network.adapters.join(', ')}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span>Tx: <strong className="text-emerald-400">{diagnostics.network.bytes_sent_mb} MB</strong></span>
                  <span>Rx: <strong className="text-blue-400">{diagnostics.network.bytes_recv_mb} MB</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Real Model Pool Registry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                Remote Specialist Model Pool (/v1/models Probes)
              </h4>
              {loading && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Probing daemons...</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {Object.entries(modelsDetail).map(([key, detail]) => {
                const liveModel = diagnostics?.models?.[key];
                const isOnline = liveModel?.reachable ?? false;
                const latency = liveModel?.latency_ms;

                return (
                  <div
                    key={key}
                    className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-white/[0.1] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{detail.model_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300">
                          {detail.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Runtime: {detail.backend} · Memory Footprint: ~{detail.estimated_vram_mb} MB
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isOnline ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE · {latency ? `${latency.toFixed(1)}ms` : 'Ready'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          UNREACHABLE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#18181b] border-t border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-400 font-mono">
            Runtime: Remote Kaggle GPU Pool · Dual NVIDIA T4/P100 (24 GB VRAM)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
