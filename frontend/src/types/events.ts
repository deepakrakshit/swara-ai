/** Real-time SSE Agent Event types mirroring backend/app/schemas/events.py. */

export enum AgentEventType {
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  AGENT_STEP = 'agent_step',
  ROUTE_DECISION = 'route_decision',
  MODEL_LOAD = 'model_load',
  MODEL_UNLOAD = 'model_unload',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  RETRIEVAL = 'retrieval',
  VERIFICATION = 'verification',
  HITL_REQUEST = 'hitl_request',
  HITL_APPROVAL = 'hitl_approval',
  HITL_REJECTION = 'hitl_rejection',
  FINAL_RESPONSE = 'final_response',
  ARTIFACT_CREATED = 'artifact_created',
  ERROR = 'error',
}

export interface AgentEvent {
  event_id: string;
  timestamp: string;
  session_id: string;
  request_id?: string;
  event_type: AgentEventType;
  step_name?: string | null;
  data: Record<string, any>;
  message?: string | null;
}
