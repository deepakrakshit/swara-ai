import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Shield,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle2,
  ListFilter,
  Maximize2,
  ExternalLink,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { ArtifactResponse, DocumentPageData } from '../../types/api';
import { MarkdownRenderer } from '../chat/MarkdownRenderer';

interface DocumentViewerProps {
  artifact: ArtifactResponse | null;
  content?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ artifact, content }) => {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedPage, setCopiedPage] = useState<number | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('single');
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({});
  const [visibleImages, setVisibleImages] = useState<Record<number, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [normalDocMode, setNormalDocMode] = useState<'visual' | 'text'>('visual');
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [pageScale, setPageScale] = useState<'fit' | 'compact' | 'full'>('fit');

  // Close lightbox on Escape key
  useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  const rawContent = content || artifact?.content || '';

  // Extract structured pages data from artifact.pages_data or raw content
  const pages: DocumentPageData[] = useMemo(() => {
    if (artifact?.pages_data && artifact.pages_data.length > 0) {
      return artifact.pages_data;
    }
    if (!rawContent) return [];
    if (rawContent.includes('\n\n---\n\n')) {
      return rawContent
        .split('\n\n---\n\n')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((txt, idx) => {
          const lines = txt.split('\n').map((l) => l.trim()).filter(Boolean);
          const title = lines[0]?.replace(/^###\s*/, '') || `Slide ${idx + 1}`;
          const keyPoints = lines.slice(1, 5).filter((l) => l.length > 15);
          return {
            page_number: idx + 1,
            title,
            summary: `Key overview of ${title}.`,
            key_points: keyPoints,
            text: txt,
            word_count: txt.split(/\s+/).length,
          };
        });
    }
    return [
      {
        page_number: 1,
        title: artifact?.filename || 'Document Content',
        summary: 'Primary deliverable content.',
        key_points: [],
        text: rawContent,
        word_count: rawContent.split(/\s+/).length,
      },
    ];
  }, [artifact, rawContent]);

  if (!artifact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <FileText className="w-10 h-10 mb-2 opacity-30 text-zinc-400" />
        <p className="text-xs">Select an attached document or artifact to view in Canvas.</p>
      </div>
    );
  }

  const ext = (artifact.file_type || '').toLowerCase();
  const isPdf = ext === 'pdf';
  const isSpreadsheet = ext === 'xlsx' || ext === 'csv' || ext === 'xls';
  const isDoc = ext === 'docx' || ext === 'doc';
  const isPresentation = ext === 'pptx' || ext === 'ppt';
  const unitLabel = isPresentation ? 'Slide' : 'Page';
  const totalPages = pages.length;
  const hasMultiplePages = totalPages > 1;
  const docAspect = artifact.aspect_ratio || (isPresentation ? 1.778 : 0.707);
  const scaleContainerClass =
    pageScale === 'compact'
      ? 'max-w-md'
      : pageScale === 'fit'
      ? 'max-w-xl'
      : 'max-w-3xl';

  const togglePageExpand = (pageNum: number) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageNum]: !prev[pageNum],
    }));
  };

  const handleCopyFullText = () => {
    navigator.clipboard.writeText(rawContent);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleCopyPageSummary = (page: DocumentPageData, e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = `**${unitLabel} ${page.page_number}: ${page.title}**\n\n${page.summary}\n\nKey Points:\n` +
      (page.key_points?.map((p) => `- ${p}`).join('\n') || '');
    navigator.clipboard.writeText(formatted);
    setCopiedPage(page.page_number);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  const handleDownload = () => {
    const url = artifact.download_url || `/artifacts/${artifact.artifact_id}/download`;
    window.open(url, '_blank');
  };

  const jumpToSlide = (idx: number) => {
    setActivePageIndex(idx);
    if (viewMode === 'all') {
      const el = document.getElementById(`slide-card-${idx + 1}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const activePage = pages[activePageIndex] || pages[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#18181b] overflow-y-auto p-6 space-y-4 font-sans select-text">
      {/* 1. Document Header Card */}
      <div className="bg-[#212124] border border-white/[0.08] rounded-2xl p-4 shadow-lg space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isPdf ? (
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            ) : isDoc ? (
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            ) : isSpreadsheet ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            ) : isPresentation ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <FileCode className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                {artifact.filename}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono mt-1">
                <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] text-zinc-300 font-semibold uppercase">
                  {ext || 'DOC'}
                </span>
                <span>•</span>
                <span>{Math.round(artifact.file_size_bytes / 1024)} KB</span>
                {hasMultiplePages && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400 font-medium">
                      {totalPages} {unitLabel}s
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-sans text-[11px]">
                  <Shield className="w-3 h-3" />
                  Air-Gap Verified
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyFullText}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-all text-xs"
              title="Copy Full Document Content"
            >
              {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedFull ? 'Copied' : 'Copy All'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition-all shadow-sm active:scale-95"
              title="Download Original File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>

        {/* Multi-Page Slide Mode Navigation */}
        {hasMultiplePages && (
          <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'single'
                    ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{unitLabel} Carousel</span>
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'all'
                    ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Normal Document View</span>
              </button>
            </div>

            {viewMode === 'single' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
                  disabled={activePageIndex === 0}
                  className="p-1 rounded-lg hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-zinc-300 font-mono text-xs font-medium">
                  {unitLabel} {activePageIndex + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setActivePageIndex(Math.min(totalPages - 1, activePageIndex + 1))}
                  disabled={activePageIndex === totalPages - 1}
                  className="p-1 rounded-lg hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-white/[0.06]">
                  <button
                    onClick={() => setNormalDocMode('visual')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      normalDocMode === 'visual'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="View authentic page sheets (visual)"
                  >
                    <ImageIcon className="w-3 h-3 text-purple-400" />
                    <span>Page Sheets</span>
                  </button>
                  <button
                    onClick={() => setNormalDocMode('text')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      normalDocMode === 'text'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="View continuous formatted document text"
                  >
                    <FileText className="w-3 h-3 text-blue-400" />
                    <span>Clean Text</span>
                  </button>
                </div>

                {normalDocMode === 'visual' && (
                  <div className="hidden sm:flex items-center gap-0.5 bg-[#18181b] p-0.5 rounded-lg border border-white/[0.06]">
                    <button
                      onClick={() => setPageScale('compact')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        pageScale === 'compact'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Compact (75%)"
                    >
                      75%
                    </button>
                    <button
                      onClick={() => setPageScale('fit')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        pageScale === 'fit'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Fit Width (Balanced)"
                    >
                      Fit
                    </button>
                    <button
                      onClick={() => setPageScale('full')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        pageScale === 'full'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Full Width (100%)"
                    >
                      100%
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Jump Slide Navigator Bar */}
        {hasMultiplePages && (
          <div className="pt-1 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] uppercase font-mono text-zinc-500 mr-1 shrink-0">Jump:</span>
            {pages.map((p, idx) => (
              <button
                key={idx}
                onClick={() => jumpToSlide(idx)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all shrink-0 ${
                  activePageIndex === idx
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Document Content Canvas */}
      {pages.length > 0 ? (
        viewMode === 'single' ? (
          /* Single Slide / Carousel Mode */
          <div className="bg-[#212124] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in">
            {/* Slide Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-mono font-semibold">
                    {unitLabel} {activePage.page_number} of {totalPages}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    Section {activePage.page_number} of {totalPages} · {activePage.word_count || (activePage.text ? activePage.text.trim().split(/\s+/).filter(Boolean).length : 0)} words
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1.5">
                  {activePage.title}
                </h4>
              </div>

              <button
                onClick={(e) => handleCopyPageSummary(activePage, e)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg transition-colors shrink-0"
                title="Copy Executive Summary"
              >
                {copiedPage === activePage.page_number ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Summary
                  </span>
                )}
              </button>
            </div>

            {/* 🖼️ Actual Visual Slide/Page */}
            {activePage.image_url && (
              <div className="relative group rounded-xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-lg flex items-center justify-center min-h-[220px]">
                <img
                  src={activePage.image_url}
                  alt={`${unitLabel} ${activePage.page_number}: ${activePage.title}`}
                  className="w-full max-h-[380px] object-contain rounded-xl transition-all duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={() => setZoomedImage({ url: activePage.image_url!, title: `${unitLabel} ${activePage.page_number}: ${activePage.title}` })}
                    className="px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 border border-white/20 shadow-lg backdrop-blur-sm cursor-pointer active:scale-95 transition-transform"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Zoom Page</span>
                  </button>
                  <a
                    href={activePage.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Full Resolution</span>
                  </a>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-zinc-300 font-mono flex items-center gap-1 border border-white/10">
                  <ImageIcon className="w-3 h-3 text-purple-400" />
                  <span>Actual {unitLabel} Content</span>
                </div>
              </div>
            )}

            {/* ✨ Executive Summary */}
            <div className="rounded-xl p-3.5 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Executive Summary</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">
                {activePage.summary}
              </p>
            </div>

            {/* 🎯 Key Takeaways */}
            {activePage.key_points && activePage.key_points.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ListFilter className="w-3 h-3 text-blue-400" />
                  Key Takeaways
                </span>
                <div className="space-y-1">
                  {activePage.key_points.map((pt, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-start gap-2 text-xs text-zinc-300 bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 📄 Expandable Document Text */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => togglePageExpand(activePage.page_number)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-400 hover:text-white transition-all font-mono"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    {expandedPages[activePage.page_number]
                      ? 'Hide Document Text'
                      : 'View Document Text'}
                  </span>
                </span>
                {expandedPages[activePage.page_number] ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {expandedPages[activePage.page_number] && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-[#18181b] border border-white/[0.06] text-xs text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre-wrap font-mono animate-fade-in">
                  {activePage.text}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Document View (Continuous Document Reading) */
          <div className={`space-y-5 mx-auto py-3 px-2 transition-[max-width] duration-200 ${scaleContainerClass}`}>
            {pages.map((page, idx) => (
              <div
                key={idx}
                id={`slide-card-${page.page_number}`}
                className="w-full bg-[#18181b] rounded-xl border border-white/[0.08] shadow-xl overflow-hidden"
              >
                {/* Clean Document Page Header Bar */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#202023] border-b border-white/[0.06] text-xs select-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-white/[0.08] text-zinc-300 font-mono text-[11px] font-medium">
                      {unitLabel} {page.page_number} of {totalPages}
                    </span>
                    <span className="text-zinc-300 font-medium truncate text-xs">
                      {page.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {page.image_url && (
                      <button
                        onClick={() =>
                          setZoomedImage({
                            url: page.image_url!,
                            title: `${unitLabel} ${page.page_number}: ${page.title}`,
                          })
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors text-[11px] active:scale-95"
                        title="Zoom Page (Lightbox)"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">Zoom</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(page.text || '');
                        setCopiedPage(page.page_number);
                        setTimeout(() => setCopiedPage(null), 1500);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors text-[11px] active:scale-95"
                      title="Copy Page Text"
                    >
                      {copiedPage === page.page_number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {copiedPage === page.page_number ? 'Copied' : 'Copy'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Normal Document Content */}
                {normalDocMode === 'visual' && page.image_url ? (
                  <div
                    className="p-2.5 sm:p-3.5 bg-[#0d0d0f] flex items-center justify-center cursor-zoom-in select-none"
                    onClick={() =>
                      setZoomedImage({
                        url: page.image_url!,
                        title: `${unitLabel} ${page.page_number}: ${page.title}`,
                      })
                    }
                    title="Click to Zoom Page"
                  >
                    {/* Fixed Aspect Ratio Container: ZERO JITTER / ZERO DOCUMENT MOVEMENT */}
                    <div
                      style={{ aspectRatio: `${docAspect}` }}
                      className="w-full rounded-lg shadow-lg border border-white/[0.08] bg-[#141416] overflow-hidden relative flex items-center justify-center"
                    >
                      {/* Loading skeleton placeholder with exact dimensions */}
                      {!imagesLoaded[page.page_number] && !imageErrors[page.page_number] && (
                        <div className="absolute inset-0 bg-[#161619] animate-pulse flex flex-col items-center justify-center text-zinc-500 gap-2">
                          <ImageIcon className="w-6 h-6 text-zinc-600 animate-bounce" />
                          <span className="text-[11px] font-mono text-zinc-500">
                            Rendering {unitLabel} {page.page_number}...
                          </span>
                        </div>
                      )}

                      {/* Error state with retry */}
                      {imageErrors[page.page_number] && (
                        <div className="absolute inset-0 bg-[#1a1417] flex flex-col items-center justify-center text-zinc-400 gap-2 p-4 text-center">
                          <p className="text-xs text-rose-300 font-medium">Page failed to render</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageErrors((prev) => ({ ...prev, [page.page_number]: false }));
                              setImagesLoaded((prev) => ({ ...prev, [page.page_number]: false }));
                            }}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs text-white transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Ultra-crisp high-DPI page canvas */}
                      <img
                        src={page.image_url}
                        alt={`${unitLabel} ${page.page_number}: ${page.title}`}
                        onLoad={() =>
                          setImagesLoaded((prev) => ({ ...prev, [page.page_number]: true }))
                        }
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [page.page_number]: true }))
                        }
                        className={`w-full h-full object-contain bg-white transition-opacity duration-200 ${
                          imagesLoaded[page.page_number] ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          imageRendering: '-webkit-optimize-contrast',
                          transform: 'translateZ(0)',
                        }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-5 sm:p-7 bg-[#18181b] text-zinc-200 text-xs sm:text-sm leading-relaxed font-sans max-w-2xl mx-auto select-text">
                    {page.text ? (
                      <div className="space-y-4">
                        <MarkdownRenderer content={page.text} />
                      </div>
                    ) : (
                      <p className="text-zinc-500 italic">No text content available for this page.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-[#212124] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="space-y-3 text-xs font-sans text-zinc-300 leading-relaxed p-4 rounded-xl bg-[#27272a] border border-white/[0.06]">
            <h4 className="font-semibold text-white text-xs tracking-wide uppercase">
              {artifact.filename}
            </h4>
            <p className="text-zinc-400 text-xs">
              This document is stored locally on-premise in the air-gapped repository.
            </p>
            <div className="border-t border-white/[0.08] pt-3 text-[11px] text-zinc-500 font-mono">
              SHA-256 Checksum: {artifact.sha256 || 'Calculated on download'}
            </div>
          </div>
        </div>
      )}

      {/* 3. Lightbox Zoom Modal (Mounted to document.body via Portal to prevent any stacking context collisions) */}
      {zoomedImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in select-none"
            onClick={() => setZoomedImage(null)}
          >
            <div
              className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center bg-[#1c1c1f] rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox Header */}
              <div className="w-full flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#212124]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white truncate max-w-lg">
                    {zoomedImage.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={zoomedImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-all text-xs font-medium border border-white/10 active:scale-95"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Tab</span>
                  </a>
                  <button
                    onClick={() => setZoomedImage(null)}
                    className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] text-zinc-400 hover:text-white transition-all border border-white/10 active:scale-95"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lightbox Image View */}
              <div className="w-full flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-[#09090b]">
                <img
                  src={zoomedImage.url}
                  alt={zoomedImage.title}
                  className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
