import React, { useEffect, useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StartupSequence } from './components/common/StartupSequence';
import { api } from './api/client';
import { sseClient } from './api/sse';
import {
  ArtifactResponse,
  CitationItem,
  FileUploadResponse,
  HardwareProfileStatus,
  PendingApproval,
  SessionResponse,
  SystemStatusResponse,
} from './types/api';
import { AgentEvent, AgentEventType } from './types/events';
import { ChatMessage, ExecutionTimelineStep, ToolRunInfo } from './types/workbench';
import { ModelOverrideKey } from './components/layout/TopBar';
import { HITLApprovalCard } from './components/chat/HITLApprovalCard';

const DEFAULT_TIMELINE_STAGES: ExecutionTimelineStep[] = [
  { id: 'stage-plan', name: 'PLAN', label: 'Plan & Analysis', status: 'pending' },
  { id: 'stage-route', name: 'ROUTE', label: 'Specialist Router', status: 'pending' },
  { id: 'stage-vision', name: 'VISION', label: 'Multimodal Vision', status: 'pending' },
  { id: 'stage-rag', name: 'RAG', label: 'SOP & Citation RAG', status: 'pending' },
  { id: 'stage-coder', name: 'CODER', label: 'Calculation & Code', status: 'pending' },
  { id: 'stage-reflect', name: 'REFLECT', label: 'Self-Reflection', status: 'pending' },
  { id: 'stage-hitl', name: 'HITL', label: 'Human Gate', status: 'pending' },
  { id: 'stage-finalize', name: 'FINALIZE', label: 'Final Output', status: 'pending' },
];

