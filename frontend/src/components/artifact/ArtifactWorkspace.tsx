import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  FileText,
  Boxes,
  Download,
  ExternalLink,
  Search,
  Image as ImageIcon,
  FileCheck,
  Clock,
  ArrowUpRight,
  UploadCloud,
  Sparkles,
  Table2,
} from 'lucide-react';
import { ArtifactResponse, CitationItem } from '../../types/api';
import { ChatMessage } from '../../types/workbench';
import { DocumentViewer } from './DocumentViewer';
import { ArtifactExportBar } from './ArtifactExportBar';

interface ArtifactWorkspaceProps {
  artifact: ArtifactResponse | null;
  artifactsList: ArtifactResponse[];
  citations?: CitationItem[];
  messages?: ChatMessage[];
  onClose: () => void;
  onSelectArtifact: (art: ArtifactResponse) => void;
  onSelectDocument?: (filename: string) => void;
  onInspectCitation?: (citation: CitationItem) => void;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.svg', '.gif'];

export const ArtifactWorkspace: React.FC<ArtifactWorkspaceProps> = ({
  artifact,
  artifactsList = [],
  messages = [],
  onClose,
  onSelectArtifact,
  onSelectDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'artifacts' | 'spreadsheet'>('preview');
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'uploaded' | 'generated'>('all');

  // Resizable panel width state
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('swara_canvas_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 360 && val <= 1400) {
          return val;
        }
      }
    } catch {}
    return 580;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartXRef.current - e.clientX;
      const minWidth = 360;
      const maxWidth = Math.min(window.innerWidth - 380, 1200);
      const newWidth = Math.min(Math.max(minWidth, dragStartWidthRef.current + deltaX), maxWidth);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  useEffect(() => {
    try {
      localStorage.setItem('swara_canvas_width', width.toString());
    } catch {}
  }, [width]);

  const handleDoubleClickResizer = () => {
    setWidth(580);
  };

  // 1. Uploaded files in the current chat
  const uploadedFiles = useMemo(() => {
    const filesMap = new Map<string, {
      id: string;
      name: string;
      origin: 'uploaded';
      format: string;
      timestamp?: string;
      isImage: boolean;
      url: string;
    }>();

    (messages || []).forEach((msg) => {
      (msg.attachments || []).forEach((fname) => {
        if (!fname || filesMap.has(fname)) return;
        const lower = fname.toLowerCase();
        const ext = lower.split('.').pop() || 'file';
        const isImg = IMAGE_EXTENSIONS.some((e) => lower.endsWith(e));
        filesMap.set(fname, {
          id: `upload_${fname}`,
          name: fname,
          origin: 'uploaded',
          format: ext.toUpperCase(),
          timestamp: msg.timestamp,
          isImage: isImg,
          url: `/files/raw/${encodeURIComponent(fname)}`,
        });
      });
    });

    return Array.from(filesMap.values());
  }, [messages]);

