import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessage, ExecutionTimelineStep } from '../../types/workbench';
import { ArtifactResponse, CitationItem } from '../../types/api';
import { UserMessageCard } from './UserMessageCard';
import { AssistantMessageCard } from './AssistantMessageCard';
import { ExecutionTimeline } from './ExecutionTimeline';

interface ChatContainerProps {
  messages: ChatMessage[];
  onInspectCitation: (citation: CitationItem) => void;
  onSelectArtifact: (artifact: ArtifactResponse) => void;
  onSelectDocument?: (filename: string) => void;
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string, reason?: string) => Promise<void>;
  timelineSteps?: ExecutionTimelineStep[];
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onInspectCitation,
  onSelectArtifact,
  onSelectDocument,
  onApproveAction,
  onRejectAction,
  timelineSteps = [],
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setShowScrollBottom(false);
    setAutoScroll(true);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 60;
    setShowScrollBottom(!isBottom);
    setAutoScroll(isBottom);
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, timelineSteps, autoScroll]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[#161619] overflow-hidden">
      {/* Execution Timeline — shown above messages when steps are present */}
      {timelineSteps.length > 0 && (
        <div className="shrink-0 px-4 md:px-8 pt-4">
          <div className="max-w-3xl mx-auto">
            <ExecutionTimeline steps={timelineSteps} />
          </div>
        </div>
      )}

      {/* Scrollable Messages Stream */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-2"
      >
        <div className="max-w-3xl mx-auto space-y-2">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <UserMessageCard
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
                attachments={msg.attachments}
                onSelectAttachment={onSelectDocument}
              />
            ) : (
              <AssistantMessageCard
                key={msg.id}
                message={msg}
                onInspectCitation={onInspectCitation}
                onSelectArtifact={onSelectArtifact}
                onApproveAction={onApproveAction}
                onRejectAction={onRejectAction}
              />
            )
          )}
        </div>
      </div>

      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 right-8 p-2.5 rounded-full bg-[#242428] border border-white/[0.14] text-zinc-300 hover:text-white hover:bg-[#2e2e34] shadow-2xl transition-all flex items-center justify-center animate-scale-in active:scale-95 rim-highlight"
          title="Jump to latest"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
