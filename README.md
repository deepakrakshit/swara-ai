# Sovereign On-Premise Agentic AI Workbench (MRPL / MoPNG)
**Problem Statement ID:** SIH26117  
**Architecture:** Air-Gapped FastAPI Orchestrator + LangGraph ReAct Loop + Zero-CDN React 18 UI

---

## 1. Project Directory Structure
```
├── assets/          # Corporate templates (assets/mrpl_template.dotx)
├── artifacts/       # Generated .docx / .xlsx deliverables (ignored in git)
├── config/          # Model registry and routing parameters (registry.json)
├── scripts/         # Sovereignty firewall, egress monitors, and preflight checks
├── src/             # Core application code (main, graph, router, exporter, etc.)
├── tests/           # Pytest unit and pipeline test harness
├── tools/           # Mock LLM daemon and CI markdown gates
├── ARCHITECTURE_v5.3_clean.md
└── PRD_v5.3_clean.md
```

---

## 2. Environment Setup
Requires Python 3.11.

```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install locked dependencies
pip install -r requirements.txt
```

---

## 3. Running the Validation Harness (Offline Tests)
Verify the core CPU modules (Router L1, Density Gate, Loop Killer, Exporter) without starting external models:

```bash
python -m pytest tests/ -v
```

---

## 4. Running the Backend Orchestrator

### Step A: Start the Inference Pool
- **Option 1: Mock Server (Standard Local Testing)**
  ```bash
  python tools/mock_llms.py
  ```
  Runs mock inference services on ports 8080 (Brain), 8081 (Vision), 8082 (Coder), and 8083 (Embeddings).

- **Option 2: Local GGUF Inference on RTX 3050 (Dev 2 - 4 GB VRAM)**
  Run lightweight Qwen2.5 models via llama-server:
  ```bash
  # Brain / Planner (Port 8080)
  llama-server.exe -m Qwen2.5-1.5B-Instruct-Q4_K_M.gguf --port 8080 -c 4096

  # Coder Specialist (Port 8082)
  llama-server.exe -m Qwen2.5-Coder-1.5B-Instruct-Q4_K_M.gguf --port 8082 -c 4096
  ```

### Step B: Start the Orchestrator (Terminal 2)
```bash
python -m uvicorn src.main:app --reload --port 8000
```

---

## 5. Frontend UI Integration (Dev 1 Handoff)
1. Build the React 18 + Vite frontend locally:
   ```bash
   npm run build
   ```
2. Move or output the compiled `dist/` directory directly to the workspace root (`AI workbench/dist/`).
3. Access the complete interface at `http://localhost:8000`.
*Note: Strict zero-CDN rule applies. All scripts, styles, and fonts must be bundled locally into `dist/` (zero requests to unpkg, jsdelivr, or googleapis).*

---

## 6. Flagship Execution Flow
- **Ingestion:** `POST /api/upload` accepts mixed-batch documents (P&ID scans, inspection reports).
- **Event Bus:** `GET /stream` emits Server-Sent Events (SSE) detailing agent steps and routing tags without stream buffering.
- **HITL Gate:** `POST /api/hitl/approve` confirms operator sign-off on generated findings.
- **Deliverable Retrieval:** `GET /api/artifact/{task_id}` exports the finished engineering memorandum rendered from corporate templates.
