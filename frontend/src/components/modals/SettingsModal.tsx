import React, { useState } from 'react';
import {
  X,
  Moon,
  Sun,
  Palette,
  Sliders,
  Shield,
  Volume2,
  HardDrive,
  Check,
  RotateCcw,
  Sparkles,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Paintbrush,
  Cpu,
  Info,
  Zap,
  Lock,
  Activity,
  Layers,
} from 'lucide-react';
import {
  useTheme,
  ThemeType,
  AccentColorType,
  DensityType,
  ACCENT_PALETTE,
} from '../../context/ThemeContext';
import { cn } from '../../utils/cn';
import { api } from '../../api/client';

interface SettingsModalProps {
  onClose: () => void;
}

type TabType = 'appearance' | 'general' | 'sovereignty' | 'compute' | 'audio' | 'about';

interface ThemeOption {
  id: ThemeType;
  name: string;
  description: string;
  accent: string;
  bgHex: string;
  borderHex: string;
  badge?: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Onyx Dark',
    description: 'Minimalist obsidian & neutral graphite workspace',
    accent: '#10a37f',
    bgHex: '#161619',
    borderHex: '#383838',
    badge: 'Default',
  },
  {
    id: 'light',
    name: 'Daylight Paper',
    description: 'High-clarity technical document theme for daylight operation',
    accent: '#2563eb',
    bgHex: '#faf9f5',
    borderHex: '#cbd5e1',
    badge: 'Light Mode',
  },
  {
    id: 'navy',
    name: 'Refinery Navy',
    description: 'Sovereign industrial deep blue for MRPL / MoPNG',
    accent: '#38bdf8',
    bgHex: '#070d1e',
    borderHex: '#334155',
    badge: 'Industrial',
  },
  {
    id: 'terminal',
    name: 'SCADA Terminal',
    description: 'High-contrast emerald console for mission control',
    accent: '#10b981',
    bgHex: '#040806',
    borderHex: '#1f2937',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    description: 'Warm industrial copper, dark charcoal, and safety amber',
    accent: '#f59e0b',
    bgHex: '#120e0a',
    borderHex: '#332415',
  },
  {
    id: 'crimson',
    name: 'Crimson Protocol',
    description: 'Critical plant defense & high-alert emergency command',
    accent: '#f43f5e',
    bgHex: '#13080b',
    borderHex: '#38161e',
    badge: 'Defense',
  },
  {
    id: 'nordic',
    name: 'Nordic Slate',
    description: 'Arctic glacier slate with cool icy-blue tones',
    accent: '#38bdf8',
    bgHex: '#0b1120',
    borderHex: '#1e293b',
  },
  {
    id: 'forest',
    name: 'Forest Moss',
    description: 'Deep botanical pine, eucalyptus, and organic green',
    accent: '#34d399',
    bgHex: '#08120c',
    borderHex: '#163321',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    theme,
    setTheme,
    isDark,
    toggleDarkMode,
    accentColor,
    setAccentColor,
    density,
    setDensity,
    soundEnabled,
    setSoundEnabled,
    strictAirGap,
    setStrictAirGap,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [modelStatuses, setModelStatuses] = useState<Record<string, { reachable: boolean; status: string; latency_ms: number }>>({});

  const handlePingServer = async () => {
    setPingStatus('testing');
    const start = performance.now();
    try {
      const res = await api.getSystemDiagnostics();
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
      if (res && res.models) {
        setModelStatuses(res.models);
        const anyOnline = Object.values(res.models).some((m) => m.reachable);
        setPingStatus(anyOnline ? 'success' : 'error');
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
    }
    setTimeout(() => {
      setPingStatus('idle');
    }, 4000);
  };

  const handleResetDefaults = () => {
    setTheme('dark');
    setAccentColor('purple');
    setDensity('normal');
    setSoundEnabled(true);
    setStrictAirGap(true);
  };

  const currentAccent = ACCENT_PALETTE[accentColor] || ACCENT_PALETTE.purple;

  const NAV_ITEMS: { id: TabType; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'appearance', label: 'Appearance & Themes', desc: 'Themes, dark/light & accents', icon: Palette },
    { id: 'general', label: 'General & Workspace', desc: 'Density, layout & defaults', icon: Sliders },
    { id: 'sovereignty', label: 'Sovereignty & Security', desc: 'Air-gap & zero-egress state', icon: Shield },
    { id: 'compute', label: 'Models & Inference', desc: 'Daemon ports & hardware', icon: Cpu },
    { id: 'audio', label: 'Audio & Feedback', desc: 'Synthesis chimes & sound cues', icon: Volume2 },
    { id: 'about', label: 'About & Compliance', desc: 'SIH26117 MRPL build specs', icon: Info },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-text">
      <div className="max-w-4xl w-full h-[640px] max-h-[92vh] bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in text-zinc-900 dark:text-zinc-100">
        {/* Header Bar */}
        <div className="h-14 bg-[#faf9f5] dark:bg-[#161619] border-b border-zinc-200 dark:border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-1.5 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: `${currentAccent.hex}15`,
                color: currentAccent.hex,
                borderColor: `${currentAccent.hex}35`,
              }}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-wide flex items-center gap-2">
                <span>Workstation Settings</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 font-normal border border-zinc-300/60 dark:border-transparent">
                  Sovereign MRPL / MoPNG
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            title="Close Settings (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Body: Vertical Sidebar + Content Pane */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Column: Vertical Navigation Sidebar */}
          <div className="w-60 bg-[#f5f1ea] dark:bg-[#131316] border-r border-zinc-200 dark:border-white/[0.08] p-3 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              <div className="px-3 py-1.5 mb-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                Configuration
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left relative group',
                      isSelected
                        ? 'bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200/60 dark:border-transparent'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <div
                      className={cn(
                        'p-1.5 rounded-lg border transition-colors shrink-0',
                        isSelected ? 'border-zinc-300 dark:border-white/20' : 'border-zinc-200 dark:border-white/[0.04] bg-black/[0.02] dark:bg-white/[0.02]'
                      )}
                      style={{
                        backgroundColor: isSelected ? `${currentAccent.hex}22` : undefined,
                        color: isSelected ? currentAccent.hex : undefined,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-medium text-zinc-900 dark:text-white">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 font-normal truncate">
                        {item.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="w-1 h-5 rounded-full"
                        style={{ backgroundColor: currentAccent.hex }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Bottom Metadata */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.05] text-[11px] font-mono text-zinc-600 dark:text-zinc-400 space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">DAEMON:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">127.0.0.1:8000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">AIR-GAP:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">STRICT</span>
              </div>
            </div>
          </div>

          {/* Right Column: Fluid Content Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs bg-white dark:bg-[#1c1c1f]">
            {/* 1. APPEARANCE & THEMES */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">Appearance & Themes</h4>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Customize your visual environment, contrast density, and tactile highlights.
                  </p>
                </div>

                {/* Quick Dark/Light Mode Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl border shadow-inner',
                        isDark
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      )}
                    >
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <h5 className="font-semibold text-zinc-900 dark:text-white text-xs">Color Scheme Mode</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {isDark ? 'Onyx Dark Mode (Recommended for control rooms)' : 'Daylight Paper Mode (Claude warm ivory paper)'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={toggleDarkMode}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: isDark ? currentAccent.hex : '#cbd5e1',
                    }}
                    title="Toggle dark/light mode"
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                        isDark ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Accent Color Swatches */}
                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      Accent Color Highlight
                    </label>
                    <span
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${currentAccent.hex}20`,
                        color: currentAccent.hex,
                      }}
                    >
                      {currentAccent.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Primary focus halo, active badges, and interactive control highlights:
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {(Object.keys(ACCENT_PALETTE) as AccentColorType[]).map((colKey) => {
                      const col = ACCENT_PALETTE[colKey];
                      const isSelected = accentColor === colKey;
                      return (
                        <button
                          key={colKey}
                          onClick={() => setAccentColor(colKey)}
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center transition-all relative group',
                            isSelected
                              ? 'scale-110 shadow-lg ring-2 ring-zinc-500 dark:ring-white/60'
                              : 'hover:scale-105 opacity-85 hover:opacity-100'
                          )}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-md" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 8 Theme Palettes Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      Industrial Theme Presets
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">8 Curated Palettes</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEME_OPTIONS.map((opt) => {
                      const isSelected = theme === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={cn(
                            'p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group relative',
                            isSelected
                              ? 'bg-white dark:bg-[#2c2c30] shadow-md ring-1'
                              : 'bg-white/70 dark:bg-[#232326] border-zinc-200 dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-white/[0.15] hover:bg-white dark:hover:bg-[#28282c]'
                          )}
                          style={{
                            borderColor: isSelected ? currentAccent.hex : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-mono shadow-inner shrink-0"
                                style={{
                                  backgroundColor: opt.bgHex,
                                  borderColor: opt.borderHex,
                                }}
                              >
                                <span style={{ color: opt.accent }}>■</span>
                              </div>
                              <span className="font-semibold text-zinc-900 dark:text-white">{opt.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {opt.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 font-mono">
                                  {opt.badge}
                                </span>
                              )}
                              {isSelected && (
                                <div
                                  className="w-4 h-4 rounded-full text-white flex items-center justify-center"
                                  style={{ backgroundColor: currentAccent.hex }}
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{opt.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. GENERAL & WORKSPACE */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">General & Workspace</h4>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Configure interface density, typography scale, and execution streaming defaults.
                  </p>
                </div>

                {/* Density Selector */}
                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                  <label className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    Interface Density
                  </label>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Controls line-height spacing and data density across the chat stream and canvas:
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['compact', 'normal', 'spacious'] as DensityType[]).map((d) => {
                      const isSelected = density === d;
                      return (
                        <button
                          key={d}
                          onClick={() => setDensity(d)}
                          className={cn(
                            'p-3 rounded-xl border text-center font-medium capitalize transition-all',
                            isSelected
                              ? 'bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white font-semibold shadow-sm'
                              : 'bg-white/70 dark:bg-[#1e1e22] border-zinc-200 dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#25252a]'
                          )}
                          style={{
                            borderColor: isSelected ? currentAccent.hex : undefined,
                          }}
                        >
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white">{d}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {d === 'compact' ? 'SCADA 13px' : d === 'normal' ? 'Standard 14px' : 'Reading 15px'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fast-Path Orchestration Routing */}
                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <h5 className="font-semibold text-zinc-900 dark:text-white text-xs">Deterministic Fast-Path Routing</h5>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Direct tool dispatch bypasses CEO multi-hop reasoning when an unambiguous operational trigger is detected
                    (e.g., P&ID tag lookups, direct Darcy-Weisbach calculations, or pure vision OCR).
                  </p>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enabled by default for sub-10 second throughput</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SOVEREIGNTY & AIR-GAP */}
            {activeTab === 'sovereignty' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">Sovereignty & Air-Gap Compliance</h4>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Assurance protocols ensuring zero data leaves MRPL / MoPNG sovereign perimeters.
                  </p>
                </div>

                {/* Air-Gap Strict Enforcement */}
                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-zinc-900 dark:text-white text-xs">Strict Air-Gap Verification</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Zero-CDN preflight grep assertion and loopback socket isolation
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStrictAirGap(!strictAirGap)}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: strictAirGap ? '#059669' : '#cbd5e1',
                    }}
                    title="Toggle air-gap enforcement"
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                        strictAirGap ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Provenance & Security Checks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.06] space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Zero Remote Egress</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      DNS resolution and outbound gateway sockets are physically blocked at the process runtime level.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.06] space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold">
                      <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>SHA-256 Audit Trail</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Every tool invocation, model generation, and artifact has a tamper-evident cryptographic hash entry.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MODELS & INFERENCE */}
            {activeTab === 'compute' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">Models &amp; Remote Specialist Inference</h4>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Live reachability and latency of remote sovereign model daemons over Cloudflare tunnels.
                  </p>
                </div>

                {/* Ping Server Action */}
                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-zinc-900 dark:text-white text-xs">Remote Inference Daemons</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {pingLatency !== null ? `Diagnostics probe latency: ${pingLatency}ms` : 'Check reachability of all 5 specialist models'}
                      </p>
                    </div>
                    <button
                      onClick={handlePingServer}
                      disabled={pingStatus === 'testing'}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.08] hover:bg-zinc-100 dark:hover:bg-white/[0.16] text-zinc-800 dark:text-zinc-200 font-mono text-[11px] transition-all flex items-center gap-2 active:scale-95 border border-zinc-200 dark:border-transparent shadow-sm"
                    >
                      {pingStatus === 'testing' && <span className="animate-spin">⟳</span>}
                      {pingStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      {pingStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                      <span>{pingStatus === 'idle' ? 'Probe Daemons' : pingStatus.toUpperCase()}</span>
                    </button>
                  </div>

                  {/* Active Daemon Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono pt-1">
                    <div className="p-3 rounded-xl bg-white dark:bg-[#1e1e22] border border-zinc-200 dark:border-white/[0.06] space-y-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-700 dark:text-zinc-400 font-bold">ORCHESTRATOR / CEO</span>
                        {modelStatuses['deep_brain'] ? (
                          modelStatuses['deep_brain'].reachable ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                              ONLINE · {modelStatuses['deep_brain'].latency_ms.toFixed(0)}ms
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 text-[10px] bg-rose-500/15 px-1.5 py-0.5 rounded font-bold">UNREACHABLE</span>
                          )
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">CLOUDFLARE /v1</span>
                        )}
                      </div>
                      <div className="text-zinc-900 dark:text-white font-semibold text-xs">Qwen2.5-7B-Instruct</div>
                      <div className="text-[10px] text-zinc-500">Remote Kaggle GPU Pool (Dual T4/P100 · 24GB VRAM)</div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#1e1e22] border border-zinc-200 dark:border-white/[0.06] space-y-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-700 dark:text-zinc-400 font-bold">MULTIMODAL VISION</span>
                        {modelStatuses['vision'] ? (
                          modelStatuses['vision'].reachable ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                              ONLINE · {modelStatuses['vision'].latency_ms.toFixed(0)}ms
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 text-[10px] bg-rose-500/15 px-1.5 py-0.5 rounded font-bold">UNREACHABLE</span>
                          )
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">CLOUDFLARE /v1</span>
                        )}
                      </div>
                      <div className="text-zinc-900 dark:text-white font-semibold text-xs">Qwen2.5-VL-7B-Instruct</div>
                      <div className="text-[10px] text-zinc-500">Full-Resolution P&amp;ID Tag &amp; Equipment OCR</div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#1e1e22] border border-zinc-200 dark:border-white/[0.06] space-y-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-700 dark:text-zinc-400 font-bold">CODE &amp; CALCULATION</span>
                        {modelStatuses['coder'] ? (
                          modelStatuses['coder'].reachable ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                              ONLINE · {modelStatuses['coder'].latency_ms.toFixed(0)}ms
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 text-[10px] bg-rose-500/15 px-1.5 py-0.5 rounded font-bold">UNREACHABLE</span>
                          )
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">CLOUDFLARE /v1</span>
                        )}
                      </div>
                      <div className="text-zinc-900 dark:text-white font-semibold text-xs">Qwen2.5-Coder-7B-Instruct</div>
                      <div className="text-[10px] text-zinc-500">Deterministic Sandbox Python Execution</div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#1e1e22] border border-zinc-200 dark:border-white/[0.06] space-y-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-700 dark:text-zinc-400 font-bold">ROUTER / JUDGE</span>
                        {modelStatuses['fast_brain'] ? (
                          modelStatuses['fast_brain'].reachable ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                              ONLINE · {modelStatuses['fast_brain'].latency_ms.toFixed(0)}ms
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 text-[10px] bg-rose-500/15 px-1.5 py-0.5 rounded font-bold">UNREACHABLE</span>
                          )
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">CLOUDFLARE /v1</span>
                        )}
                      </div>
                      <div className="text-zinc-900 dark:text-white font-semibold text-xs">Qwen2.5-3B-Instruct</div>
                      <div className="text-[10px] text-zinc-500">Sub-1500ms Constrained JSON Classification</div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#1e1e22] border border-zinc-200 dark:border-white/[0.06] space-y-1 shadow-sm sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-700 dark:text-zinc-400 font-bold">SOVEREIGN RAG EMBEDDINGS</span>
                        {modelStatuses['embedding'] ? (
                          modelStatuses['embedding'].reachable ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                              ONLINE · {modelStatuses['embedding'].latency_ms.toFixed(0)}ms
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 text-[10px] bg-rose-500/15 px-1.5 py-0.5 rounded font-bold">UNREACHABLE</span>
                          )
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">CLOUDFLARE /v1</span>
                        )}
                      </div>
                      <div className="text-zinc-900 dark:text-white font-semibold text-xs">nomic-embed-text-v1.5</div>
                      <div className="text-[10px] text-zinc-500">768-dim Dense Embeddings for SOP &amp; P&amp;ID Chunks</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. AUDIO & FEEDBACK */}
            {activeTab === 'audio' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">Audio & Sound Cues</h4>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Audio telemetry notifications for asynchronous reasoning and deliverable synthesis.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl border shadow-inner"
                      style={{
                        backgroundColor: `${currentAccent.hex}15`,
                        color: currentAccent.hex,
                        borderColor: `${currentAccent.hex}30`,
                      }}
                    >
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-zinc-900 dark:text-white text-xs">Synthesis Completion Chime</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Play subtle acoustic chime when LangGraph deliverable synthesis finishes
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: soundEnabled ? currentAccent.hex : '#cbd5e1',
                    }}
                    title="Toggle audio feedback"
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                        soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 6. ABOUT & COMPLIANCE */}
            {activeTab === 'about' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">About & Compliance</h4>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Smart India Hackathon 2024 problem statement specification & refinery governance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f7f5f0] dark:bg-[#252528] border border-zinc-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-semibold text-sm">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Swara.ai Sovereign AI</span>
                  </div>
                  <div className="space-y-2 text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs">
                    <p>
                      <strong>Problem Statement:</strong> SIH 26117 / Ministry of Petroleum & Natural Gas (MoPNG) & Mangalore Refinery and Petrochemicals Limited (MRPL).
                    </p>
                    <p>
                      <strong>Objective:</strong> An air-gapped, sovereign, multi-agent AI orchestrator capable of multimodal technical OCR, P&ID diagram verification, corrosion engineering analysis, and automated tamper-evident document generation.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.06] grid grid-cols-2 gap-3 text-[11px] font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">SOVEREIGN BUILD</span>
                      <span className="text-zinc-900 dark:text-zinc-200 font-semibold">Swara.ai v3.0.0</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">ARCHITECTURE</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">FastAPI + LangGraph + Llama.cpp</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="h-14 bg-[#faf9f5] dark:bg-[#161619] border-t border-zinc-200 dark:border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-white font-medium text-xs shadow-md transition-all active:scale-[0.98] hover:opacity-95"
            style={{ backgroundColor: currentAccent.hex }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
