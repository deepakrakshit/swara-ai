/** TypeScript definitions mirroring backend Pydantic schemas. */

export interface GPUStatus {
  available: boolean;
  name: string;
  total_memory_mb: number;
  used_memory_mb: number;
  free_memory_mb: number;
  cuda_version?: string;
}

export interface SovereigntyStatus {
  offline_only: boolean;
  allow_external_network: boolean;
  local_endpoints_only: boolean;
  external_ai_apis: string;
  remote_model_endpoints: string;
  telemetry: string;
  local_inference: string;
  network_policy: string;
  application_level_policy: string;
  kernel_firewall_enforcement: string;
  airgap_state: string;
  active_interfaces: string[];
  gpu: GPUStatus;
  system_platform: string;
  memory_total_mb: number;
  memory_available_mb: number;
}

export interface ModelDetailStatus {
  role: string;
  model_name: string;
  installed: boolean;
  loaded: boolean;
  backend: string;
  device: string;
  gpu_layers: number;
  inference_count: number;
  last_inference?: string | null;
  estimated_vram_mb: number;
}

export interface SystemStatusResponse {
  name: string;
  version: string;
  backend_status: string;
  python_version: string;
  os_platform: string;
  gpu: GPUStatus;
  vram_mb: number;
  installed_models: Record<string, string>;
  models_detail: Record<string, ModelDetailStatus>;
  configured_models: string[];
  loaded_models: string[];
  available_tools: string[];
  rag_status: string;
  sandbox_status: string;
  sovereignty: SovereigntyStatus;
  active_sessions: number;
}

export interface HardwareProfileStatus {
  profile: string;
  profile_description: string;
  gpu_available: boolean;
  gpu_name: string;
  secondary_gpu?: string;
  gpu_backend: string;
  device_index: number;
  vram_max_mb: number;
  default_gpu_layers: number;
  multi_model_concurrency: boolean;
  os: string;
  cpu_cores: number;
  cpu_threads?: number;
  cpu_name?: string;
  ram_total_gb?: number;
  ram_used_gb?: number;
  ram_percent?: number;
}

export interface DiagnosticModelItem {
  key: string;
  role: string;
  model_name: string;
  url: string;
  backend: string;
  estimated_vram_mb: number;
  reachable: boolean;
  status: 'ONLINE' | 'UNREACHABLE';
  latency_ms: number;
  status_code?: number | null;
  error?: string | null;
}

export interface SystemDiagnosticsResponse {
  status: string;
  timestamp: number;
  host: {
    os: string;
    cpu_name: string;
    cpu_cores?: number;
    cpu_percent: number;
    ram_total_gb: number;
    ram_used_gb: number;
    ram_percent: number;
    gpu_name: string;
    vram_max_mb?: number;
    secondary_gpu?: string;
    gpu_backend?: string;
  };
  network?: {
    adapters: string[];
    bytes_sent_mb: number;
    bytes_recv_mb: number;
    packets_sent: number;
    packets_recv: number;
  };
  models: Record<string, DiagnosticModelItem>;
}

export interface CitationItem {
  document_id: string;
  filename: string;
  page?: number | null;
  section?: string | null;
  citation_tag: string;
  snippet: string;
}

export interface DocumentPageData {
  page_number: number;
  title?: string;
  summary?: string;
  key_points?: string[];
  text: string;
  image_url?: string | null;
  word_count?: number;
}

export interface DocumentPreviewResponse {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  sha256: string;
  total_pages: number;
  aspect_ratio?: number;
  pages: DocumentPageData[];
  content: string;
  download_url: string;
}

export interface ArtifactResponse {
  artifact_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  sha256: string;
  created_at: string;
  approved: boolean;
  requires_approval: boolean;
  download_url: string;
  content?: string;
  pages_data?: DocumentPageData[];
  aspect_ratio?: number;
}

export interface PendingApproval {
  action_id: string;
  type: string;
  description: string;
  parameters?: Record<string, any>;
  details?: Record<string, any>;
}

export interface ChatRequest {
  session_id?: string;
  message: string;
  attachments?: string[];
  model_override?: string;
}

export interface ChatResponse {
  session_id: string;
  request_id: string;
  status: 'completed' | 'awaiting_approval' | 'failed';
  task_type: string;
  final_response: string;
  thought?: string;
  plan: string[];
  citations: CitationItem[];
  artifacts: ArtifactResponse[];
  pending_approvals: PendingApproval[];
  execution_time_ms: number;
  verification_passed: boolean;
  title?: string;
}

export interface SessionResponse {
  session_id: string;
  created_at: string;
  message_count: number;
  artifacts_count: number;
  title?: string;
}

export interface FileUploadResponse {
  filename: string;
  original_name: string;
  file_size_bytes: number;
  sha256: string;
  inbox_path: string;
  ingested_into_rag: boolean;
  extracted_pages: number;
  extracted_chunks: number;
}

export interface EgressProbeResult {
  target: string;
  label: string;
  status: 'BLOCKED' | 'FAILED';
  blocked: boolean;
  kernel_log?: string;
  message: string;
}

export interface TestEgressResponse {
  status: 'PASS' | 'FAILED';
  sovereignty_intact: boolean;
  probes: EgressProbeResult[];
}
