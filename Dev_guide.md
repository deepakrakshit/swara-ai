# ==============================================================================
# DEV 2 BRIEFING DOCUMENT: dev2.md
# Role: Inference Pool, LangGraph State Engine, Tool Calling & Excel Pipeline
# Hardware Target: RTX 3050 Laptop (4 GB dedicated VRAM)
# ==============================================================================

# Developer 2 Implementation Specification (LangGraph & Inference)
**Project:** Sovereign On-Premise Agentic AI Workbench (Problem Statement ID: SIH26117, MRPL/MoPNG)[cite: 3, 9]  
**Assigned Modules:** `src/graph.py`, `src/exporter.py`[cite: 1]  
**Primary Objective:** Eliminate mock LLM stubs, wire local GGUF model execution, enforce citation reflection, prevent execution loops, and implement Excel spreadsheet generation[cite: 3, 4].

---

## 1. Local GGUF Daemon Setup (`llama-server`)

### 1.1 Model Selection & VRAM Footprint
To fit within the 4 GB VRAM constraint while preserving KV-cache headroom, run `Qwen2.5-1.5B-Instruct-Q4_K_M.gguf`[cite: 3]:
- Disk Footprint: ~1.2 GB[cite: 3]
- Static VRAM Load: ~1.4 GB[cite: 3]
- Headroom: ~2.6 GB available for KV-cache and Windows DWM[cite: 3]

### 1.2 Start Inference Server (Port 8080)
Execute in PowerShell:
```powershell
llama-server.exe `
  -m Qwen2.5-1.5B-Instruct-Q4_K_M.gguf `
  --port 8080 `
  -c 4096 `
  --n-gpu-layers 99 `
  --host 127.0.0.1
```

### 1.3 Validate Endpoint
```powershell
curl.exe -s -X POST http://localhost:8080/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{
    "model": "qwen2.5-1.5b",
    "messages": [{"role": "user", "content": "Respond with JSON: {\"status\": \"ready\"}"}],
    "temperature": 0.0
  }'
```

---

## 2. Agent State Machine Implementation (`src/graph.py`)

### 2.1 ReAct State Cycle
Implement the state graph with 5 explicit nodes[cite: 3, 4]:
```text
[Plan] ──> [ToolCall] ──> [Observe] ──> [Reflect] ──┬──> [Plan] (Repair if missing citations)
                                                     └──> [Finalize] ──> [HITL Export Gate]
```

### 2.2 Execution Budgets & Context Constraints
- **Step Budget:** Maximum of 10 steps per task[cite: 3, 4]. Force transition to `Finalize` if `step_count >= 10`[cite: 3].
- **Wall-Clock Timeout:** Enforce a maximum runtime of 240 seconds[cite: 3, 4].
- **Observation Truncation:** Cap tool outputs (sandbox stdout / RAG chunks) at 1,500 characters before appending to context[cite: 3, 4]:
  ```python
  truncated_obs = observation[:1500] + ("\n...[TRUNCATED]" if len(observation) > 1500 else "")
  ```

### 2.3 System Prompt JSON Contract
Constrain `Qwen2.5-1.5B` to structured JSON tool invocation:
```python
SYSTEM_PROMPT = """You are the Sovereign Industrial Engineering Agent for MRPL.
You have access to two tools:
1. rag_search(query: str) - Search refinery SOPs and inspection logs.
2. sandbox_run(code: str) - Execute Python analysis scripts in an isolated container.

To call a tool, you MUST reply with a single markdown code block containing valid JSON:
```json
{
  "tool": "rag_search" | "sandbox_run",
  "args": {"param": "value"}
}
```
When you have sufficient information to answer or draft the memo, reply with:
```json
{
  "action": "FINALIZE",
  "content": "<detailed memo text>",
  "citations": ["[SOP-REF §3.2 p.14]"]
}
```
Do not include conversational preamble outside the JSON block.
"""
```

### 2.4 Citation Reflection & Repair Loop
In the `Reflect` node, inspect `state["citations"]` using regex[cite: 3, 4]:
```python
import re

CITATION_PATTERN = re.compile(r"\[SOP-REF §\d+(\.\d+)? p\.\d+\]")

def reflect_node(state: dict) -> dict:
    citations = state.get("citations", [])
    valid = [c for c in citations if CITATION_PATTERN.match(c)]
    if not valid:
        return {
            "action": "REPAIR",
            "feedback": "Reflection: Findings lack standard SOP citations. Retrieve relevant sections before finalizing."
        }
    return {"action": "PROCEED"}
