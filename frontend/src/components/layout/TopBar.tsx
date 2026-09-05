import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  Cpu,
  Shield,
  Brain,
  Eye,
  Code2,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { SystemStatusResponse, HardwareProfileStatus } from '../../types/api';

export type ModelOverrideKey =
  | 'auto'
  | 'deep_brain'
  | 'fast_brain'
  | 'vision'
  | 'coder';

export const MODEL_OPTIONS: { value: ModelOverrideKey; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'auto',       label: 'Auto (Intelligent Router)',         icon: Sparkles, color: 'text-purple-400' },
  { value: 'deep_brain', label: 'Deep Think Brain (Qwen 2.5 7B)',    icon: Brain,    color: 'text-blue-400'   },
  { value: 'fast_brain', label: 'Fast Brain (Qwen 2.5 3B)',          icon: Zap,      color: 'text-amber-400'  },
  { value: 'vision',     label: 'Vision Specialist (Qwen 2.5 VL 7B)',icon: Eye,      color: 'text-cyan-400'   },
  { value: 'coder',      label: 'Coder Specialist (Gemma 3 12B IT)', icon: Code2, color: 'text-emerald-400'},
];

interface TopBarProps {
  systemStatus: SystemStatusResponse | null;
  hardwareStatus: HardwareProfileStatus | null;
  sessionTitle: string;
  onOpenSovereignty: () => void;
  onOpenHardware: () => void;
  onOpenUpload?: () => void;
  onOpenAudit?: () => void;
  onOpenDebug?: () => void;
  onRunTestEgress?: () => void;
  onNewSession?: () => void;
  isTestingEgress: boolean;
  egressPassed: boolean | null;
  onOpenSettings?: () => void;
  modelOverride: ModelOverrideKey;
  onModelOverrideChange: (val: ModelOverrideKey) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  systemStatus,
  hardwareStatus,
  sessionTitle,
  onOpenSovereignty,
  onOpenHardware,
  onRunTestEgress,
  isTestingEgress,
  egressPassed,
  modelOverride,
  onModelOverrideChange,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const isSovereign = systemStatus?.sovereignty?.offline_only ?? true;
  const gpuName = hardwareStatus?.gpu_name || systemStatus?.gpu?.name || 'Local GPU';
  const vramMb = hardwareStatus?.vram_max_mb || systemStatus?.vram_mb || 4096;

  const activeModel = MODEL_OPTIONS.find((m) => m.value === modelOverride) ?? MODEL_OPTIONS[0];
  const ActiveIcon = activeModel.icon;

  return (
    <header className="h-14 bg-[#161619]/95 backdrop-blur-md border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Brand + Model Selector Dropdown */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-1.5 pr-3 border-r border-white/[0.08]">
          <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span className="text-zinc-900 dark:text-white font-bold text-sm tracking-tight">Swara.ai</span>
          <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded-md">
            Industrial Sovereignty Engine
          </span>
        </div>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all text-sm font-medium text-zinc-300 hover:text-white group active:scale-95 border border-transparent hover:border-white/[0.08]"
          >
            <ActiveIcon className={`w-3.5 h-3.5 ${activeModel.color} shrink-0`} />
            <span className="text-xs">{activeModel.label}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </button>

          {/* Model Dropdown Menu */}
          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#1f1f23] border border-white/[0.14] shadow-2xl p-2 z-40 animate-scale-in text-xs rim-highlight">
                <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Specialist Router</span>
                  {egressPassed === false && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Ext. Call Flagged</span>
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  {MODEL_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = opt.value === modelOverride;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          onModelOverrideChange(opt.value);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-all group ${
                          isSelected
                            ? 'bg-white/[0.1] border border-white/[0.12] text-white'
                            : 'hover:bg-white/[0.06] border border-transparent text-zinc-300 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${opt.color} shrink-0`} />
                        <span className="text-[12px] font-medium">{opt.label}</span>
                        {isSelected && (
                          <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                            ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-white/[0.08] mt-2 pt-2 space-y-0.5">
                  {/* GPU Info */}
                  <div className="px-2.5 py-1.5 text-[11px] text-zinc-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Runtime:</span>
                      <span className="text-white text-right font-medium">Remote Kaggle GPU Pool (Dual T4/P100)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VRAM:</span>
                      <span className="text-emerald-400 font-medium">24 GB Allocated</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setModelDropdownOpen(false); onOpenHardware(); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors text-[11px] flex items-center justify-between"
                  >
                    <span>Hardware & Model Diagnostics</span>
                    <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center Session Title */}
      <div className="hidden md:flex items-center gap-2 max-w-sm truncate text-xs text-zinc-300 font-medium">
        <span className="truncate">{sessionTitle || 'New Task'}</span>
      </div>

      {/* Right Controls: Sovereign Status Badge */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            onRunTestEgress?.();
            onOpenSovereignty();
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            egressPassed === true
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
              : egressPassed === false
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-[#27272a] hover:bg-[#323236] border-white/[0.08] text-zinc-300 hover:text-white'
          }`}
          title="Open Swara.ai Sovereignty & Air-Gap Dashboard"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              egressPassed === true
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : egressPassed === false
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span className="font-medium">
            {isTestingEgress
              ? 'Testing...'
              : egressPassed === true
              ? 'Sovereign Air-Gap · Verified'
              : egressPassed === false
              ? 'Egress Detected'
              : 'Sovereign Air-Gap'}
          </span>
          <Shield className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    </header>
  );
};
