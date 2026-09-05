import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Paperclip,
  X,
  Square,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  ChevronDown,
  Brain,
  Eye,
  Code2,
  Zap,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { api } from '../../api/client';
import { MODEL_OPTIONS, ModelOverrideKey } from '../layout/TopBar';

interface ComposerProps {
  onSendMessage: (message: string, attachments: string[], modelOverride: ModelOverrideKey) => void;
  isExecuting: boolean;
  onStopExecution?: () => void;
  attachedFiles: string[];
  onAddAttachment: (filename: string) => void;
  onRemoveAttachment: (index: number) => void;
  onSelectAttachment?: (filename: string) => void;
  uploadingFiles?: string[];
  modelOverride: ModelOverrideKey;
  onModelOverrideChange: (val: ModelOverrideKey) => void;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.svg', '.gif', '.tiff'];

const isImageFile = (filename: string): boolean => {
  const lower = (filename || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isExecuting,
  onStopExecution,
  attachedFiles,
  onAddAttachment,
  onRemoveAttachment,
  onSelectAttachment,
  uploadingFiles = [],
  modelOverride,
  onModelOverrideChange,
}) => {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [modelDropOpen, setModelDropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeModel = MODEL_OPTIONS.find((m) => m.value === modelOverride) ?? MODEL_OPTIONS[0];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const msg = text.trim() || (attachedFiles.length > 0 ? 'Analyze the attached image/document in detail.' : '');
    if (!msg || isExecuting) return;
    onSendMessage(msg, attachedFiles, modelOverride);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        e.preventDefault();
        for (const file of imageFiles) {
          const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
          const name =
            file.name === 'image.png' || !file.name
              ? `screenshot_${Date.now().toString(36)}.${ext}`
              : file.name;
          const namedFile = new File([file], name, { type: file.type });
          onAddAttachment(name);
          try {
            await api.uploadFile(namedFile);
          } catch (err) {
            console.error('Failed to upload pasted image:', err);
          }
        }
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        onAddAttachment(file.name);
        try {
          await api.uploadFile(file);
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
        }
      }
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        onAddAttachment(file.name);
        try {
          await api.uploadFile(file);
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
        }
      }
    }
  };

  const canSubmit = (text.trim().length > 0 || attachedFiles.length > 0) && !isExecuting;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="p-4 composer-gradient shrink-0 z-20"
    >
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Attachment chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-1 animate-slide-up">
            {attachedFiles.map((file, idx) => {
              const isUploading = uploadingFiles.includes(file);
              const isImg = isImageFile(file);
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2f2f2f] hover:bg-[#383838] border border-white/[0.12] text-xs font-mono text-zinc-200 shadow-sm transition-all"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span className="truncate max-w-[160px]">{file}</span>
                      <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded text-blue-300 animate-pulse">
                        uploading...
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectAttachment?.(file)}
                      className="flex items-center gap-1.5 hover:text-white group"
                      title={`Preview ${file} in Canvas`}
                    >
                      {isImg ? (
                        <span className="relative flex items-center justify-center w-4 h-4 rounded overflow-hidden bg-black/40 border border-white/20 shrink-0">
                          <img
                            src={`/files/raw/${encodeURIComponent(file)}`}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <ImageIcon className="w-3 h-3 text-blue-400" />
                        </span>
                      ) : (
                        <Paperclip className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                      )}
                      <span className="truncate max-w-[160px]">{file}</span>
                      <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 bg-white/[0.08] px-1 rounded">
                        Canvas ↗
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(idx)}
                    className="hover:text-rose-400 transition-colors ml-1 p-0.5"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Floating Capsule Container */}
        <div
          className={cn(
            'relative rounded-[30px] bg-[#222227] border border-white/[0.12] capsule-shadow transition-all duration-200 p-3.5 px-4 focus-within:border-white/[0.24] focus-within:bg-[#25252b]',
            isDragging && 'border-blue-500 ring-2 ring-blue-500/20 bg-[#2d2d35]'
          )}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isExecuting}
            placeholder={
              isExecuting
                ? 'Swara.ai is reasoning and executing tools...'
                : attachedFiles.length > 0
                ? 'Ask a question about the attached image/file, or press Enter to analyze...'
                : 'Message Swara.ai Industrial Workbench...'
            }
            className="w-full bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none disabled:opacity-50 min-h-[44px] max-h-[200px] leading-relaxed pr-12"
          />

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-white/[0.05]">
            {/* Left: Tools & Model Selector */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.bmp,.webp,.svg,.pdf,.docx,.doc,.xlsx,.pptx,.txt,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExecuting}
                className="p-2 rounded-full hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all active:scale-95"
                title="Attach Images (PNG, JPG), Diagrams (P&ID), or Documents (PDF, DOCX)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Model Override Inline Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelDropOpen(!modelDropOpen)}
                  disabled={isExecuting}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-medium text-zinc-300 hover:text-white transition-all disabled:opacity-50"
                  title="Select AI specialist model"
                >
                  <activeModel.icon className={`w-3 h-3 ${activeModel.color}`} />
                  <span className="hidden sm:inline max-w-[120px] truncate">{activeModel.label}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>

                {modelDropOpen && !isExecuting && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setModelDropOpen(false)} />
                    <div className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl bg-[#1f1f23] border border-white/[0.14] shadow-2xl p-2 z-40 animate-scale-in">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1 mb-1">
                        Route Override
                      </div>
                      {MODEL_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = opt.value === modelOverride;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              onModelOverrideChange(opt.value);
                              setModelDropOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 transition-all text-xs ${
                              isSelected
                                ? 'bg-white/[0.1] text-white border border-white/[0.1]'
                                : 'hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-transparent'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${opt.color} shrink-0`} />
                            <span>{opt.label}</span>
                            {isSelected && (
                              <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                                ON
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <div className="border-t border-white/[0.08] mt-2 pt-1.5 px-2 text-[10px] text-zinc-400 font-mono space-y-0.5">
                        <div className="flex justify-between">
                          <span>Runtime:</span>
                          <span className="text-white font-medium">Remote Kaggle GPU Pool (Dual T4/P100)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VRAM:</span>
                          <span className="text-emerald-400 font-medium">24 GB Allocated</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-medium text-zinc-300">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Agentic Reasoning</span>
              </span>
            </div>

            {/* Right: Circular Action Button */}
            <div>
              {isExecuting ? (
                <button
                  type="button"
                  onClick={onStopExecution}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:opacity-90 transition-all shadow-md active:scale-95"
                  title="Stop Generating"
                >
                  <Square className="w-3.5 h-3.5 fill-black" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!canSubmit}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95',
                    canSubmit
                      ? 'bg-white text-black hover:opacity-95 hover:scale-105 shadow-white/10'
                      : 'bg-white/[0.1] text-zinc-500 cursor-not-allowed'
                  )}
                  title="Send Message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <p className="text-[11px] text-center text-zinc-500 font-sans select-none">
          Swara.ai runs 100% sovereign on-premise · All data stays local
        </p>
      </div>
    </div>
  );
};