```

### 2.5 Loop Killer Deduplication (`src/loop_killer.py`)
At every tool execution step, compute and check the SHA-256 step hash[cite: 2, 3]:
```python
from src.loop_killer import get_step_hash

step_hash = get_step_hash(tool_name, tool_args, last_observation)
if step_hash in state["seen_hashes"]:
    return {"action": "BREAK_LOOP", "error": "Repetitive failure detected."}

state["seen_hashes"].add(step_hash)
```
*Requirement:* `get_step_hash` must serialize args using `json.dumps(args, sort_keys=True)` and hash `observation[-500:]` to prevent collisions on common traceback prefixes[cite: 2, 3].

---

## 3. Spreadsheet Deliverable Pipeline (`src/exporter.py`)

Implement `render_spreadsheet` in `src/exporter.py` using `openpyxl` to fulfill Requirement R6[cite: 2, 4]:

```python
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

def render_spreadsheet(task_id: str, records: list[dict], summary_metrics: dict) -> str:
    wb = Workbook()
    ws = wb.active
    ws.title = "Corrosion Analysis"

    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    ws.merge_cells("A1:E1")
    ws["A1"] = "SOVEREIGN AI WORKBENCH - UNIT 200 INSPECTION METRICS"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="1F4E79")
    ws["A1"].alignment = Alignment(vertical="center")
    ws.row_dimensions[1].height = 30

    headers = ["Tag ID", "Component", "Nominal (mm)", "Measured (mm)", "Corrosion Rate (mm/yr)"]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col_num, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
    ws.row_dimensions[3].height = 24

    alt_fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
    for row_idx, item in enumerate(records, 4):
        ws.cell(row=row_idx, column=1, value=item.get("tag_id", "P-201A"))
        ws.cell(row=row_idx, column=2, value=item.get("component", "Overhead Reflux"))
        ws.cell(row=row_idx, column=3, value=item.get("nominal_mm", 12.50))
        ws.cell(row=row_idx, column=4, value=item.get("measured_mm", 11.22))
        ws.cell(row=row_idx, column=5, value=item.get("rate_mm_yr", 0.32))

        for col_idx in range(1, 6):
            c = ws.cell(row=row_idx, column=col_idx)
            c.border = thin_border
            if row_idx % 2 == 0:
                c.fill = alt_fill

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    os.makedirs("artifacts", exist_ok=True)
    out_path = os.path.abspath(f"artifacts/{task_id}_report.xlsx")
    wb.save(out_path)
    return out_path
```

---

## 4. Verification Commands (Dev 2)

```powershell
# 1. Run local test suite
python -m pytest tests/ -v

# 2. Test spreadsheet generation
python -c "from src.exporter import render_spreadsheet; path = render_spreadsheet('test_task', [{'tag_id': 'TK-201', 'component': 'Tank Shell', 'nominal_mm': 15.0, 'measured_mm': 13.8, 'rate_mm_yr': 0.24}], {}); print(f'Successfully generated: {path}')"
```


# ==============================================================================
# DEV 3 BRIEFING DOCUMENT: dev3.md
# Role: Multimodal Ingestion, ChromaDB Storage, Docker Sandbox & UI Mount
# Hardware Target: Standard CPU / Dev Laptop
# ==============================================================================

# Developer 3 Implementation Specification (Ingestion & Sandbox)
**Project:** Sovereign On-Premise Agentic AI Workbench (Problem Statement ID: SIH26117, MRPL/MoPNG)[cite: 3, 9]  
**Assigned Modules:** `src/ingest.py`, `src/sandbox_runner.py`, `src/main.py`[cite: 1]  
**Primary Objective:** Build the document parsing and table extraction pipeline, persist vector embeddings in ChromaDB, enforce hardened Docker isolation, and mount the static frontend[cite: 3, 4].

---

## 1. System Integration Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             src/ingest.py                                   │
│  Mixed Batch Upload (PDFs, Images, Tables)                                  │
│   ├── Table Preservation: pdfplumber -> Intact Markdown Tables              │
│   ├── Density Gate Check: src/density_gate.py                               │
│   │     ├── Low Density / Scan -> Routed to Vision Specialist Queue (:8081) │
│   │     └── Normal Text -> Chunked (1000–1200 tokens) -> ChromaDB (:8083)   │
│   └── P&ID Tag Persistence: SQLite (pid_tags)                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                         src/sandbox_runner.py                               │
│  Isolated Execution: Docker SDK ("sovereign-sandbox:1.0")                   │
│   ├── network_mode="none" (Zero external socket escape)                     │
│   ├── mem_limit="2g", timeout=45s                                           │
│   ├── security_opt=["no-new-privileges"], cap_drop=["ALL"]                  │
│   └── tmpfs={"/tmp/job/out": "rw,noexec,nosuid"} (Headless Chart Export)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                             src/main.py                                     │
│  FastAPI Orchestration & UI Static Mount                                    │
│   ├── Mounts compiled /dist React 18 UI at root                             │
│   ├── Runs Zero-CDN Preflight Grep Assertion                                │
│   └── Exposes SSE /stream, /api/upload, /api/hitl/approve, /api/artifact    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingestion Pipeline Implementation (`src/ingest.py`)

### 2.1 PDF Parsing & Markdown Table Extraction
Extract tables as intact Markdown to preserve numerical structures across vector searches[cite: 3, 4]:

```python
import pdfplumber

