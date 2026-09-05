import React, { useRef, useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { FileUploadResponse } from '../../types/api';

interface IngestionModalProps {
  onClose: () => void;
  onFileUploaded: (fileResp: FileUploadResponse) => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({ onClose, onFileUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stages = [
    'Uploading document locally',
    'Local PDF/XLSX text and tabular parsing',
    'Quality & density gate validation',
    'Vision OCR equipment extraction',
    'ChromaDB vector embedding calculation',
    'Knowledge graph indexing',
  ];

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadResult(null);
    setStageIndex(0);

    const interval = setInterval(() => {
      setStageIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await api.uploadFile(file);
      clearInterval(interval);
      setStageIndex(5);
      setUploadResult(res);
      onFileUploaded(res);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Upload and indexing failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-text">
      <div className="max-w-2xl w-full bg-[#212124] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="h-14 bg-[#18181b] border-b border-white/[0.08] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <UploadCloud className="w-5 h-5 text-blue-400" />
            <span>Sovereign Document Ingestion & Indexing</span>
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
          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 space-y-3 ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/[0.1] hover:border-white/[0.25] bg-[#27272a]/60 hover:bg-[#27272a]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.xlsx,.csv,.txt,.json,.png,.jpg,.jpeg"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#18181b] border border-white/[0.1] mx-auto flex items-center justify-center shadow-lg">
              <UploadCloud className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Drag and drop engineering documents or click to browse
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Supports PDF, P&ID images, Excel XLSX, CSV, Word DOCX. 100% on-premise storage.
              </p>
            </div>
          </div>

          {/* Stepper */}
          {uploading && (
            <div className="space-y-3 bg-[#27272a] p-5 rounded-2xl border border-white/[0.06] animate-fade-in">
              <span className="font-semibold text-white block text-xs">
                Ingestion Pipeline Active:
              </span>
              <div className="space-y-2 font-mono">
                {stages.map((stg, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">
                      {idx + 1}. {stg}
                    </span>
                    {idx < stageIndex ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        DONE
                      </span>
                    ) : idx === stageIndex ? (
                      <span className="text-blue-400 animate-pulse font-medium">PROCESSING</span>
                    ) : (
                      <span className="text-zinc-600">WAITING</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Card */}
          {uploadResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Document Ingested & Vector Indexed
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  READY
                </span>
              </div>
              <div className="text-xs text-zinc-300 space-y-1 font-mono pt-1">
                <div>File: <span className="text-white font-medium">{uploadResult.filename}</span></div>
                <div>Extracted: <span className="text-white font-medium">{uploadResult.extracted_pages} pages, {uploadResult.extracted_chunks} vector chunks</span></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#18181b] border-t border-white/[0.08] px-6 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:opacity-90 transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
