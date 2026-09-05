import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  FileText,
  Calculator,
  ShieldCheck,
  UploadCloud,
  Terminal,
  Eye,
  RotateCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client';

interface IdleWorkbenchProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenUpload: () => void;
  onAddAttachment?: (filename: string) => void;
}

const ALL_SUGGESTIONS = [
  // 1. Refinery Operations & Corrosion
  {
    title: 'Corrosion Trend Memo',
    prompt: 'Draft the Q3 corrosion-trend memo for Unit 200, cite the inspection SOP.',
    icon: FileText,
    subtitle: 'Executive deliverable with SOP citations',
    category: 'Refinery Operations',
  },
  {
    title: 'Heat Exchanger Fouling Rate',
    prompt: 'Calculate the fouling factor and thermal efficiency decline for Heat Exchanger E-102.',
    icon: Calculator,
    subtitle: 'Thermal efficiency & fouling resistance',
    category: 'Refinery Operations',
  },
  {
    title: 'Pipeline Pressure Drop',
    prompt: 'Estimate the pressure drop per 100 meters for 12-inch crude transfer line using Darcy-Weisbach.',
    icon: Terminal,
    subtitle: 'Fluid mechanics & friction factor calculation',
    category: 'Refinery Operations',
  },
  {
    title: 'Distillation Column Upset',
    prompt: 'Outline troubleshooting steps for top pressure surges in the Atmospheric Distillation Unit (CDU).',
    icon: ShieldCheck,
    subtitle: 'Process upset diagnostics & emergency mitigation',
    category: 'Refinery Operations',
  },
  {
    title: 'Centrifugal Pump Cavitation',
    prompt: 'Diagnose NPSH margin and possible cavitation causes for feed pump P-201A.',
    icon: Calculator,
    subtitle: 'NPSHa vs NPSHr pump reliability check',
    category: 'Refinery Operations',
  },

  // 2. Refinery Metallurgy, Calculations & Python Sandbox
  {
    title: 'Crude Column 100-C-01 Wall Thickness',
    prompt: 'Calculate remaining service life and minimum required wall thickness for Crude Column 100-C-01 from ultrasonic thickness logs.',
    icon: Terminal,
    subtitle: 'Refinery Metallurgy',
    category: 'Refinery Metallurgy',
  },
  {
    title: 'Exchanger E-102 Fouling Rate',
    prompt: 'Calculate fouling resistance Rf and overall heat transfer coefficient U for shell-and-tube exchanger E-102.',
    icon: Calculator,
    subtitle: 'Heat transfer coefficient & fouling calculation',
    category: 'Refinery Metallurgy',
  },
  {
    title: 'PSV-201 Orifice Area (API 520)',
    prompt: 'Calculate required relief area and select standard API orifice letter for PSV-201 under fire case conditions.',
    icon: Terminal,
    subtitle: 'API STD 520 vapor relief sizing',
    category: 'Refinery Metallurgy',
  },
  {
    title: 'Sensor Statistical Analysis',
    prompt: 'Calculate standard deviation and 95% confidence interval for pressure sensor logs in Python.',
    icon: Calculator,
    subtitle: 'Statistical uncertainty & telemetry processing',
    category: 'Refinery Metallurgy',
  },
  {
    title: 'Pipe Schedule & Wall Allowance',
    prompt: 'Calculate minimum required wall thickness and select ANSI pipe schedule for hydrotreater line 4"-HC-101-A1A.',
    icon: Terminal,
    subtitle: 'ASME B31.3 process piping calculation',
    category: 'Refinery Metallurgy',
  },

  // 3. SOP Compliance & Safety Standards
  {
    title: 'Inspection Gate Verification',
    prompt: 'Verify corrosion rate calculation formulas according to inspection SOP §4.2.',
    icon: FileText,
    subtitle: 'RAG verification against standard SOP clauses',
    category: 'SOP Compliance',
  },
  {
    title: 'OISD-112 Flare Safety Audit',
    prompt: 'Summarize mandatory safety interlocks for flare knockout drums under OISD-STD-112.',
    icon: ShieldCheck,
    subtitle: 'Regulatory refinery flare system standards',
    category: 'SOP Compliance',
  },
  {
    title: 'HAZOP Deviation Study',
    prompt: 'Perform a HAZOP study for "High Pressure" node on the hydrotreater reactor inlet.',
    icon: ShieldCheck,
    subtitle: 'Cause, consequence & safeguarding matrix',
    category: 'SOP Compliance',
  },
  {
    title: 'LOTO Isolation Checklist',
    prompt: 'Generate an OSHA/OISD compliant LOTO procedure for pump impeller maintenance.',
    icon: FileText,
    subtitle: 'Energy isolation & lockout/tagout steps',
    category: 'SOP Compliance',
  },
  {
    title: 'Hot Work Permit Criteria',
    prompt: 'List atmospheric testing criteria required before issuing a Hot Work Permit in tank farm areas.',
    icon: ShieldCheck,
    subtitle: 'LEL, O2 & toxic gas permissible limits',
    category: 'SOP Compliance',
  },

  // 4. Multimodal Vision & Diagram Analysis
  {
    title: 'P&ID Vision Tag OCR',
    prompt: 'Inspect P&ID tag V-204 and check safe operating pressure limits.',
    icon: Eye,
    subtitle: 'Visual equipment extraction & limits check',
    category: 'Vision & Diagrams',
  },
  {
    title: 'Equipment Nameplate Specs',
    prompt: 'Extract design pressure, temperature rating, and metallurgy from an equipment vessel nameplate.',
    icon: Eye,
    subtitle: 'Vessel metallurgy & MAWP extraction',
    category: 'Vision & Diagrams',
  },
  {
    title: 'P&ID Valve Lineup Trace',
    prompt: 'Trace bypass piping and valve positions around control valve FV-101 in a refinery schematic.',
    icon: Eye,
    subtitle: 'P&ID flow routing & isolation identification',
    category: 'Vision & Diagrams',
  },
  {
    title: 'Technical Memorandum Synthesis',
    prompt: 'Extract technical findings, corrosion rates, and operational parameters from inspection memorandum documents.',
    icon: FileText,
    subtitle: 'Multimodal document OCR synthesis',
    category: 'Vision & Diagrams',
  },

  // 5. Sovereign Security & Data Provenance
  {
    title: 'Air-Gap Socket Verification',
    prompt: 'Run a localhost socket audit and confirm zero network egress across active model processes.',
    icon: ShieldCheck,
    subtitle: 'Loopback 127.0.0.1 isolation attestation',
    category: 'Security & Provenance',
  },
  {
    title: 'Tamper-Evident SHA Ledger',
    prompt: 'Verify cryptographic checksums for recently generated inspection deliverables.',
    icon: Terminal,
    subtitle: 'SHA-256 provenance & chain-of-custody check',
    category: 'Security & Provenance',
  },
];

