import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { CitationItem } from '../../types/api';
import { CitationChip } from './CitationChip';

interface MarkdownRendererProps {
  content: string;
  citations?: CitationItem[];
  onInspectCitation?: (citation: CitationItem) => void;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  citations = [],
  onInspectCitation,
  isStreaming = false,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to split text by fenced code blocks
  const parseMarkdownBlocks = (text: string) => {
    const blocks: React.ReactNode[] = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let textBuffer: string[] = [];
    let codeBlockCount = 0;

    const flushTextBuffer = () => {
      if (textBuffer.length > 0) {
        const rawText = textBuffer.join('\n');
        blocks.push(renderTextAndTables(rawText, blocks.length));
        textBuffer = [];
      }
    };

    lines.forEach((line) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Closing code block
          const fullCode = codeBuffer.join('\n');
          const currentIdx = codeBlockCount++;
          blocks.push(
            <div key={`code-${currentIdx}`} className="my-4 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#1e1e20] shadow-md">
              <div className="flex items-center justify-between px-4 py-2 bg-[#27272a] border-b border-white/[0.06] text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-2 text-zinc-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block" />
                  {codeLanguage || 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(fullCode, currentIdx)}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs"
                  title="Copy code"
                >
                  {copiedIndex === currentIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed whitespace-pre bg-[#18181b]">
                {fullCode}
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeLanguage = '';
          codeBuffer = [];
        } else {
          // Opening code block
          flushTextBuffer();
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
          codeBuffer = [];
        }
      } else if (inCodeBlock) {
        codeBuffer.push(line);
      } else {
        textBuffer.push(line);
      }
    });

    flushTextBuffer();

    // If text ended while inside an unclosed code block (e.g. streaming code)
    if (inCodeBlock) {
      const fullCode = codeBuffer.join('\n');
      const currentIdx = codeBlockCount++;
      blocks.push(
        <div
          key={`code-streaming-${currentIdx}`}
          className="my-4 rounded-2xl overflow-hidden border border-purple-500/30 bg-[#1e1e20] shadow-md animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-[#27272a] border-b border-white/[0.06] text-xs font-mono">
            <span className="flex items-center gap-2 text-zinc-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>{codeLanguage || 'code'}</span>
              {isStreaming && (
                <span className="text-[10px] text-purple-400 font-normal bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 animate-pulse">
                  writing code...
                </span>
              )}
            </span>
          </div>
          <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed whitespace-pre bg-[#18181b]">
            {fullCode}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 rounded-sm animate-typing-cursor align-middle shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            )}
          </pre>
        </div>
      );
    } else if (isStreaming && blocks.length > 0) {
      // If streaming in prose, place the cursor inline at the end
      blocks.push(
        <span
          key="streaming-cursor"
          className="inline-block w-2 h-4.5 ml-1 bg-purple-400 rounded-sm animate-typing-cursor align-middle shadow-[0_0_8px_rgba(168,85,247,0.8)]"
          title="Typing..."
        />
      );
    }

    return blocks;
  };

  const renderTextAndTables = (text: string, keyPrefix: number) => {
    const paragraphs = text.split(/\n\n+/);
    return (
      <div key={`txt-block-${keyPrefix}`} className="space-y-3.5">
        {paragraphs.map((para, pIdx) => {
          const trimmed = para.trim();
          if (!trimmed) return null;

          // Check if paragraph is a markdown table
          if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
            return renderTable(trimmed, `tbl-${keyPrefix}-${pIdx}`);
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={pIdx} className="text-sm font-semibold text-white mt-4 mb-2">
                {renderInlineFormatted(trimmed.slice(4))}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={pIdx} className="text-base font-semibold text-white mt-5 mb-2.5 border-b border-white/[0.08] pb-1.5">
                {renderInlineFormatted(trimmed.slice(3))}
              </h3>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h2 key={pIdx} className="text-lg font-bold text-white mt-6 mb-3">
                {renderInlineFormatted(trimmed.slice(2))}
              </h2>
            );
          }

          // Lists
          const lines = trimmed.split('\n');
          if (lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* ') || /^\d+\.\s/.test(l.trim()))) {
            return (
              <ul key={pIdx} className="space-y-1.5 my-2.5 pl-5 list-disc marker:text-zinc-500 text-[15px] leading-relaxed">
                {lines.map((l, lIdx) => (
                  <li key={lIdx} className="pl-1">
                    {renderInlineFormatted(l.replace(/^[-*]\s+|\d+\.\s+/, ''))}
                  </li>
                ))}
              </ul>
            );
          }

          // Blockquote
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={pIdx} className="border-l-2 border-zinc-500 pl-4 py-1.5 text-zinc-300 italic my-3 text-sm">
                {renderInlineFormatted(trimmed.replace(/^>\s+/, ''))}
              </blockquote>
            );
          }

          // Standard paragraph
          return (
            <p key={pIdx} className="text-[15px] chat-prose-text leading-relaxed">
              {renderInlineFormatted(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderTable = (tableText: string, key: string) => {
    const rows = tableText.split('\n').filter((r) => r.trim().startsWith('|'));
    if (rows.length < 2) return <p key={key}>{tableText}</p>;

    const headerCells = rows[0].split('|').slice(1, -1).map((c) => c.trim());
    const dataRows = rows.slice(2).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));

    return (
      <div key={key} className="my-4 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#27272a] shadow-sm">
        <table className="w-full text-xs font-mono text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.08]">
              {headerCells.map((h, hIdx) => (
                <th key={hIdx} className="px-4 py-2.5 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider">
                  {renderInlineFormatted(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {dataRows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                {r.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 text-zinc-200">
                    {renderInlineFormatted(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Regex matching bold **text**, inline code `code`, and citations [tag]
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[(?:SOP-REF|INSPECTION|P&ID|[\w\-\.]+ · p\.\d+)[^\]]*\])/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-white/[0.08] text-purple-300 font-medium">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        const matchingCite = citations.find((c) => c.citation_tag === part);
        if (matchingCite && onInspectCitation) {
          return <CitationChip key={idx} citation={matchingCite} onClick={onInspectCitation} />;
        }
        return (
          <span key={idx} className="inline-flex font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return <div className="space-y-3 font-sans leading-relaxed">{parseMarkdownBlocks(content)}</div>;
};
