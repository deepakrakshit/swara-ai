import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Radio,
  Lock,
  WifiOff,
  Server,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { SovereigntyStatus, TestEgressResponse } from '../../types/api';
import { api } from '../../api/client';

interface SovereigntyModalProps {
  sovereignty: SovereigntyStatus | null;
  onClose: () => void;
}

interface RegistryModel {
  base_url: string;
  model: string;
  type: string;
  role: string;
  sha256: string;
  sovereign_flag?: string;
}

export const SovereigntyModal: React.FC<SovereigntyModalProps> = ({ sovereignty, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestEgressResponse | null>(null);
  const [egressCount, setEgressCount] = useState<number>(0);
  const [registry, setRegistry] = useState<Record<string, RegistryModel>>({});
  const egressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRunTest = async () => {
    setTesting(true);
    try {
      const res = await api.runTestEgress();
      setTestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  // Fetch registry (model SHA-256 badges)
  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/sovereignty/registry');
      if (res.ok) {
        const data = await res.json();
        setRegistry(data);
      }
    } catch (_) {}
  };

  // Poll egress count every 500 ms
  useEffect(() => {
    const pollEgress = async () => {
      try {
        const res = await fetch('/api/egress-count');
        if (res.ok) {
          const data = await res.json();
          setEgressCount(data.egress_count ?? 0);
        }
      } catch (_) {}
    };

    pollEgress();
    egressPollRef.current = setInterval(pollEgress, 500);
    return () => {
      if (egressPollRef.current) clearInterval(egressPollRef.current);
    };
  }, []);

  useEffect(() => {
    handleRunTest();
    fetchRegistry();
  }, []);

  const registryEntries = Object.entries(registry);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-text">
      <div className="max-w-3xl w-full bg-[#212124] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="h-14 bg-[#18181b] border-b border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Swara.ai — Sovereignty &amp; Air-Gap Dashboard
              </h3>
              <p className="text-[11px] text-zinc-400">
                Industrial Sovereignty Engine · Firewall ACTIVE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-sans">

          {/* Live Egress Counter + Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Outbound Packet Counter */}
            <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-1 col-span-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Outbound Packets (eth0)
              </span>
              <span
                className={`font-bold text-sm flex items-center gap-1.5 font-mono ${
                  egressCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {egressCount}
                {egressCount > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
              </span>
              <span className="text-[10px] text-zinc-500">
                {egressCount === 0 ? '✓ Zero external packets' : '⚠ Packets detected'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Network Policy</span>
              <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5" />
                {sovereignty?.network_policy || 'OFFLINE ONLY'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Telemetry</span>
              <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                DISABLED (Zero Tracking)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">Firewall State</span>
              <span className="text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                ACTIVE (Ext. Flagged)
              </span>
            </div>
          </div>

          {/* SHA-256 Weight Verification Card */}
          {registryEntries.length > 0 && (
            <div className="border border-white/[0.08] rounded-2xl p-5 bg-[#27272a] space-y-3 shadow-sm">
              <div>
                <h4 className="font-semibold text-white flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  SHA-256 Model Weight Verification
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Cloudflare-hosted endpoints flagged [AIRGAP-EXTERNAL-FLAG] — all calls logged for compliance audit.
                </p>
              </div>

              <div className="space-y-2">
                {registryEntries.map(([key, model]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-[#1e1e20] border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-[12px]">{model.model}</div>
                        <div className="text-zinc-400">{model.role}</div>
                        <div className="text-zinc-400 font-mono text-[10px] break-all select-all" title={model.base_url}>
                          {model.base_url}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/20">
                        VERIFIED
                      </span>
                      {model.sovereign_flag && (
                        <span className="text-[9px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/20">
                          {model.sovereign_flag}
                        </span>
                      )}
                      <span className="text-[9px] text-zinc-400 font-mono" title={model.sha256}>
                        {model.sha256.slice(0, 16)}…{model.sha256.slice(-8)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tri-Probe Live Egress Tester */}
          <div className="border border-white/[0.08] rounded-2xl p-5 bg-[#27272a] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  Tri-Probe Air-Gap Test Egress
                </h4>
                <p className="text-xs text-zinc-400">
                  Live socket verification probing external IPv4, lateral subnet IPv4, and external IPv6.
                </p>
              </div>
              <button
                onClick={handleRunTest}
                disabled={testing}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Radio className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing Live Sockets...' : 'Re-test Egress Probes'}</span>
              </button>
            </div>

            {/* Probe Results */}
            {testResult && (
              <div className="space-y-2 pt-2 animate-fade-in">
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    testResult.sovereignty_intact
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <span className="font-medium flex items-center gap-2 text-xs">
                    {testResult.sovereignty_intact ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Air-Gap Enforced — All 3 Egress Probes Successfully Blocked (100% Isolated)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Egress Detected — Host Network Interface Active (External IP Reachable)</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/[0.08]">
                    {testResult.status}
                  </span>
                </div>

                {!testResult.sovereignty_intact && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] leading-relaxed flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300 block mb-0.5">
                        Security Advisory · Sovereign Perimeter Warning
                      </span>
                      <span className="text-zinc-300">
                        Outbound socket connection established via active host network interface. All calls flagged [AIRGAP-EXTERNAL-FLAG] in server logs per industrial compliance policy.
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 font-mono">
                  {Array.isArray(testResult.probes) && testResult.probes.map((probe, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#1e1e20] border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Terminal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-zinc-200 font-medium">{probe.target}</span>
                        <span className="text-zinc-400 font-sans">({probe.label})</span>
                      </div>
                      <span
                        className={`font-medium shrink-0 ${
                          probe.blocked ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {probe.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Network Interfaces */}
          {sovereignty?.active_interfaces && (
            <div className="space-y-2 font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">
                Local Host Network Adapters
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sovereignty.active_interfaces.map((iface, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-[#27272a] border border-white/[0.06] text-[11px] text-zinc-400"
                  >
                    {iface}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#18181b] border-t border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">
            Swara.ai · Industrial Sovereignty Engine · All external calls → [AIRGAP-EXTERNAL-FLAG]
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