export function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [hardwareStatus, setHardwareStatus] = useState<HardwareProfileStatus | null>(null);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [artifactsList, setArtifactsList] = useState<ArtifactResponse[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactResponse | null>(null);
  const [pendingApprovalTask, setPendingApprovalTask] = useState<PendingApproval | null>(null);
  const [inspectedCitation, setInspectedCitation] = useState<CitationItem | null>(null);
  const [isTestingEgress, setIsTestingEgress] = useState(false);
  const [egressPassed, setEgressPassed] = useState<boolean | null>(null);
  // Model override — "auto" uses the 3-layer intelligent router
  const [modelOverride, setModelOverride] = useState<ModelOverrideKey>('auto');
  const [timelineSteps, setTimelineSteps] = useState<ExecutionTimelineStep[]>([]);

  // 1. Initial boot data fetch with persistence recovery
  useEffect(() => {
    const cachedSess = localStorage.getItem('swara_sessions');

    if (cachedSess) {
      try {
        const parsed = JSON.parse(cachedSess);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].session_id);
        }
      } catch {}
    }

    const initSystem = async () => {
      try {
        const [sys, hw, sessList, artList] = await Promise.all([
          api.getSystemStatus().catch(() => null),
          api.getHardwareProfile().catch(() => null),
          api.listSessions().catch(() => []),
          api.listArtifacts().catch(() => []),
        ]);

        if (sys) setSystemStatus(sys);
        if (hw) setHardwareStatus(hw);
        setArtifactsList(artList);

        if (sessList && sessList.length > 0) {
          setSessions(sessList);
          setActiveSessionId((prev) => prev || sessList[0].session_id);
          localStorage.setItem('swara_sessions', JSON.stringify(sessList));
        } else if (!cachedSess) {
          const newSess = await api.createSession('General Engineering Task');
          setSessions([newSess]);
          setActiveSessionId(newSess.session_id);
          localStorage.setItem('swara_sessions', JSON.stringify([newSess]));
        }
      } catch (err) {
        console.error('Initial boot error:', err);
      }
    };
    initSystem();
  }, []);

  // 2. Connect SSE stream whenever active session changes
  useEffect(() => {
    if (!activeSessionId) return;

    sseClient.connect(activeSessionId);

    const unsubscribe = sseClient.subscribe((event: AgentEvent) => {
      handleIncomingSSEEvent(event);
    });

    // Load message history for session
    api.getSessionMessages(activeSessionId)
      .then((res) => {
        if (res && res.messages) {
          const mapped: ChatMessage[] = res.messages.map((m: any, idx: number) => {
            let content = m.content || '';
            let thought = m.thought || '';
            const thinkMatch = content.match(/<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/i);
            if (thinkMatch) {
              if (!thought) thought = thinkMatch[1].trim();
              content = content.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>\s*/i, '').trim();
            }
            return {
              id: `msg-${activeSessionId}-${idx}`,
              role: m.role as any,
              content: content,
              thought: thought || undefined,
              timestamp: m.timestamp || new Date().toISOString(),
              attachments: m.attachments || [],
              executionTimeMs: m.execution_time_ms || m.executionTimeMs,
              reasoningSummary: m.reasoning_summary || m.reasoningSummary,
              taskType: m.task_type || m.taskType,
              citations: m.citations || [],
              artifacts: m.artifacts || [],
            };
          });
          setMessages(mapped);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
    };
  }, [activeSessionId]);

  // 3. SSE event dispatcher mapping backend states to rich UI elements
  const handleIncomingSSEEvent = (event: AgentEvent) => {
    const updateGlobalStage = (name: string, status: ExecutionTimelineStep['status'], detail?: string) => {
      setTimelineSteps((prev) => {
        if (!prev || prev.length === 0) return prev;
        return prev.map((s) => (s.name === name ? { ...s, status, detail: detail || s.detail } : s));
      });
    };

    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;

      const updated: ChatMessage = { ...last };
      const currentTimeline = [...(updated.timeline || [])];
      const currentTools = [...(updated.tools || [])];
      const currentObservations = [...(updated.observations || [])];

      switch (event.event_type) {
        case AgentEventType.SESSION_START:
          updateGlobalStage('PLAN', 'running', 'Planning execution');
          break;

        case AgentEventType.ROUTE_DECISION:
          updated.taskType = event.data?.task_type || event.data?.specialist || 'conversation';
          updateGlobalStage('PLAN', 'completed', 'Plan ready');
          updateGlobalStage('ROUTE', 'completed', event.message || `Routed to ${updated.taskType}`);
          {
            const r = String(event.data?.specialist || updated.taskType).toLowerCase();
            if (r.includes('vision')) updateGlobalStage('VISION', 'running', 'Multimodal Vision active');
            else if (r.includes('coder')) updateGlobalStage('CODER', 'running', 'Coder specialist active');
            else updateGlobalStage('RAG', 'running', 'SOP knowledge retrieval active');
          }
          currentTimeline.push({
            id: `step-${Date.now()}`,
            name: 'ROUTE',
            label: 'Task Routing',
            status: 'completed',
            detail: event.message || `Routed to ${updated.taskType}`,
          });
          break;

        case AgentEventType.AGENT_STEP:
          if (event.step_name === 'CEO' || event.step_name === 'PLAN') {
            updated.reasoningSummary = event.message || 'Authoritative plan synthesized by CEO model';
            updateGlobalStage('PLAN', 'completed', event.message || 'Plan created');
            updateGlobalStage('ROUTE', 'running', 'Evaluating fast-path');
            currentTimeline.push({
              id: `step-${Date.now()}`,
              name: 'PLAN',
              label: 'CEO Execution Plan',
              status: 'completed',
              detail: event.message || 'Plan created',
            });
          }
          break;

        case AgentEventType.TOOL_CALL:
          const toolName = event.data?.tool_name || event.step_name || 'tool';
          const toolCat =
            toolName.includes('vision') ? 'vision'
            : toolName.includes('rag') ? 'rag'
            : toolName.includes('sandbox') || toolName.includes('python') || toolName.includes('coder') ? 'coder'
            : 'document';

          if (toolCat === 'vision') updateGlobalStage('VISION', 'running', `Inspecting diagram`);
          else if (toolCat === 'coder') updateGlobalStage('CODER', 'running', `Executing calculation`);
          else if (toolCat === 'rag') updateGlobalStage('RAG', 'running', `Querying SOP`);

          currentTools.push({
            id: `tool-${Date.now()}`,
            toolName: toolName,
            category: toolCat as any,
            status: 'running',
            inputs: event.data,
          });

          currentTimeline.push({
            id: `step-tool-${Date.now()}`,
            name: 'TOOL',
            label: `Executing ${toolName}`,
            status: 'running',
            detail: `Executing ${toolName}...`,
          });
          break;

        case AgentEventType.TOOL_RESULT:
          let runningIdx = -1;
          for (let i = currentTools.length - 1; i >= 0; i--) {
            if (currentTools[i].status === 'running') {
              runningIdx = i;
              break;
            }
          }
          if (runningIdx !== -1) {
            currentTools[runningIdx].status = event.data?.status === 'success' ? 'success' : 'error';
            currentTools[runningIdx].output = event.data?.output;
            currentTools[runningIdx].durationMs = event.data?.execution_time_ms;

            const tName = currentTools[runningIdx].toolName.toLowerCase();
            if (tName.includes('vision')) updateGlobalStage('VISION', 'completed', 'Vision features extracted');
            else if (tName.includes('coder')) updateGlobalStage('CODER', 'completed', 'Calculation complete');
            else if (tName.includes('rag')) updateGlobalStage('RAG', 'completed', 'Citations grounded');
          }

          if (event.data?.output) {
            const obsStr =
              typeof event.data.output === 'string'
                ? event.data.output
                : JSON.stringify(event.data.output, null, 2);
            currentObservations.push(obsStr);
          }

          currentTimeline.push({
            id: `step-obs-${Date.now()}`,
            name: 'OBSERVE',
            label: 'Tool Observation',
            status: 'completed',
            detail: event.message || 'Observation captured',
          });
          break;

        case AgentEventType.VERIFICATION:
          updated.verificationPassed = event.data?.passed ?? true;
          updateGlobalStage('REFLECT', updated.verificationPassed ? 'completed' : 'failed', event.message || 'Verification complete');
          currentTimeline.push({
            id: `step-ver-${Date.now()}`,
            name: 'REFLECT',
            label: 'Deterministic Verification',
            status: updated.verificationPassed ? 'completed' : 'failed',
            detail: event.message || (updated.verificationPassed ? 'PASS' : 'FAILED'),
          });
          break;

        case AgentEventType.HITL_REQUEST: {
          const apprItem: PendingApproval = {
            action_id: event.data?.action_id || event.data?.task_id || 'act-1',
            type: event.data?.type || 'create_artifact',
            description: event.data?.description || event.message || 'Human-in-the-Loop Confirmation Required',
            details: event.data?.details || event.data,
          };
          updateGlobalStage('HITL', 'approval_required', event.message || 'Awaiting engineer review');
          updated.pendingApprovals = [
            ...(updated.pendingApprovals || []),
            apprItem,
          ];
          setPendingApprovalTask(apprItem);
          currentTimeline.push({
            id: `step-hitl-${Date.now()}`,
            name: 'HITL',
            label: 'Engineer Approval',
            status: 'approval_required',
            detail: 'Awaiting engineer review',
          });
          break;
        }

        case AgentEventType.ARTIFACT_CREATED:
          if (event.data) {
            const newArt: ArtifactResponse = {
              artifact_id: event.data.artifact_id || 'art-1',
              filename: event.data.filename || 'deliverable.docx',
              file_type: event.data.file_type || 'docx',
              file_size_bytes: event.data.file_size_bytes || 1024,
              sha256: event.data.sha256 || '',
              created_at: new Date().toISOString(),
              approved: true,
              requires_approval: false,
              download_url: `/artifacts/${event.data.artifact_id || event.data.sha256?.slice(0, 8)}/download`,
            };
            updated.artifacts = [...(updated.artifacts || []), newArt];
            setArtifactsList((prevArts) => [newArt, ...prevArts.filter((a) => a.artifact_id !== newArt.artifact_id)]);
            setPendingApprovalTask(null);
            updateGlobalStage('HITL', 'completed');
            updateGlobalStage('FINALIZE', 'completed', `Deliverable ${newArt.filename} generated`);
          }
          break;

        case AgentEventType.FINAL_RESPONSE:
          updated.content = event.data?.final_response || event.message || updated.content;
          updated.isStreaming = false;
          setPendingApprovalTask(null);
          updateGlobalStage('FINALIZE', 'completed', 'Output complete');
          currentTimeline.push({
            id: `step-fin-${Date.now()}`,
            name: 'FINALIZE',
            label: 'Synthesis Complete',
            status: 'completed',
            detail: 'Verified response ready',
          });
          break;
      }

      updated.timeline = currentTimeline;
      updated.tools = currentTools;
      updated.observations = currentObservations;

      return [...prev.slice(0, -1), updated];
    });
  };

  // 4. Send Message Handler
  const handleSendMessage = async (userText: string, attachedFiles: string[], override?: ModelOverrideKey) => {
    if (!userText.trim() || isExecuting) return;

    setTimelineSteps(
      DEFAULT_TIMELINE_STAGES.map((s, idx) => (idx === 0 ? { ...s, status: 'running' } : { ...s, status: 'pending' }))
    );

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `asst-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      attachments: attachedFiles,
    };

    const initialAsstMsg: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      reasoningSummary: 'Understanding engineering intent...',
      timeline: [
        {
          id: 'step-und-1',
          name: 'UNDERSTAND',
          label: 'Task Understanding',
          status: 'running',
          detail: 'Analyzing request constraints and evidence requirements...',
        },
      ],
      tools: [],
      observations: [],
      citations: [],
      artifacts: [],
    };

    setMessages((prev) => [...prev, userMsg, initialAsstMsg]);
    setIsExecuting(true);

    try {
      const resp = await api.sendChat({
        session_id: activeSessionId || undefined,
        message: userText,
        attachments: attachedFiles,
        model_override: override || modelOverride,
      });

      // Auto-update session title and message count
      const cleanSnippet = userText.trim();
      const fallbackTitle = cleanSnippet.length > 32 ? cleanSnippet.slice(0, 32) + '...' : cleanSnippet;
      const resolvedTitle = resp.title || fallbackTitle;

      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.session_id === (activeSessionId || resp.session_id)) {
            const isGeneric = !s.title || s.title === 'New Task' || s.title === 'General Engineering Task' || s.title.startsWith('Task_');
            return {
              ...s,
              title: isGeneric ? resolvedTitle : s.title,
              message_count: (s.message_count || 0) + 1,
            };
          }
          return s;
        });
        localStorage.setItem('swara_sessions', JSON.stringify(updated));
        return updated;
      });

      // 1. Update metadata first while keeping isStreaming = true for typing animation
      let fullText = resp.final_response || '';
      let extractedThought = resp.thought || '';

      const thinkMatch = fullText.match(/<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/i);
      if (thinkMatch) {
        if (!extractedThought) extractedThought = thinkMatch[1].trim();
        fullText = fullText.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>\s*/i, '').trim();
      }

      setMessages((prev) => {
        const lastIdx = prev.findIndex((m) => m.id === assistantMessageId);
        if (lastIdx === -1) return prev;

        const updated: ChatMessage = {
          ...prev[lastIdx],
          thought: extractedThought || undefined,
          taskType: resp.task_type,
          citations: resp.citations,
          artifacts: resp.artifacts,
          pendingApprovals: resp.pending_approvals,
          verificationPassed: resp.verification_passed,
          executionTimeMs: resp.execution_time_ms,
          reasoningSummary: extractedThought ? 'Thought process' : (resp.execution_time_ms ? `Thought for ${(resp.execution_time_ms / 1000).toFixed(1)}s` : undefined),
          isStreaming: true,
        };

        return [...prev.slice(0, lastIdx), updated];
      });

      // 2. Smooth adaptive typewriter animation (supports live streaming code blocks)
      const totalLen = fullText.length;
      const chunkSize = totalLen > 1500 ? 12 : totalLen > 600 ? 6 : totalLen > 200 ? 3 : 2;
      const stepDelay = totalLen > 1500 ? 12 : totalLen > 600 ? 16 : 20;

      let currentPos = 0;
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          currentPos = Math.min(totalLen, currentPos + chunkSize);
          const currentSlice = fullText.slice(0, currentPos);
          const isDone = currentPos >= totalLen;

          setMessages((prev) => {
            const lastIdx = prev.findIndex((m) => m.id === assistantMessageId);
            if (lastIdx === -1) return prev;
            return [
              ...prev.slice(0, lastIdx),
              {
                ...prev[lastIdx],
                content: currentSlice,
                isStreaming: !isDone,
              },
            ];
          });

          if (isDone) {
            clearInterval(timer);
            resolve();
          }
        }, stepDelay);
      });

      if (resp.artifacts && resp.artifacts.length > 0) {
        setSelectedArtifact(resp.artifacts[0]);
        setArtifactsList((prevArts) => [...resp.artifacts, ...prevArts]);
      }
    } catch (err: any) {
      setMessages((prev) => {
        const lastIdx = prev.findIndex((m) => m.id === assistantMessageId);
        if (lastIdx === -1) return prev;
        return [
          ...prev.slice(0, lastIdx),
          {
            ...prev[lastIdx],
            content: `Unable to complete analysis. Backend Reason: ${err.message || 'Inference failure'}`,
            isStreaming: false,
            verificationPassed: false,
          },
        ];
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 5. Session Actions
  const handleNewSession = async () => {
    try {
      const sess = await api.createSession('New Task');
      setSessions((prev) => {
        const next = [sess, ...prev];
        localStorage.setItem('swara_sessions', JSON.stringify(next));
        return next;
      });
      setActiveSessionId(sess.session_id);
      setMessages([]);
      setSelectedArtifact(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSelectedArtifact(null);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => {
        const next = prev.filter((s) => s.session_id !== sessionId);
        localStorage.setItem('swara_sessions', JSON.stringify(next));
        if (activeSessionId === sessionId) {
          if (next.length > 0) {
            setActiveSessionId(next[0].session_id);
          } else {
            handleNewSession();
          }
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // 6. HITL Approval Actions
  const handleApproveAction = async (actionId: string) => {
    const taskId = (pendingApprovalTask as any)?.task_id || pendingApprovalTask?.action_id || actionId || selectedArtifact?.artifact_id || activeSessionId || 'memo';
    try {
      await api.approveArtifact(taskId, actionId, true);
      setTimelineSteps((prev) =>
        prev.map((s) => {
          if (s.name === 'HITL') return { ...s, status: 'completed', detail: 'Approved by Engineer' };
          if (s.name === 'FINALIZE') return { ...s, status: 'running', detail: 'Generating deliverables...' };
          return s;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectAction = async (actionId: string, reason?: string) => {
    const taskId = (pendingApprovalTask as any)?.task_id || pendingApprovalTask?.action_id || actionId || selectedArtifact?.artifact_id || activeSessionId || 'memo';
    try {
      await api.approveArtifact(taskId, actionId, false, reason);
      setTimelineSteps((prev) =>
        prev.map((s) => (s.name === 'HITL' ? { ...s, status: 'failed', detail: 'Action rejected by Engineer' } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Test Egress Action
  const handleRunTestEgress = async () => {
    setIsTestingEgress(true);
    setEgressPassed(null);
    try {
      const res = await api.runTestEgress();
      setEgressPassed(Boolean(res?.sovereignty_intact));
    } catch (err) {
      console.error(err);
      setEgressPassed(false);
    } finally {
      setIsTestingEgress(false);
    }
  };

  // 8. Document Ingested Callback
  const handleFileUploaded = (res: FileUploadResponse) => {
    // File uploaded and indexed
  };

  // 9. Open Document in Canvas (Claude-style side panel reader)
  const handleOpenDocumentInCanvas = async (filename: string) => {
    try {
      const doc = await api.getDocumentPreview(filename);
      const docArtifact: ArtifactResponse = {
        artifact_id: `doc_${filename.replace(/[^a-zA-Z0-9]/g, '_')}`,
        filename: doc.filename || filename,
        file_type: doc.file_type || 'pdf',
        file_size_bytes: doc.file_size_bytes || 0,
        sha256: doc.sha256 || '',
        created_at: new Date().toISOString(),
        approved: true,
        requires_approval: false,
        download_url: doc.download_url || `/api/documents/download/${encodeURIComponent(filename)}`,
        content: doc.content || '',
        pages_data: doc.pages || [],
        aspect_ratio: doc.aspect_ratio || 0.707,
      };
      setSelectedArtifact(docArtifact);
    } catch (err) {
      console.error('Failed to load document for Canvas preview:', err);
    }
  };

  return (
    <>
      {isInitializing ? (
        <StartupSequence status={systemStatus} onComplete={() => setIsInitializing(false)} />
      ) : (
        <AppLayout
          systemStatus={systemStatus}
          hardwareStatus={hardwareStatus}
          sessions={sessions}
          activeSessionId={activeSessionId}
          messages={messages}
          isExecuting={isExecuting}
          artifactsList={artifactsList}
          selectedArtifact={selectedArtifact}
          inspectedCitation={inspectedCitation}
          onSendMessage={handleSendMessage}
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onSelectArtifact={(art) => setSelectedArtifact(art)}
          onCloseArtifact={() => setSelectedArtifact(null)}
          onInspectCitation={(cite) => setInspectedCitation(cite)}
          onCloseCitation={() => setInspectedCitation(null)}
          onApproveAction={handleApproveAction}
          onRejectAction={handleRejectAction}
          onRunTestEgress={handleRunTestEgress}
          isTestingEgress={isTestingEgress}
          egressPassed={egressPassed}
          onFileUploaded={handleFileUploaded}
          onSelectDocument={handleOpenDocumentInCanvas}
          modelOverride={modelOverride}
          onModelOverrideChange={setModelOverride}
          timelineSteps={timelineSteps}
        />
      )}

      {/* Top-Level Blocking HITL Approval Modal Overlay */}
      {pendingApprovalTask && (
        <HITLApprovalCard
          approval={pendingApprovalTask}
          blocking={true}
          onApprove={async (actionId) => {
            await handleApproveAction(actionId);
          }}
          onReject={async (actionId, reason) => {
            await handleRejectAction(actionId, reason);
            setPendingApprovalTask(null);
          }}
        />
      )}
    </>
  );
}

export default App;

