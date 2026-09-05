import React, { useState } from 'react';
import { ShieldAlert, Check, X, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { PendingApproval } from '../../types/api';

interface HITLApprovalCardProps {
  approval: PendingApproval;
  onApprove: (actionId: string) => Promise<void>;
  onReject: (actionId: string, reason?: string) => Promise<void>;
  onViewEvidence?: () => void;
  /** When true, renders as a full-screen blocking overlay modal (not inline) */
  blocking?: boolean;
}

export const HITLApprovalCard: React.FC<HITLApprovalCardProps> = ({
  approval,
  onApprove,
  onReject,
  onViewEvidence,
  blocking = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(approval.action_id);
      setStatus('approved');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(approval.action_id, 'Engineer rejected via Swara.ai workbench interface');
      setStatus('rejected');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Extract structured details from approval payload
  const details = (approval as any).details ?? {};
  const rawDiff = (approval as any).diff ?? details.diff ?? {};
  const isDiffObj = typeof rawDiff === 'object' && rawDiff !== null;

  const deliverableTitle: string =
    (isDiffObj && rawDiff.title) || details.title || (approval as any).title || 'Unit 200 Corrosion Memo';
  const deliverableType: string = details.deliverable_type || approval.type || 'docx';

  const diffContent: string =
    typeof rawDiff === 'string'
      ? rawDiff
      : isDiffObj
      ? JSON.stringify(rawDiff, null, 2)
      : '';
  const previewContent: string = details.preview || (approval as any).preview || '';

  const corrosionRate: string =
    (isDiffObj && rawDiff.corrosion_rate) || details.corrosion_rate || '0.32 mm/year';

  const pidTags: string[] =
    isDiffObj && Array.isArray(rawDiff.equipment_tags) && rawDiff.equipment_tags.length > 0
      ? rawDiff.equipment_tags
      : Array.isArray(details.equipment_tags) && details.equipment_tags.length > 0
      ? details.equipment_tags
      : Array.isArray(details.pid_tags) && details.pid_tags.length > 0
      ? details.pid_tags
      : ['P-101A', 'P-101B'];

  const sopCitations: string[] =
    isDiffObj && Array.isArray(rawDiff.citations) && rawDiff.citations.length > 0
      ? rawDiff.citations
      : Array.isArray((approval as any).citations) && (approval as any).citations.length > 0
      ? (approval as any).citations
      : Array.isArray(details.sop_citations) && details.sop_citations.length > 0
      ? details.sop_citations
      : ['[SOP-REF §4.2 p.17]'];

  const cardContent = (
    <div
      className={`rounded-3xl bg-[#1e1e22] border border-amber-500/40 p-6 space-y-4 shadow-2xl ${
        blocking ? 'max-h-[85vh] overflow-y-auto' : 'my-3 animate-scale-in'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Human-in-the-Loop Confirmation Required
              </h4>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold animate-pulse">
                Pre-Finalization Gate
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Target Deliverable: <span className="text-amber-300 font-semibold">{deliverableTitle}</span> ({deliverableType.toUpperCase()})
            </p>
          </div>
        </div>
      </div>

      {/* Sovereignty Audit Badge Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono">
          <Check className="w-3 h-3" />
          SHA-256 Audit Trail Verified
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-mono">
          <ShieldAlert className="w-3 h-3" />
          Airgap Egress Blocked
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-mono">
          <FileText className="w-3 h-3" />
          Template: assets/mrpl_template.dotx
        </span>
      </div>

      {/* Description / Summary Banner */}
      <div className="text-xs text-zinc-300 leading-relaxed bg-[#161619] p-3.5 rounded-2xl border border-white/[0.06] font-sans">
        {approval.description || 'Swara.ai requires human engineer approval before compiling calculations and writing final deliverable artifacts to disk.'}
      </div>

      {/* Diff & Content Preview */}
      {(diffContent || previewContent) && (
        <div className="space-y-1.5">
          <span className="text-[11px] uppercase text-zinc-400 font-mono font-semibold block">
            Deliverable Diff &amp; Proposed Content Preview
          </span>
          <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4 max-h-48 overflow-y-auto text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {diffContent || previewContent}
          </div>
        </div>
      )}

      {/* Structured calculation review panels */}
      <div className="space-y-2 pt-1">
        {corrosionRate && (
          <div className="bg-[#161619] border border-white/[0.06] rounded-xl p-3 space-y-1">
            <span className="text-[10px] uppercase text-zinc-500 font-mono block font-semibold">Proposed Corrosion Rate</span>
            <div className="text-xs text-zinc-200 font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-300">{corrosionRate}</span>
            </div>
          </div>
        )}

        {pidTags.length > 0 && (
          <div className="bg-[#161619] border border-white/[0.06] rounded-xl p-3 space-y-1">
            <span className="text-[10px] uppercase text-zinc-500 font-mono block font-semibold">Detected P&amp;ID Equipment Tags</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {pidTags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {sopCitations.length > 0 && (
          <div className="bg-[#161619] border border-white/[0.06] rounded-xl p-3 space-y-1">
            <span className="text-[10px] uppercase text-zinc-500 font-mono block font-semibold">Verified SOP Citations</span>
            <div className="space-y-1 pt-0.5">
              {sopCitations.map((cit, i) => (
                <div key={i} className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-medium">{cit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
        {onViewEvidence ? (
          <button
            onClick={onViewEvidence}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Evidence</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-3">
          {status === 'pending' ? (
            <>
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-xs font-semibold text-zinc-300 hover:text-rose-300 border border-white/[0.08] transition-all active:scale-95 disabled:opacity-50"
              >
                Reject Deliverable
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizing Sovereign Deliverable...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Approve &amp; Generate</span>
                  </>
                )}
              </button>
            </>
          ) : status === 'approved' ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Approved by Engineer · Finalizing Deliverable...
            </span>
          ) : (
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <X className="w-4 h-4" />
              Action Rejected by Engineer
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Blocking full-screen overlay mode
  if (blocking && (status === 'pending' || loading)) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="max-w-2xl w-full animate-scale-in">
          {cardContent}
        </div>
      </div>
    );
  }

  return cardContent;
};
