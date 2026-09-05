import React, { useState, useRef } from 'react';
import { UploadCloud, ShieldCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar, ModelOverrideKey } from './TopBar';
import { ChatContainer } from '../chat/ChatContainer';
import { Composer } from '../chat/Composer';
import { ArtifactWorkspace } from '../artifact/ArtifactWorkspace';
import { IdleWorkbench } from '../common/IdleWorkbench';
import { SourceInspectorModal } from '../modals/SourceInspectorModal';
import { SovereigntyModal } from '../modals/SovereigntyModal';
import { HardwareModal } from '../modals/HardwareModal';
import { IngestionModal } from '../modals/IngestionModal';
import { AuditTrailModal } from '../modals/AuditTrailModal';
import { ContextDebugModal } from '../modals/ContextDebugModal';
import { SettingsModal } from '../modals/SettingsModal';
import { api } from '../../api/client';
import {
  ArtifactResponse,
  CitationItem,
  FileUploadResponse,
  HardwareProfileStatus,
  SessionResponse,
  SystemStatusResponse,
} from '../../types/api';
import { ChatMessage, SidebarSection, ExecutionTimelineStep } from '../../types/workbench';

interface AppLayoutProps {
  systemStatus: SystemStatusResponse | null;
  hardwareStatus: HardwareProfileStatus | null;
  sessions: SessionResponse[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isExecuting: boolean;
  artifactsList: ArtifactResponse[];
  selectedArtifact: ArtifactResponse | null;
  inspectedCitation: CitationItem | null;
  onSendMessage: (message: string, attachments: string[], modelOverride?: ModelOverrideKey) => void;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onSelectArtifact: (art: ArtifactResponse) => void;
  onCloseArtifact: () => void;
  onInspectCitation: (cite: CitationItem) => void;
  onCloseCitation: () => void;
  onApproveAction: (actionId: string) => Promise<void>;
  onRejectAction: (actionId: string, reason?: string) => Promise<void>;
  onRunTestEgress: () => void;
  isTestingEgress: boolean;
  egressPassed: boolean | null;
  onFileUploaded: (resp: FileUploadResponse) => void;
  onSelectDocument?: (filename: string) => void;
  modelOverride: ModelOverrideKey;
  onModelOverrideChange: (val: ModelOverrideKey) => void;
  timelineSteps?: ExecutionTimelineStep[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  systemStatus,
  hardwareStatus,
  sessions,
  activeSessionId,
  messages,
  isExecuting,
  artifactsList,
  selectedArtifact,
  inspectedCitation,
  onSendMessage,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onSelectArtifact,
  onCloseArtifact,
  onInspectCitation,
  onCloseCitation,
  onApproveAction,
  onRejectAction,
  onRunTestEgress,
  isTestingEgress,
  egressPassed,
  onFileUploaded,
  onSelectDocument,
  modelOverride,
  onModelOverrideChange,
  timelineSteps = [],
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>('chat');

  // Modal open states
  const [sovereigntyModalOpen, setSovereigntyModalOpen] = useState(false);
  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);
  const [ingestionModalOpen, setIngestionModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Composer attachments & Drag-and-drop
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  const handleAddAttachment = (filename: string) => {
    if (!attachedFiles.includes(filename)) {
      setAttachedFiles((prev) => [...prev, filename]);
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        handleAddAttachment(file.name);
        setUploadingFiles((prev) => [...prev, file.name]);
        try {
          const res = await api.uploadFile(file);
          onFileUploaded(res);
        } catch (err) {
          console.error('Failed to upload dropped file:', file.name, err);
        } finally {
          setUploadingFiles((prev) => prev.filter((f) => f !== file.name));
        }
      }
    }
  };

  const handleSelectSection = (section: SidebarSection) => {
    setActiveSection(section);
    if (section === 'sovereignty') setSovereigntyModalOpen(true);
    if (section === 'hardware' || section === 'models') setHardwareModalOpen(true);
    if (section === 'documents') setIngestionModalOpen(true);
    if (section === 'audit') setAuditModalOpen(true);
  };

  // Find all citations across messages for Artifact workspace evidence tab
  const allCitations = messages.flatMap((m) => m.citations || []);

  const currentSession = sessions.find((s) => s.session_id === activeSessionId);
  const sessionTitle = currentSession ? (currentSession.title || `Task_${currentSession.session_id.slice(0, 6)}`) : 'New Task';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#212121] text-[#ececec] overflow-hidden font-sans">
      {/* Top Bar Header */}
      <TopBar
        systemStatus={systemStatus}
        hardwareStatus={hardwareStatus}
        sessionTitle={sessionTitle}
        onOpenSovereignty={() => setSovereigntyModalOpen(true)}
        onOpenHardware={() => setHardwareModalOpen(true)}
        onOpenUpload={() => setIngestionModalOpen(true)}
        onOpenAudit={() => setAuditModalOpen(true)}
        onOpenDebug={() => setDebugModalOpen(true)}
        onRunTestEgress={onRunTestEgress}
        onNewSession={onNewSession}
        isTestingEgress={isTestingEgress}
        egressPassed={egressPassed}
        onOpenSettings={() => setSettingsModalOpen(true)}
        modelOverride={modelOverride}
        onModelOverrideChange={onModelOverrideChange}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 1. Left Navigation Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />

        {/* 2. Center Region (Engineering Chat & Agent Execution Stream) */}
        <main
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 flex flex-col min-w-0 bg-[#212121] overflow-hidden relative"
        >
          {/* Full-Screen Drag & Drop Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-50 bg-[#1e1e20]/92 backdrop-blur-sm border-2 border-dashed border-purple-500/80 rounded-2xl m-3 flex flex-col items-center justify-center gap-3 transition-all duration-200 pointer-events-none animate-fade-in shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 animate-bounce">
                <UploadCloud className="w-7 h-7 text-purple-400" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Drop files to attach to conversation
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  PDF, DOCX, CSV, code, slides · Sovereign Air-Gap Local
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Instant Canvas Preview available</span>
              </div>
            </div>
          )}

          {/* Scrollable conversation or idle area */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {messages.length === 0 ? (
              <IdleWorkbench
                onSelectPrompt={(p) => onSendMessage(p, attachedFiles, modelOverride)}
                onOpenUpload={() => setIngestionModalOpen(true)}
                onAddAttachment={handleAddAttachment}
              />
            ) : (
              <ChatContainer
                messages={messages}
                onInspectCitation={onInspectCitation}
                onSelectArtifact={onSelectArtifact}
                onSelectDocument={onSelectDocument}
                onApproveAction={onApproveAction}
                onRejectAction={onRejectAction}
                timelineSteps={timelineSteps}
              />
            )}
          </div>

          {/* Composer - pinned bottom */}
          <div className="flex-shrink-0">
            <Composer
              onSendMessage={(msg, files, override) => {
                onSendMessage(msg, files, override || modelOverride);
                setAttachedFiles([]);
              }}
              isExecuting={isExecuting}
              attachedFiles={attachedFiles}
              uploadingFiles={uploadingFiles}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onSelectAttachment={onSelectDocument}
              modelOverride={modelOverride}
              onModelOverrideChange={onModelOverrideChange}
            />
          </div>
        </main>

        {/* 3. Right Region (Work Output & Artifact Canvas) */}
        {Boolean(selectedArtifact || (activeSection === 'artifacts' && artifactsList.length > 0)) && !(messages.length === 0 && !selectedArtifact) && (
          <ArtifactWorkspace
            artifact={selectedArtifact || artifactsList[0]}
            artifactsList={artifactsList}
            citations={allCitations}
            messages={messages}
            onClose={() => {
              onCloseArtifact();
              if (activeSection === 'artifacts') {
                setActiveSection('chat');
              }
            }}
            onSelectArtifact={onSelectArtifact}
            onSelectDocument={onSelectDocument}
            onInspectCitation={onInspectCitation}
          />
        )}
      </div>

      {/* Overlays and Modals */}
      {inspectedCitation && (
        <SourceInspectorModal citation={inspectedCitation} onClose={onCloseCitation} />
      )}

      {sovereigntyModalOpen && (
        <SovereigntyModal
          sovereignty={systemStatus?.sovereignty || null}
          onClose={() => setSovereigntyModalOpen(false)}
        />
      )}

      {hardwareModalOpen && (
        <HardwareModal
          hardware={hardwareStatus}
          systemStatus={systemStatus}
          onClose={() => setHardwareModalOpen(false)}
        />
      )}

      {ingestionModalOpen && (
        <IngestionModal
          onClose={() => setIngestionModalOpen(false)}
          onFileUploaded={(res) => {
            onFileUploaded(res);
            handleAddAttachment(res.filename);
          }}
        />
      )}

      {auditModalOpen && (
        <AuditTrailModal
          sessionId={activeSessionId || 'default'}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

      {debugModalOpen && (
        <ContextDebugModal
          sessionId={activeSessionId}
          onClose={() => setDebugModalOpen(false)}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} />
      )}
    </div>
  );
};
