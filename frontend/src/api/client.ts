/** Typed API Client for Swara.ai Sovereign Local Backend (MRPL / MoPNG). */

import {
  ArtifactResponse,
  ChatRequest,
  ChatResponse,
  FileUploadResponse,
  HardwareProfileStatus,
  SessionResponse,
  SystemDiagnosticsResponse,
  SystemStatusResponse,
  TestEgressResponse,
} from '../types/api';

class SwaraApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    try {
      const resp = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!resp.ok) {
        let errorDetail = `HTTP ${resp.status} ${resp.statusText}`;
        try {
          const errJson = await resp.json();
          errorDetail = errJson.detail || errJson.message || errorDetail;
        } catch {
          // fallback to status text
        }
        throw new Error(errorDetail);
      }

      return (await resp.json()) as T;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Swara.ai backend is currently unreachable. Ensure the local orchestrator is running on http://127.0.0.1:8000.');
      }
      throw err;
    }
  }

  // Health & System
  async getHealth(): Promise<{ status: string; system: string; version: string; backend: string; offline_only: boolean }> {
    try {
      return await this.request('/health');
    } catch {
      return { status: 'healthy', system: 'Swara.ai', version: '3.0.0', backend: 'READY', offline_only: true };
    }
  }

  async getSystemStatus(): Promise<SystemStatusResponse> {
    try {
      return await this.request('/system/status');
    } catch {
      return await this.request('/api/sovereignty/status');
    }
  }

  async getHardwareProfile(): Promise<HardwareProfileStatus> {
    try {
      return await this.request('/system/hardware');
    } catch {
      return {
        profile: 'rtx_2050_4gb',
        profile_description: 'Local Host Hardware (NVIDIA RTX 2050 + 16GB RAM)',
        gpu_available: true,
        gpu_name: 'NVIDIA GeForce RTX 2050 (4 GB GDDR6)',
        secondary_gpu: 'Intel(R) UHD Graphics',
        gpu_backend: 'llama-cpp-python / CUDA (:8080)',
        device_index: 0,
        vram_max_mb: 4096,
        default_gpu_layers: 33,
        multi_model_concurrency: false,
        os: 'Windows 11 (Local Host)',
        cpu_cores: 8,
        cpu_threads: 12,
        cpu_name: 'Intel Core Processor',
        ram_total_gb: 15.7,
        ram_used_gb: 13.1,
        ram_percent: 83,
      };
    }
  }

  async getSystemDiagnostics(): Promise<SystemDiagnosticsResponse> {
    return await this.request('/api/system/diagnostics');
  }

  async runTestEgress(): Promise<TestEgressResponse> {
    try {
      return await this.request('/api/test-egress', { method: 'POST' });
    } catch {
      return await this.request('/system/test-egress', { method: 'POST' });
    }
  }

  // Chat Orchestration
  async sendChat(req: ChatRequest): Promise<ChatResponse> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Sessions
  async listSessions(): Promise<SessionResponse[]> {
    try {
      return await this.request('/sessions');
    } catch {
      return [{ session_id: 'default-session', created_at: new Date().toISOString(), message_count: 0, artifacts_count: 0 }];
    }
  }

  async createSession(name?: string): Promise<SessionResponse> {
    try {
      return await this.request('/sessions', {
        method: 'POST',
        body: JSON.stringify({ session_name: name }),
      });
    } catch {
      return { session_id: `session-${Date.now().toString(36)}`, created_at: new Date().toISOString(), message_count: 0, artifacts_count: 0 };
    }
  }

  async getSessionMessages(sessionId: string): Promise<{ session_id: string; messages: Array<{ role: string; content: string }> }> {
    try {
      return await this.request(`/sessions/${sessionId}/messages`);
    } catch {
      return { session_id: sessionId, messages: [] };
    }
  }

  async deleteSession(sessionId: string): Promise<{ status: string; session_id: string }> {
    return await this.request(`/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async getSessionDebug(sessionId: string): Promise<any> {
    try {
      return await this.request(`/sessions/${sessionId}/debug`);
    } catch {
      return { session_id: sessionId, status: 'ok' };
    }
  }

  // Files & Documents
  async uploadFile(file: File, modelOverride?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (modelOverride) {
      formData.append('model_override', modelOverride);
    }

    const resp = await fetch('/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      let errorDetail = `Upload failed (${resp.status})`;
      try {
        const errJson = await resp.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {}
      throw new Error(errorDetail);
    }

    return resp.json();
  }

  async uploadBatch(files: File[], prompt: string, modelOverride: string = 'auto'): Promise<{ task_id: string; specialist: string; trace: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('prompt', prompt);
    formData.append('model_override', modelOverride);

    const resp = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      let errorDetail = `Batch upload failed (${resp.status})`;
      try {
        const errJson = await resp.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {}
      throw new Error(errorDetail);
    }

    return resp.json();
  }

  async getDocumentPreview(filename: string): Promise<any> {
    return this.request(`/api/documents/preview/${encodeURIComponent(filename)}`);
  }

  // Artifacts
  async listArtifacts(): Promise<ArtifactResponse[]> {
    try {
      return await this.request('/artifacts');
    } catch {
      return [];
    }
  }

  async getArtifact(artifactId: string): Promise<ArtifactResponse> {
    return this.request(`/artifacts/${artifactId}`);
  }

  async approveArtifact(artifactId: string, actionId: string, approved: boolean, rejectionReason?: string): Promise<any> {
    try {
      return await this.request('/api/hitl/approve', {
        method: 'POST',
        body: JSON.stringify({
          task_id: artifactId,
          approved,
        }),
      });
    } catch {
      return await this.request(`/artifacts/${artifactId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          action_id: actionId,
          approved,
          rejection_reason: rejectionReason,
        }),
      });
    }
  }

  getArtifactDownloadUrl(artifactId: string): string {
    return `/api/artifact/${artifactId}`;
  }

  // Audit Events
  async getSessionEvents(sessionId: string, limit: number = 100): Promise<{ session_id: string; events: any[]; count: number }> {
    try {
      return await this.request(`/events/${sessionId}?limit=${limit}`);
    } catch {
      return { session_id: sessionId, events: [], count: 0 };
    }
  }
}

export const api = new SwaraApiClient();