export const IdleWorkbench: React.FC<IdleWorkbenchProps> = ({
  onSelectPrompt,
  onOpenUpload,
  onAddAttachment,
}) => {
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to pick 4 distinct suggestions across diverse categories
  const pickRandomSuggestions = useCallback(() => {
    const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
    // Try to ensure variety of categories
    const selected: typeof ALL_SUGGESTIONS = [];
    const usedCategories = new Set<string>();

    for (const item of shuffled) {
      if (!usedCategories.has(item.category) && selected.length < 4) {
        selected.push(item);
        usedCategories.add(item.category);
      }
    }

    // Fill remaining if needed
    for (const item of shuffled) {
      if (selected.length < 4 && !selected.some((s) => s.title === item.title)) {
        selected.push(item);
      }
    }

    return selected;
  }, []);

  const [suggestions, setSuggestions] = useState(pickRandomSuggestions);

  const handleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSuggestions(pickRandomSuggestions());
  };

  const handleCardClick = (promptText: string) => {
    setIsCollapsing(true);
    setTimeout(() => {
      onSelectPrompt(promptText);
    }, 220);
  };

  const handleDirectUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      setUploadedFile(null);
      try {
        const res = await api.uploadFile(file);
        setUploadedFile(res.filename);
        if (onAddAttachment) {
          onAddAttachment(res.filename);
        }
      } catch (err) {
        console.error('Direct file upload failed:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto text-center select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isCollapsing ? 'animate-collapse-up pointer-events-none' : 'animate-fade-in'
      }`}
    >
      {/* Hidden File Input for Direct Native OS Dialog */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.xlsx,.csv,.txt,.json,.png,.jpg,.jpeg,.pptx"
      />

      {/* 4-Point Neural Sparkle Icon */}
      <div className="relative mb-6">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-500/20 via-[#27272c] to-blue-500/15 border border-white/[0.14] flex items-center justify-center shadow-2xl shadow-purple-500/10">
          <Sparkles className="w-7 h-7 text-purple-400 drop-shadow-md" />
        </div>
      </div>

      <h2 className="text-3xl font-semibold tracking-tight text-white mb-2.5">
        <span className="text-purple-400">Swara.ai</span> Workbench
      </h2>
      <p className="text-sm text-zinc-400 max-w-lg mb-8 leading-relaxed">
        Sovereign industrial AI platform — air-gapped agentic intelligence for refinery engineering, P&ID verification, and SOP compliance. 100% on-premise execution.
      </p>

      {/* Header bar for suggestions with Shuffle button */}
      <div className="flex items-center justify-between w-full mb-3.5 px-1">
        <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase text-[11px]">
          Suggested Engineering Tasks
        </span>
        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.06] text-[11px] font-medium text-zinc-300 hover:text-white transition-all group active:scale-95"
          title="Shuffle and roll 4 fresh prompt ideas"
        >
          <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-300 text-purple-400" />
          <span>Shuffle Prompts</span>
        </button>
      </div>

      {/* Suggestion Cards Grid (4 Randomized Prompts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full mb-8 text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => handleCardClick(item.prompt)}
              className="p-4 rounded-2xl bg-[#232328]/70 hover:bg-[#2a2a30] border border-white/[0.08] hover:border-white/[0.2] transition-all duration-200 group flex flex-col justify-between gap-2.5 shadow-md text-left active:scale-[0.98] glass-card"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-white/[0.06] text-zinc-300 group-hover:text-white group-hover:scale-105 transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {item.title}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.04] font-mono border border-white/[0.04]">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-zinc-400 group-hover:text-zinc-300 leading-relaxed">
                {item.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Upload & Ingestion Button */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDirectUploadClick}
            disabled={isUploading}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#25252a] hover:bg-[#2f2f35] border border-white/[0.12] hover:border-white/[0.25] text-xs font-medium text-zinc-200 hover:text-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span>Uploading & Ingesting Document...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-blue-400" />
                <span>Ingest Document / P&ID (PDF, PPTX, XLSX, DOCX)</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenUpload}
            className="px-3.5 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-medium text-zinc-400 hover:text-white transition-all"
            title="Open multi-stage ingestion & OCR inspector"
          >
            Inspector
          </button>
        </div>

        {/* Upload Success Feedback */}
        {uploadedFile && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono animate-fade-in mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Attached & indexed <strong>{uploadedFile}</strong>! Ask a question or click a prompt above.</span>
          </div>
        )}
      </div>
    </div>
  );
};

