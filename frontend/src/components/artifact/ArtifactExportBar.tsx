import React, { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Lock,
  FileText,
  FileSpreadsheet,
  FileType,
  Presentation,
  Archive,
} from 'lucide-react';
import { ArtifactResponse } from '../../types/api';

/**
 * NOTE for types/api.ts:
 * The backend (`src/main.py`) now returns one ArtifactResponse entry per
 * rendered format in the `artifacts` array, each with:
 *   file_type: 'docx' | 'xlsx' | 'pdf' | 'pptx'
 *   bundle_download_url?: string   // present only on the first entry
 * Add those two fields to the ArtifactResponse interface if they are not
 * already declared there.
 */
type DeliverableFormat = 'docx' | 'xlsx' | 'pdf' | 'pptx';

interface ArtifactExportBarProps {
  /** Preferred: one ArtifactResponse per rendered format (docx/xlsx/pdf/pptx). */
  artifacts?: ArtifactResponse[] | null;
  /** @deprecated single-artifact shape kept for backward compatibility with older callers. */
  artifact?: ArtifactResponse | null;
  onApprove?: () => void;
}

const FORMAT_META: Record<
  DeliverableFormat,
  { label: string; extLabel: string; icon: React.ComponentType<{ className?: string }>; fallbackSuffix: string }
> = {
  docx: { label: 'Word', extLabel: '.docx', icon: FileText, fallbackSuffix: '' },
  xlsx: { label: 'Excel', extLabel: '.xlsx', icon: FileSpreadsheet, fallbackSuffix: '/xlsx' },
  pdf: { label: 'PDF', extLabel: '.pdf', icon: FileType, fallbackSuffix: '/pdf' },
  pptx: { label: 'Slides', extLabel: '.pptx', icon: Presentation, fallbackSuffix: '/pptx' },
};
const FORMAT_ORDER: DeliverableFormat[] = ['docx', 'xlsx', 'pdf', 'pptx'];

export const ArtifactExportBar: React.FC<ArtifactExportBarProps> = ({ artifacts, artifact, onApprove }) => {
  const [copied, setCopied] = useState(false);

  // Normalize both prop shapes (new array, legacy single object) into one list.
  const items: ArtifactResponse[] = useMemo(() => {
    if (artifacts && artifacts.length > 0) return artifacts;
    if (artifact) return [artifact];
    return [];
  }, [artifacts, artifact]);

  const byFormat = useMemo(() => {
    const map = new Map<DeliverableFormat, ArtifactResponse>();
    for (const item of items) {
      const fmt = ((item as any).file_type as DeliverableFormat) || 'docx';
      if (FORMAT_ORDER.includes(fmt)) map.set(fmt, item);
    }
    return map;
  }, [items]);

  if (items.length === 0) return null;

  const primary = items[0];
  const taskId = primary.artifact_id;
  const isApproved = items.every((it) => it.approved !== false);

  const bundleUrl = (primary as any).bundle_download_url || `/api/artifact/${taskId}/bundle`;

  const resolveUrl = (fmt: DeliverableFormat, item: ArtifactResponse) =>
    item.download_url || `/api/artifact/${taskId}${FORMAT_META[fmt].fallbackSuffix}`;

  const openDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + bundleUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-14 bg-[#18181b] border-t border-white/[0.08] px-4 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
        {isApproved ? (
          <>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Provenance Verified</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Awaiting HITL Approval</span>
            {onApprove && (
              <button
                onClick={onApprove}
                className="ml-2 px-2 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-[11px] font-medium transition-all"
              >
                Approve
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {FORMAT_ORDER.map((fmt) => {
          const meta = FORMAT_META[fmt];
          const Icon = meta.icon;
          const item = byFormat.get(fmt);
          const available = Boolean(item) && isApproved;
          const title = !item
            ? `${meta.label} deliverable was not generated for this task`
            : !isApproved
            ? `${meta.label} deliverable is locked until HITL approval`
            : `Download ${meta.label} (${meta.extLabel})`;

          return (
            <button
              key={fmt}
              disabled={!available}
              title={title}
              onClick={() => item && available && openDownload(resolveUrl(fmt, item))}
              className={
                available
                  ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#323236] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all active:scale-95'
                  : 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1c1f] border border-white/[0.04] text-xs font-medium text-zinc-600 cursor-not-allowed'
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{meta.label}</span>
            </button>
          );
        })}

        <div className="w-px h-6 bg-white/[0.08] mx-1" />

        <button
          onClick={handleCopyLink}
          title="Copy shareable bundle link"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#323236] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
        </button>

        <button
          disabled={!isApproved}
          onClick={() => isApproved && openDownload(bundleUrl)}
          title={isApproved ? 'Download all deliverables as a ZIP' : 'Bundle is locked until HITL approval'}
          className={
            isApproved
              ? 'flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-black hover:opacity-90 transition-all font-semibold text-xs shadow-md active:scale-95'
              : 'flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-700 text-zinc-400 font-semibold text-xs cursor-not-allowed'
          }
        >
          <Archive className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Download All</span>
        </button>
      </div>
    </div>
  );
};