/** Server-Sent Events (SSE) Client for Swara.ai Live Execution Streaming. */

import { AgentEvent, AgentEventType } from '../types/events';

export type SSEEventListener = (event: AgentEvent) => void;

export class SwaraSSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<SSEEventListener> = new Set();
  private isConnected: boolean = false;
  private currentSessionId: string | null = null;

  connect(sessionId?: string): void {
    if (this.currentSessionId === sessionId && this.isConnected && this.eventSource) {
      return;
    }

    this.disconnect();
    this.currentSessionId = sessionId || 'swara-session';

    const streamUrl = sessionId ? `/stream?session_id=${encodeURIComponent(sessionId)}` : '/stream';
    this.eventSource = new EventSource(streamUrl);

    this.eventSource.onopen = () => {
      this.isConnected = true;
    };

    // Helper to emit normalized event
    const handleEvent = (type: AgentEventType, payload: any, stepName?: string, message?: string) => {
      const normalized: AgentEvent = {
        event_id: payload.task_id || payload.event_id || `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        session_id: this.currentSessionId || payload.task_id || 'default',
        request_id: payload.task_id,
        event_type: type,
        step_name: stepName || payload.node || payload.tool,
        data: payload,
        message: message || payload.trace || payload.note || payload.message,
      };
      this.emit(normalized);
    };

    // 1. Listen to all typed enum events
    Object.values(AgentEventType).forEach((type) => {
      this.eventSource?.addEventListener(type, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          handleEvent(type, parsed, parsed.step_name, parsed.message);
        } catch (err) {
          console.warn('[SSE] Failed to parse agent event payload:', err);
        }
      });
    });

    // 2. Listen to Swara-specific event types
    this.eventSource.addEventListener('[ROUTE]', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handleEvent(
          AgentEventType.ROUTE_DECISION,
          { task_type: parsed.specialist, ...parsed },
          'ROUTER',
          parsed.trace || `Routed to ${parsed.specialist}`
        );
      } catch (err) {
        console.warn('[SSE] Failed to parse [ROUTE]:', err);
      }
    });

    this.eventSource.addEventListener('agent_start', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handleEvent(AgentEventType.SESSION_START, parsed, 'START', `Agent started for specialist: ${parsed.specialist}`);
      } catch (err) {
        console.warn('[SSE] Failed to parse agent_start:', err);
      }
    });

    this.eventSource.addEventListener('agent_tool', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handleEvent(AgentEventType.TOOL_CALL, parsed, parsed.tool, `Executing tool: ${parsed.tool}`);
      } catch (err) {
        console.warn('[SSE] Failed to parse agent_tool:', err);
      }
    });

    this.eventSource.addEventListener('agent_done', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const filename = parsed.artifact ? parsed.artifact.replace(/\\/g, '/').split('/').pop() : `${parsed.task_id}_memo.docx`;
        handleEvent(
          AgentEventType.ARTIFACT_CREATED,
          {
            artifact_id: parsed.task_id,
            filename: filename,
            file_type: 'docx',
            file_size_bytes: 1024,
            download_url: `/api/artifact/${parsed.task_id}`,
            ...parsed,
          },
          'ARTIFACT',
          `Deliverable generated: ${filename}`
        );
        handleEvent(
          AgentEventType.FINAL_RESPONSE,
          { final_response: `Analysis complete. Engineering memorandum generated successfully. Grounded with citations: ${(parsed.citations || []).join(', ')}` },
          'FINALIZE',
          'Analysis complete'
        );
      } catch (err) {
        console.warn('[SSE] Failed to parse agent_done:', err);
      }
    });

    this.eventSource.addEventListener('agent_hitl', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handleEvent(
          AgentEventType.HITL_REQUEST,
          {
            action_id: parsed.task_id || parsed.action_id || 'hitl-1',
            task_id: parsed.task_id,
            type: parsed.deliverable_type || 'create_artifact',
            description: parsed.preview || parsed.diff || 'Human-in-the-Loop Confirmation Required',
            title: parsed.title || 'Engineering Deliverable',
            diff: parsed.diff,
            preview: parsed.preview,
            citations: parsed.citations || [],
            details: {
              diff: parsed.diff,
              preview: parsed.preview,
              title: parsed.title,
              sop_citations: parsed.citations || [],
              corrosion_rates: parsed.corrosion_rates || [],
              pid_tags: parsed.pid_tags || [],
            },
            ...parsed,
          },
          'HITL',
          'Awaiting engineer review before deliverable generation'
        );
      } catch (err) {
        console.warn('[SSE] Failed to parse agent_hitl:', err);
      }
    });

    this.eventSource.addEventListener('loop_kill', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handleEvent(AgentEventType.AGENT_STEP, parsed, 'LOOP_KILL', `[LOOP-KILL] ${parsed.reason || 'Loop broken'}`);
      } catch (err) {
        console.warn('[SSE] Failed to parse loop_kill:', err);
      }
    });

    this.eventSource.addEventListener('egress_blocked', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handleEvent(AgentEventType.AGENT_STEP, parsed, 'EGRESS_BLOCKED', `[AIRGAP-EGRESS-DROP] ${parsed.label} (${parsed.target})`);
      } catch (err) {
        console.warn('[SSE] Failed to parse egress_blocked:', err);
      }
    });

    // Handle keepalive pings
    this.eventSource.addEventListener('ping', () => {});

    this.eventSource.onerror = () => {
      this.isConnected = false;
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.currentSessionId = null;
  }

  subscribe(listener: SSEEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: AgentEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[SSE] Listener error:', err);
      }
    });
  }
}

export const sseClient = new SwaraSSEClient();
