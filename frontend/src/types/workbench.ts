import { ArtifactResponse, CitationItem, PendingApproval } from './api';
import { AgentEvent } from './events';

export type SidebarSection =
  | 'chat'
  | 'documents'
  | 'artifacts'
  | 'sovereignty'
  | 'hardware'
  | 'models'
  | 'audit'
  | 'settings';

export type ExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'approval_required';

export interface ExecutionTimelineStep {
  id: string;
  name: 'PLAN' | 'ROUTE' | 'VISION' | 'RAG' | 'CODER' | 'REFLECT' | 'HITL' | 'FINALIZE' | 'UNDERSTAND' | 'TOOL' | 'OBSERVE' | string;
  label: string;
  status: ExecutionStepStatus;
  durationMs?: number;
  timestamp?: string;
  detail?: string;
  data?: Record<string, any>;
}

export interface ToolRunInfo {
  id: string;
  toolName: string;
  category: 'vision' | 'rag' | 'coder' | 'document' | 'artifact' | 'policy';
  status: 'running' | 'success' | 'error';
  inputs?: Record<string, any>;
  output?: any;
  error?: string;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  timestamp: string;
  attachments?: string[];
  // Assistant-specific rich metadata:
  taskType?: string;
  isStreaming?: boolean;
  reasoningSummary?: string;
  reasoningDetails?: {
    stage: 'understanding' | 'planning' | 'evidence' | 'verification';
    text: string;
    completed: boolean;
  }[];
  timeline?: ExecutionTimelineStep[];
  tools?: ToolRunInfo[];
  observations?: string[];
  citations?: CitationItem[];
  artifacts?: ArtifactResponse[];
  pendingApprovals?: PendingApproval[];
  verificationPassed?: boolean;
  executionTimeMs?: number;
  rawEvents?: AgentEvent[];
}