  // 2. Created / Generated artifacts in the current chat
  const generatedArtifacts = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      origin: 'generated';
      format: string;
      timestamp?: string;
      sizeBytes: number;
      approved: boolean;
      artifactObj: ArtifactResponse;
      url: string;
    }>();

    // 2a. Gather strictly from messages in the current chat
    (messages || []).forEach((msg) => {
      ((msg as any).artifacts || []).forEach((art: ArtifactResponse) => {
        if (!art || !art.filename) return;
        const key = art.artifact_id || art.filename;
        if (!map.has(key)) {
          map.set(key, {
            id: art.artifact_id,
            name: art.filename,
            origin: 'generated',
            format: (art.file_type || art.filename.split('.').pop() || 'DOCX').toUpperCase(),
            timestamp: art.created_at,
            sizeBytes: art.file_size_bytes || 0,
            approved: art.approved,
            artifactObj: art,
            url: art.download_url,
          });
        }
      });
    });

    // 2b. Include current active artifact if it was generated in this session (not a doc_ preview)
    if (artifact && artifact.artifact_id && !artifact.artifact_id.startsWith('doc_')) {
      const key = artifact.artifact_id || artifact.filename;
      if (!map.has(key)) {
        map.set(key, {
          id: artifact.artifact_id,
          name: artifact.filename,
          origin: 'generated',
          format: (artifact.file_type || artifact.filename.split('.').pop() || 'DOCX').toUpperCase(),
          timestamp: artifact.created_at,
          sizeBytes: artifact.file_size_bytes || 0,
          approved: artifact.approved,
          artifactObj: artifact,
          url: artifact.download_url,
        });
      }
    }

    return Array.from(map.values());
  }, [messages, artifact]);

  // Combined files list for current chat
  const allChatFiles = useMemo(() => {
    return [...uploadedFiles, ...generatedArtifacts];
  }, [uploadedFiles, generatedArtifacts]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return allChatFiles.filter((file) => {
      if (filterType === 'uploaded' && file.origin !== 'uploaded') return false;
      if (filterType === 'generated' && file.origin !== 'generated') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return file.name.toLowerCase().includes(q) || file.format.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allChatFiles, filterType, searchQuery]);

  const handleOpenFile = (fileItem: any) => {
    if (fileItem.origin === 'generated') {
      onSelectArtifact(fileItem.artifactObj);
    } else if (onSelectDocument) {
      onSelectDocument(fileItem.name);
    }
    setActiveTab('preview');
  };

  if (!artifact) return null;

  return (
    <div
      style={!isMaximized ? { width: `${width}px` } : undefined}
      className={`relative bg-[#1e1e20] border-l border-white/[0.08] flex flex-col justify-between z-10 shrink-0 ${
        isDragging ? 'select-none' : 'transition-[width] duration-150 ease-out'
      } ${
        isMaximized
          ? 'fixed inset-y-0 right-0 w-full md:w-3/4 shadow-2xl z-40'
          : 'max-w-[90vw]'
      }`}
    >
      {/* Draggable Resize Edge Handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClickResizer}
          className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize z-30 group flex items-center justify-center select-none"
          title="Drag to resize panel (Double-click to reset)"
        >
          <div
            className={`w-1 h-full transition-all duration-150 ${
              isDragging
                ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                : 'bg-transparent group-hover:bg-purple-500/60'
            }`}
          />
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-10 rounded-full bg-[#27272a] border border-white/20 flex flex-col items-center justify-center gap-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
              isDragging ? 'opacity-100 bg-purple-600 border-purple-400' : ''
            }`}
          >
            <div className="w-0.5 h-1.5 rounded-full bg-zinc-400" />
            <div className="w-0.5 h-1.5 rounded-full bg-zinc-400" />
          </div>
        </div>
      )}

      {/* Canvas Top Header */}
      <div className="h-14 bg-[#18181b] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 select-none">
        {/* Left Segmented Pill Controls: Document & Artifacts */}
        <div className="flex items-center gap-1 bg-[#27272a] p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-[#38383c] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Inspect currently open document or deliverable"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document</span>
          </button>

          <button
            onClick={() => setActiveTab('artifacts')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'artifacts'
                ? 'bg-[#38383c] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="View all files created or uploaded in current chat"
          >
            <Boxes className="w-3.5 h-3.5 text-purple-400" />
            <span>Artifacts ({allChatFiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'spreadsheet'
                ? 'bg-[#38383c] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Download or preview Excel calculation deliverable"
          >
            <Table2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spreadsheet</span>
          </button>
        </div>

        {/* Right Window Actions */}
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white transition-colors"
            title={isMaximized ? 'Restore View' : 'Maximize Canvas'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white transition-colors"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#18181b]">
        {activeTab === 'preview' && (
          <DocumentViewer artifact={artifact} content={artifact.content} />
        )}

        {activeTab === 'spreadsheet' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Table2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Excel Calculation Deliverable</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Download the structured calculations spreadsheet (bold headers, zebra-striped rows, numeric alignment).
                Requires HITL approval to unlock.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <a
                href={`/api/artifact/${artifact.artifact_id}/xlsx`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                title="Download Excel spreadsheet (requires HITL approval)"
              >
                <Download className="w-4 h-4" />
                <span>Download Calculations (.xlsx)</span>
              </a>
              <p className="text-[10px] text-zinc-500 font-mono">
                Task ID: {artifact.artifact_id} · Swara.ai Industrial Calculations
              </p>
            </div>
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className="flex-1 flex flex-col min-h-0 p-5 space-y-4 text-xs font-sans overflow-hidden">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] shrink-0">
              <div>
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-400" />
                  <span>Session Files & Artifacts</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  All documents, images, and deliverables created or uploaded in this chat.
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 rounded-full">
                {allChatFiles.length} file{allChatFiles.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#27272a] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex items-center bg-[#27272a] p-0.5 rounded-xl border border-white/[0.06] shrink-0">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    filterType === 'all' ? 'bg-[#38383c] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({allChatFiles.length})
                </button>
                <button
                  onClick={() => setFilterType('uploaded')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    filterType === 'uploaded' ? 'bg-[#38383c] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Uploaded ({uploadedFiles.length})
                </button>
                <button
                  onClick={() => setFilterType('generated')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    filterType === 'generated' ? 'bg-[#38383c] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Generated ({generatedArtifacts.length})
                </button>
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => {
                  const isActive = artifact?.filename === file.name;
                  return (
                    <div
                      key={file.id}
                      className={`p-3.5 rounded-2xl bg-[#27272a] border transition-all flex items-center justify-between gap-3 group ${
                        isActive
                          ? 'border-purple-500/60 bg-purple-950/15 shadow-sm'
                          : 'border-white/[0.08] hover:border-white/[0.18] hover:bg-[#2d2d31]'
                      }`}
                    >
                      {/* Left: Thumbnail / File Icon & Info */}
                      <div
                        onClick={() => handleOpenFile(file)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        {file.origin === 'uploaded' && (file as any).isImage ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center relative">
                            <img
                              src={file.url}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <ImageIcon className="w-4 h-4 text-blue-400 absolute" />
                          </div>
                        ) : file.origin === 'generated' ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 shrink-0 flex items-center justify-center">
                            <FileCheck className="w-5 h-5 text-purple-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-400" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-zinc-200 truncate group-hover:text-white" title={file.name}>
                              {file.name}
                            </span>
                            {isActive && (
                              <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-sans shrink-0">
                                Active
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                            {file.origin === 'uploaded' ? (
                              <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
                                <UploadCloud className="w-3 h-3" /> Uploaded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                <Sparkles className="w-3 h-3" /> Deliverable
                              </span>
                            )}
                            <span>•</span>
                            <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px] text-zinc-300">
                              {file.format}
                            </span>
                            {file.origin === 'generated' && (file as any).sizeBytes > 0 && (
                              <>
                                <span>•</span>
                                <span>{Math.round((file as any).sizeBytes / 1024)} KB</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenFile(file)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-medium text-zinc-200 hover:text-white transition-all flex items-center gap-1 active:scale-95"
                          title="Open and preview in Canvas"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>

                        <a
                          href={file.url}
                          download={file.name}
                          className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2">
                  <Boxes className="w-10 h-10 opacity-30 text-zinc-400" />
                  <p className="text-xs text-zinc-400">
                    {searchQuery ? 'No matching files found.' : 'No files uploaded or generated in this chat yet.'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Attach documents/images or ask Swara.ai to draft an engineering deliverable.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Bar at Bottom (shown on preview) */}
      {activeTab === 'preview' && <ArtifactExportBar artifact={artifact} />}
    </div>
  );
};
