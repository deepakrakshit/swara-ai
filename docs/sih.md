# Smart India Hackathon (SIH 2026) — Problem Statement & Context

---

## 1. Problem Statement Identification
* **Problem Statement ID**: **SIH26117**
* **Title**: Sovereign On-Premise Agentic AI Workbench for Industrial Engineering Analysis & Document Synthesis
* **Organization / Ministry**: **Mangalore Refinery and Petrochemicals Limited (MRPL)** / **Ministry of Petroleum and Natural Gas (MoPNG)**, Government of India
* **Theme / Track**: Agentic AI & Multi-Agent Systems
* **Project Codename**: **Swara.ai** / **Project Kavach**
* **Operational Mode**: 100% On-Premise, Air-Gapped, Zero-Cloud Egress

---

## 2. Background & Industrial Motivation

### 2.1 Critical Infrastructure Sovereignty
Refineries and petrochemical plants operate under the jurisdiction of critical national infrastructure. The technical documentation generated within an oil refinery—such as **P&ID (Piping and Instrumentation Diagrams)**, isometric drawings, ultrasonic thickness corrosion logs, turnaround inspection reports, and proprietary Standard Operating Procedures (SOPs)—contains strategically sensitive operational intelligence.

Under statutory cybersecurity guidelines issued by **CERT-In** and the **National Critical Information Infrastructure Protection Centre (NCIIPC)**:
1. **Zero Cloud Egress**: Sensitive refinery data cannot leave the refinery perimeter or be transmitted to commercial public cloud APIs (e.g., OpenAI, Anthropic, Google Cloud, AWS, Microsoft Azure).
2. **IP & Espionage Risks**: Uploading process flow diagrams or corrosion telemetry to foreign cloud services risks IP exfiltration, regulatory penalties, and vulnerability exposure of high-pressure distillation and cracking units.
3. **Physical Air-Gap**: Critical DCS (Distributed Control Systems) and engineering networks frequently operate entirely detached from the public Internet.

### 2.2 The Engineering Bottleneck
Refinery plant engineers, corrosion specialists, and inspection managers spend thousands of hours each month:
* Cross-referencing ultrasonic thickness measurements against corrosion rates and design allowances.
* Manually inspecting raster P&ID scans to verify line numbers, valve tags, and equipment connectivity.
* Checking inspection findings against mandatory API standards (API 510, API 570, API 653) and internal MRPL plant SOPs.
* Compiling formal compliance memos, executive briefings, and engineering calculation audit sheets in Word, Excel, and PDF formats.

### 2.3 The Core SIH Challenge
How can an oil refinery deploy modern, agentic, multi-modal reasoning and document synthesis capabilities **without sending a single byte outside the local refinery intranet**?

---

## 3. The Swara / Project Kavach Solution

**Swara.ai (Project Kavach)** is a sovereign on-premise industrial AI workbench engineered specifically for petrochemical and refinery engineering teams.

```
       [ Air-Gapped Refinery Network ]
                     │
    ┌────────────────┴────────────────┐
    │     Swara.ai Sovereign Core     │
    │  ┌───────────────────────────┐  │
    │  │ React Static UI (Zero CDN)│  │
    │  └─────────────┬─────────────┘  │
    │                │ HTTP / SSE     │
    │  ┌─────────────▼─────────────┐  │
    │  │ FastAPI Orchestrator & Gate│  │
    │  └─────────────┬─────────────┘  │
    │                │                │
    │  ┌─────────────▼─────────────┐  │
    │  │ LangGraph Multi-Agent Mesh│  │
    │  │  - Fast Router (3B)       │  │
    │  │  - Deep Reasoner (7B)     │  │
    │  │  - Specialist Coder (12B) │  │
    │  │  - Vision OCR (Qwen2.5-VL)│  │
    │  │  - Embeddings (Nomic v1.5)│  │
    │  └─────────────┬─────────────┘  │
    │                │                │
    │  ┌─────────────▼─────────────┐  │
    │  │ Sovereign Defense Layer   │  │
    │  │  - SOVEREIGN_EGRESS drop  │  │
    │  │  - Zero egress packet cnt │  │
    │  │  - SHA-256 weight verify  │  │
    │  └───────────────────────────┘  │
    └─────────────────────────────────┘
```

### Key Pillars:
1. **100% On-Premise Inference**: Powered exclusively by open-weight sovereign models running via optimized local backends (native PyTorch CUDA & `llama.cpp`).
2. **Zero Cloud Egress Defense**: Enforced by kernel-level `iptables` / `ip6tables` chains (`SOVEREIGN_EGRESS`), disabled IPv6 stack, localhost/LAN binding, and a live packet counter provably remaining at zero.
3. **Multimodal Engineering Analysis**: Native visual inspection of P&IDs, schematics, and raster scan PDFs using `Qwen2.5-VL` to detect tags, valves, pipe schedules, and equipment boundaries without external vision APIs.
4. **Agentic Tool Iteration with Guardrails**: LangGraph ReAct loop with loop-killer tail-hash protection, density gates, and a sandboxed Python runtime for deterministic calculation execution.
5. **Real Enterprise Deliverables (Not Mere Chat)**: Automatic synthesis of publication-ready Microsoft Word memos (`.docx`), Excel audit calculations (`.xlsx`), PowerPoint briefings (`.pptx`), and formal reports (`.pdf`) rendered from corporate MRPL templates (`assets/mrpl_template.dotx`).
6. **Human-In-The-Loop (HITL) Validation**: Critical write operations and document exports require explicit human engineer approval before disk persistence.

