import React, { useEffect, useState } from 'react';
import { X, FileCheck, Search, Clock, Terminal, Download, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { formatTimestamp } from '../../utils/formatters';

interface AuditTrailModalProps {
  sessionId: string;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ sessionId, onClose }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSid, setActiveSid] = useState(sessionId || 'default');

  useEffect(() => {
    const fetchAudit = async () => {
      setLoading(true);
      try {
        const res = await api.getSessionEvents(sessionId || 'default', 100);
        setEvents(res.events || []);
        if (res.session_id) setActiveSid(res.session_id);
      } catch (err) {
        console.error('Failed to fetch session audit events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [sessionId]);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `swara_audit_${activeSid}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = events.filter((e) => {
    const matchType = e.event_type?.toLowerCase().includes(search.toLowerCase());
    const matchDetails = JSON.stringify(e.details || {}).toLowerCase().includes(search.toLowerCase());
    return matchType || matchDetails;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-text">
      <div className="max-w-4xl w-full bg-[#212124] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="h-14 bg-[#18181b] border-b border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Audit Trail & Provenance Explorer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                  TAMPER-EVIDENT
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Immutable Localhost Audit Stream · Session: {activeSid}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              disabled={events.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-zinc-300 hover:text-white transition-all disabled:opacity-40"
              title="Export complete session audit log as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-[#18181b] border-b border-white/[0.08] flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit events, tools, hashes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#27272a] border border-white/[0.08] text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.2]"
            />
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {filtered.length} Events Logged
          </span>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs font-mono">
          {loading ? (
            <div className="text-center py-12 text-zinc-400 animate-pulse">
              Loading local audit log entries...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No matching audit events found for this session.
            </div>
          ) : (
            filtered.map((evt, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#27272a] border border-white/[0.06] space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold uppercase text-[11px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                    evt.event_type?.includes('AIRGAP') || evt.event_type?.includes('SOVEREIGNTY')
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : evt.event_type?.includes('DOCUMENT') || evt.event_type?.includes('PROVENANCE')
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : evt.event_type?.includes('FINALIZER')
                      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                      : evt.event_type?.includes('REASONING')
                      ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                      : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  }`}>
                    <Terminal className="w-3.5 h-3.5" />
                    {evt.event_type}
                  </span>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(evt.timestamp)}
                  </span>
                </div>

                <pre className="text-xs font-mono text-zinc-200 bg-[#18181b] p-3 rounded-xl border border-white/[0.04] overflow-x-auto leading-relaxed">
                  {JSON.stringify(evt.details || evt.data || {}, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#18181b] border-t border-white/[0.08] px-6 flex items-center justify-end shrink-0">
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