def extract_tables_and_text(pdf_path: str) -> list[dict]:
    extracted_pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            page_text_blocks = []
            
            tables = page.extract_tables()
            for table in tables:
                if not table or not any(table):
                    continue
                cleaned_table = [[str(cell or '').strip() for cell in row] for row in table if any(row)]
                if len(cleaned_table) >= 2:
                    headers = cleaned_table[0]
                    col_divider = ["---"] * len(headers)
                    md_rows = [f"| {' | '.join(headers)} |", f"| {' | '.join(col_divider)} |"]
                    for row in cleaned_table[1:]:
                        md_rows.append(f"| {' | '.join(row)} |")
                    page_text_blocks.append("\n" + "\n".join(md_rows) + "\n")

            text = page.extract_text() or ""
            if text.strip():
                page_text_blocks.append(text.strip())

            combined_page_text = "\n\n".join(page_text_blocks)
            extracted_pages.append({
                "page_number": page_idx,
                "text": combined_page_text,
                "raw_page": page
            })
    return extracted_pages
```

### 2.2 Text Density & Gibberish Filtering
Route blank or scanned pages to Vision OCR and valid text to chunking[cite: 3, 4]:

```python
from src.density_gate import is_low_density_or_gibberish

def route_page_content(doc_id: str, page_data: dict) -> dict:
    text = page_data["text"]
    if is_low_density_or_gibberish(text):
        return {
            "type": "VISION_QUEUE",
            "page": page_data["page_number"],
            "reason": "Text density gate triggered: scan or corrupted text."
        }
    return {
        "type": "TEXT_CHUNKING",
        "page": page_data["page_number"],
        "text": text
    }
```

### 2.3 Semantic Chunking & ChromaDB Vector Store
Chunk text into 1000–1200 token windows with 150-token sliding overlap[cite: 3, 4]:

```python
import os
import chromadb

CHROMA_DIR = os.path.abspath("chroma_db")
client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = client.get_or_create_collection(
    name="sop_records",
    metadata={"hnsw:space": "cosine"}
)

