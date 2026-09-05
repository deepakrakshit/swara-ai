import React, { useState, useEffect } from 'react';
import { ExternalLink, FileText, Maximize2, X, Image as ImageIcon, Download } from 'lucide-react';

interface UserMessageCardProps {
  content: string;
  timestamp: string;
  attachments?: string[];
  onSelectAttachment?: (filename: string) => void;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.svg', '.gif', '.tiff'];

const isImageFile = (filename: string): boolean => {
  const lower = (filename || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export const UserMessageCard: React.FC<UserMessageCardProps> = ({
  content,
  attachments = [],
  onSelectAttachment,
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  const imageFiles = attachments.filter(isImageFile);
  const docFiles = attachments.filter((f) => !isImageFile(f));
  const hasText = Boolean(content && content.trim().length > 0);

  return (
    <>
      <div className="flex justify-end my-4 animate-message-spring select-text">
        <div className="max-w-[85%] md:max-w-[75%] bg-[#27272c] text-white rounded-[24px] px-5 py-3.5 shadow-xl space-y-3 border border-white/[0.1] rim-highlight">
          {/* Full Inline Images */}
          {imageFiles.length > 0 && (
            <div className="space-y-3 pt-1">
              {imageFiles.map((file, idx) => {
                const imgUrl = `/files/raw/${encodeURIComponent(file)}`;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl overflow-hidden border border-white/[0.12] bg-black/40 shadow-inner group relative"
                  >
                    {/* Full Image */}
                    <div className="relative overflow-hidden flex items-center justify-center p-2 bg-zinc-950/60 min-h-[140px]">
                      <img
                        src={imgUrl}
                        alt={file}
                        onClick={() => setZoomedImage(imgUrl)}
                        className="w-auto max-h-[460px] max-w-full rounded-xl object-contain cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:brightness-105"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback if image fails to load directly
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Image Footer with Quick Actions */}
                    <div className="flex items-center justify-between px-3.5 py-2 bg-[#252525]/90 backdrop-blur-sm border-t border-white/[0.08] text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate font-mono text-zinc-300 max-w-[200px]" title={file}>
                          {file}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectAttachment?.(file)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-medium text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
                          title="Inspect in Canvas"
                        >
                          Canvas <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(imgUrl)}
                          className="p-1 rounded-lg hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
                          title="Full Screen Zoom"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Text Query / Prompt */}
          {hasText && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans text-zinc-100">
              {content}
            </p>
          )}

          {/* Non-Image Document Attachments (PDFs, DOCX, etc.) */}
          {docFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
              {docFiles.map((file, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectAttachment?.(file)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.1] hover:border-white/[0.25] text-xs font-medium text-zinc-200 hover:text-white transition-all shadow-sm group active:scale-95 text-left"
                  title={`Click to open ${file} in Canvas`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors shrink-0" />
                  <span className="truncate max-w-[180px] font-mono">{file}</span>
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 bg-black/40 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                    Canvas <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Full Resolution Inspection */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-6xl max-h-[92vh] bg-[#1a1a1a] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#242424] border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 truncate max-w-md">
                <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{decodeURIComponent(zoomedImage.replace('/files/raw/', ''))}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={zoomedImage}
                  download
                  className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-zinc-300 hover:text-white transition-colors"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-zinc-300 hover:text-white transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-auto flex items-center justify-center p-4 bg-zinc-950/80">
              <img
                src={zoomedImage}
                alt="Full resolution inspection"
                className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