---

## 4. Special Note: Development Testbed vs. Final Sovereign Deployment

> ### [!IMPORTANT]
> ### Why We Utilized a Distributed Kaggle Dual-Cluster During Development
> 
> As student developers and hackathon innovators, **we do not possess access to high-end enterprise GPU infrastructure** (such as commercial NVIDIA A100 80GB or H100 SXM systems costing tens of thousands of dollars).
> 
> To simultaneously benchmark and evaluate heavy multi-model agentic pipelines—including:
> * **Google Gemma 3 12B IT** (Specialist Coder & Document Synthesizer)
> * **Qwen2.5-7B-Instruct** (Deep Reasoner & Strategic Planner)
> * **Qwen2.5-VL-3B-Instruct** (Native Multimodal Vision & Diagram Inspector)
> * **Qwen2.5-3B-Instruct** (Fast Router & Task Gatekeeper)
> * **Nomic Embed Text v1.5** (High-Dimensional Semantic Retrieval Engine)
> 
> We engineered an innovative **dual-cluster development testbed across 2 Kaggle accounts**, pooling **4x Tesla T4 GPUs (64 GB total VRAM)** connected via secure, encrypted Cloudflare HTTP/2 tunnels.
>
> ### Non-Negotiable Production Commitment:
> **The Kaggle dual-cluster is strictly a temporary development and testing harness.**
> 
> The entire Swara codebase is built strictly on **open-weight GGUF and Hugging Face architectures**. For final real-world deployment inside an MRPL refinery, **everything runs 100% locally on sovereign on-premise hardware**:
> * **Deployment Target**: A single sovereign workstation (e.g., NVIDIA RTX 3090 / RTX 4090 24GB VRAM) or an on-premise dual-GPU server.
> * **Network State**: Fully air-gapped with physical/logical network isolation, zero internet connectivity, and zero cloud services.

---

## 5. Flagship Evaluation Scenario

The system is evaluated against the end-to-end refinery inspection workflow:

### User Request:
> *"Draft the Q3 corrosion-trend memo for Unit 200, cite the inspection SOP."*

### Ingested Evidence:
1. **Raster P&ID Scan**: High-resolution scan of crude distillation Unit 200 overhead piping.
2. **Inspection Report PDF**: Ultrasonic thickness inspection log showing metal loss along pipe spool `200-P-04`.
3. **Plant Standard Operating Procedure (SOP)**: MRPL Engineering Standard `MRPL-SOP-INSP-2024-04`.

### Autonomous Workflow:
1. **L1/L2 Routing**: Router recognizes multimodal inputs + engineering query and triggers the LangGraph agent loop.
2. **Multimodal Inspection**: `Qwen2.5-VL` parses the P&ID scan, extracting tags (`V-201`, `E-202`, `200-P-04`), connections, and operating metallurgy.
3. **Sovereign RAG**: ChromaDB performs vector similarity lookup on the inspection SOP, extracting exact corrosion allowance formulas and safety thresholds.
4. **Sandboxed Code Execution**: Specialist Coder writes and executes Python code in an isolated sandbox to calculate remaining service life ($T_{rem} = \frac{t_{act} - t_{min}}{CR}$) and plots a corrosion trajectory chart.
5. **Document Synthesis**: Synthesizes a formal 3-page memo with embedded P&ID crop, matplotlib trend figure, and traceable citations (`[SOP-REF §4.2 p.17]`).
6. **Human-In-The-Loop Approval**: Engineer reviews the calculated values, citations, and draft preview in the UI before approving final export to `.docx` / `.pdf`.

---

## 6. SIH Evaluation Criteria Alignment

| SIH Evaluation Parameter | Swara / Project Kavach Implementation | Verification Evidence |
| :--- | :--- | :--- |
| **Innovation & Novelty** | Multi-model cooperative agent mesh (CEO + Coder + Vision + Reasoner + Embed) on sovereign infrastructure | LangGraph graph state machine with dynamic routing and density gates |
| **Air-Gap & Sovereignty** | Zero external API calls; kernel-level packet drops; SHA-256 weight integrity verification | Live `tcpdump` / `iptables` zero-packet counter; `preflight.sh` gate |
| **Technical Feasibility** | Survival mode engineered to fit within 24 GB VRAM; quantizations optimized for low-latency inference | Model VRAM allocations budgeted at ~12.8 GB static load with 11.2 GB KV cache |
| **Practical Utility** | Real refinery deliverables (`.docx`, `.xlsx`, `.pdf`) rendered from corporate templates, not chat logs | Template engine output verified against MRPL corporate identity standards |
| **Auditability & Trust** | Traceable evidence citations `[SOP-REF §X.X p.Y]`; sandbox execution audit trails; HITL approvals | Human verification modal with diff review before file generation |