def chunk_text(text: str, chunk_size: int = 1100, overlap: int = 150) -> list[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += (chunk_size - overlap)
    return chunks

def ingest_to_chroma(doc_name: str, page_num: int, text: str):
    chunks = chunk_text(text)
    for idx, chunk in enumerate(chunks):
        chunk_id = f"{doc_name}_p{page_num}_c{idx}"
        collection.upsert(
            documents=[chunk],
            metadatas=[{
                "doc_name": doc_name,
                "page": page_num,
                "citation": f"[SOP-REF §{page_num}.1 p.{page_num}]"
            }],
            ids=[chunk_id]
        )
```

### 2.4 P&ID Equipment Tag SQLite Store (`pid_tags.db`)
```python
import sqlite3

DB_PATH = os.path.abspath("pid_tags.db")

def init_pid_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pid_tags (
            tag_id TEXT PRIMARY KEY,
            doc_name TEXT,
            page_num INTEGER,
            bbox TEXT,
            component_type TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def store_tag(tag_id: str, doc_name: str, page_num: int, bbox: list[int], component: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO pid_tags (tag_id, doc_name, page_num, bbox, component_type)
        VALUES (?, ?, ?, ?, ?)
    """, (tag_id, doc_name, page_num, str(bbox), component))
    conn.commit()
    conn.close()
```

### 2.5 RAG Search Tool Function
```python
def rag_search(query: str, n_results: int = 3) -> str:
    results = collection.query(query_texts=[query], n_results=n_results)
    if not results or not results["documents"] or not results["documents"][0]:
        return "No relevant SOP or inspection records found in local database."

    formatted_outputs = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        cit = meta.get("citation", "[SOP-REF §1.0 p.1]")
        formatted_outputs.append(f"Source: {cit}\nExcerpt: {doc}\n")
    return "\n---\n".join(formatted_outputs)
```

---

## 3. Hardened Docker Code Sandbox (`src/sandbox_runner.py`)

Enforce locked container security parameters[cite: 2, 3]:
- `network_mode="none"`: Kernel forbids network socket creation[cite: 2, 3].
- `mem_limit="2g"`: Caps memory usage to 2 GB[cite: 2, 3].
- `security_opt=["no-new-privileges"]`: Forbids privilege escalation[cite: 2, 3].
- `cap_drop=["ALL"]`: Drops Linux root capabilities[cite: 2, 3].
- `rw,noexec,nosuid` tmpfs scratch space[cite: 2, 3].
- Hard timeout $\le 45\text{ seconds}$[cite: 3, 4].

```python
import os
import shutil
import tempfile
import docker

def run_code(code: str, timeout: int = 45) -> dict:
    try:
        client = docker.from_env()
        client.ping()
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": f"Docker daemon unavailable: {str(e)}", "images": []}

    job_dir = tempfile.mkdtemp(prefix="swara_sandbox_")
    out_dir = os.path.join(job_dir, "out")
    os.makedirs(out_dir, exist_ok=True)
    script_path = os.path.join(job_dir, "script.py")

    injected_code = (
        "import matplotlib\n"
        "matplotlib.use('Agg')\n"
        "import matplotlib.pyplot as plt\n"
        + code
    )

    with open(script_path, "w", encoding="utf-8") as f:
        f.write(injected_code)

    container = None
    try:
        container = client.containers.run(
            image="sovereign-sandbox:1.0",
            command="python -u /tmp/job/script.py",
            network_mode="none",
            mem_limit="2g",
            security_opt=["no-new-privileges"],
            cap_drop=["ALL"],
            volumes={job_dir: {"bind": "/tmp/job", "mode": "rw"}},
            tmpfs={"/tmp/job/out": "rw,noexec,nosuid"},
            detach=True,
            user="1000:1000"
        )

        result = container.wait(timeout=timeout)
        exit_code = result.get("StatusCode", 1)
        stdout = container.logs(stdout=True, stderr=False).decode("utf-8")
        stderr = container.logs(stdout=False, stderr=True).decode("utf-8")

        generated_charts = []
        for filename in os.listdir(out_dir):
            if filename.endswith(".png"):
                dest = os.path.abspath(f"artifacts/{filename}")
                shutil.copyfile(os.path.join(out_dir, filename), dest)
                generated_charts.append(dest)

        return {
            "success": exit_code == 0,
            "stdout": stdout,
            "stderr": stderr,
            "images": generated_charts
        }
    except Exception as ex:
        return {"success": False, "stdout": "", "stderr": f"Sandbox execution failure: {str(ex)}", "images": []}
    finally:
        if container:
            try:
                container.remove(force=True)
            except Exception:
                pass
        shutil.rmtree(job_dir, ignore_errors=True)
```

---

## 4. Static Frontend Mounting (`src/main.py`)

Mount Developer 1's compiled `/dist` directory in `src/main.py`[cite: 3]:

```python
import os
from fastapi.staticfiles import StaticFiles

dist_path = os.path.abspath("dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
```

---

## 5. Verification Commands (Dev 3)

```powershell
# 1. Test Ingestion & ChromaDB RAG Search
python -c "from src.ingest import ingest_to_chroma, rag_search; ingest_to_chroma('Unit200_SOP.pdf', 14, 'Corrosion rate must not exceed 0.35 mm/year per standard inspection guidelines.'); print(rag_search('corrosion rate limit'))"

# 2. Test Docker Sandbox Execution
python -c "from src.sandbox_runner import run_code; res = run_code('print(12.50 - 11.22)'); print(res)"

# 3. Verify Zero-CDN Build Compliance
Get-ChildItem -Recurse dist\ | Select-String -Pattern "googleapis|unpkg|jsdelivr"
```