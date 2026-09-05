import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { SystemStatusResponse } from '../../types/api';

interface StartupSequenceProps {
  status: SystemStatusResponse | null;
  onComplete: () => void;
}

export const StartupSequence: React.FC<StartupSequenceProps> = ({ status, onComplete }) => {
  const { isDark } = useTheme();
  const [phase, setPhase] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Intentional Mind Motion timing modeled after Google Gemini web initialization
    const t1 = setTimeout(() => setPhase(1), 350);
    const t2 = setTimeout(() => setPhase(2), 750);
    const t3 = setTimeout(() => {
      setPhase(3);
      setIsExiting(true);
    }, 1150);
    const t4 = setTimeout(() => {
      onComplete();
    }, 1600); // 1150ms + 450ms smooth curtain dissolve

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden ${
        isExiting ? 'animate-gemini-exit pointer-events-none' : 'animate-fade-in'
      } ${
        isDark
          ? 'bg-[#131316] text-[#f3f3f5]'
          : 'bg-[#faf9f5] text-[#18181b]'
      }`}
    >
      {/* 1. Volumetric Aurora Bloom Background (Google Gemini Ambient Glow) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40 animate-gemini-aurora"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(157, 114, 255, 0.4) 0%, rgba(74, 158, 255, 0.25) 35%, rgba(244, 63, 94, 0.15) 60%, transparent 80%)'
              : 'radial-gradient(circle, rgba(157, 114, 255, 0.28) 0%, rgba(74, 158, 255, 0.2) 35%, rgba(245, 158, 11, 0.16) 60%, transparent 80%)',
          }}
        />
      </div>

      {/* 2. Central Content Column */}
      <div className="relative z-10 max-w-sm w-full p-6 text-center space-y-6">
        {/* Gemini Double-Star Organic Glyph */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          {/* Back-projected radial soft aura */}
          <div
            className="absolute inset-2 rounded-full blur-xl opacity-60 animate-gemini-aurora"
            style={{
              background: 'linear-gradient(135deg, #4a9eff, #9d72ff 50%, #f43f5e)',
            }}
          />

          {/* Mathematical 4-Point Gemini Star SVG */}
          <svg
            viewBox="0 0 48 48"
            className="w-20 h-20 relative z-10 animate-gemini-breathe drop-shadow-2xl"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="swaraGeminiGrad" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4a9eff" />
                <stop offset="40%" stopColor="#9d72ff" />
                <stop offset="75%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="swaraGeminiSatelliteGrad" x1="33" y1="6" x2="43" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9d72ff" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            {/* Primary 4-Point Gemini Star */}
            <path
              d="M 24 2 C 24 14.15 33.85 24 46 24 C 33.85 24 24 33.85 24 46 C 24 33.85 14.15 24 2 24 C 14.15 24 24 14.15 24 2 Z"
              fill="url(#swaraGeminiGrad)"
            />

            {/* Satellite Companion Sparkle */}
            <path
              d="M 38 6 C 38 8.76 40.24 11 43 11 C 40.24 11 38 13.24 38 16 C 38 13.24 35.76 11 33 11 C 35.76 11 38 8.76 38 6 Z"
              fill="url(#swaraGeminiSatelliteGrad)"
              className="animate-gemini-satellite"
            />
          </svg>
        </div>

        {/* Typography & Status */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight shimmer-wave-text drop-shadow-sm font-sans">
              SWARA.AI
            </h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shadow-sm font-medium tracking-wide ${
                isDark
                  ? 'bg-white/[0.06] border-white/10 text-zinc-300'
                  : 'bg-black/[0.04] border-zinc-300/80 text-zinc-700'
              }`}
            >
              SOVEREIGN AI
            </span>
          </div>

          <p
            className={`text-xs font-medium transition-all duration-300 tracking-wide ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            {phase === 0 && 'Initializing sovereign neural fabric...'}
            {phase === 1 && 'Verifying zero-egress air-gap perimeter...'}
            {phase === 2 && 'Mounting local inference daemons (127.0.0.1)...'}
            {phase >= 3 && 'Workbench ready'}
          </p>
        </div>

        {/* Ethereal Multi-Color Shimmer Horizon */}
        <div className="w-52 mx-auto h-[2px] rounded-full overflow-hidden bg-black/10 dark:bg-white/10 relative">
          <div className="absolute inset-0 shimmer-wave-bar" />
        </div>

        {/* Sovereign Telemetry Pill */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono opacity-85">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% AIR-GAPPED
          </span>
          <span className="text-zinc-400 dark:text-zinc-600">·</span>
          <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            {status?.gpu?.name ? status.gpu.name : 'MRPL / MoPNG ON-PREMISE'}
          </span>
        </div>
      </div>
    </div>
  );
};
