# Swara.ai (Project Kavach) — Documentation Index

Welcome to the comprehensive technical documentation for **Swara.ai (Project Kavach)** — the Sovereign On-Premise Agentic AI Workbench engineered for refinery engineering analysis and compliance document synthesis (SIH 2026 Problem Statement **SIH26117**).

---

## 📚 Documentation Structure

1. **[Problem Statement & Industrial Context (`sih.md`)](./sih.md)**
   * SIH26117 Background & Ministry of Petroleum and Natural Gas (MRPL) context.
   * Why cloud AI is prohibited in refinery operations (CERT-In / NCIIPC sovereignty directives).
   * Flagship evaluation scenario: Unit 200 corrosion-trend memo with P&ID and SOP citations.
   * **Crucial clarification**: Why Kaggle dual-cloud was used during development testing vs. 100% on-premise air-gapped production.

2. **[System Architecture (`architecture.md`)](./architecture.md)**
   * Complete architectural diagrams (Mermaid).
   * Component breakdown: React static UI, FastAPI orchestrator, 3-tier task router, LangGraph multi-agent mesh.
   * Multimodal Vision OCR (`Qwen2.5-VL`), Sovereign Local RAG (`ChromaDB`), and isolated Python code sandbox.
   * Dual-topology comparison: Development testbed vs. single-node sovereign production.

3. **[Models & Cluster Topology (`models_and_cluster.md`)](./models_and_cluster.md)**
   * Complete inventory of open-weight models (Qwen2.5-7B, Qwen2.5-VL-3B, Gemma 3 12B IT, Qwen2.5-3B, Nomic Embed v1.5).
   * Distributed Kaggle dual-cluster allocation (64 GB total VRAM across 4x Tesla T4 GPUs).
   * Production Survival Mode VRAM budgeting (12.8 GB static load on a 24 GB workstation).
   * Live latency benchmarks and dynamic model registry (`config/registry.json`).

4. **[Air-Gap, Sovereignty & Security (`airgap_and_security.md`)](./airgap_and_security.md)**
   * Defense-in-depth architecture: Subnet isolation, kernel `SOVEREIGN_EGRESS` iptables chains, and IPv6 neutralization.
   * Telemetry blackholing and live zero-packet egress watchdog (`tcpdump`).
   * Cryptographic weight provenance (SHA-256 verification).
   * Sandboxed code execution quotas and Human-In-The-Loop (HITL) authorization gates.

5. **[Deployment & Operations Guide (`deployment_guide.md`)](./deployment_guide.md)**
   * Step-by-step air-gapped production deployment on sovereign workstation (RTX 3090/4090).
   * Development setup using the Kaggle Dual-Cluster testing harness.
   * Automated healthcheck scripts and configuration validation.

---

## 🛡️ Quick Reference Summary

| Parameter | Development Testbed | Production Sovereign Target |
| :--- | :--- | :--- |
| **Compute** | 2x Kaggle Accounts (4x Tesla T4, 64 GB VRAM) | 1x Sovereign Workstation (NVIDIA RTX 3090 / 4090 24GB) |
| **Connectivity** | Cloudflare HTTP/2 Tunnels (Ephemeral testing) | 100% Air-Gapped Local Subnet (`10.0.99.0/24`), Zero Egress |
| **Models Active** | Qwen 7B + Qwen-VL 3B + Gemma 12B + Qwen 3B + Nomic | Survival Mode: Qwen 7B + Qwen-VL 3B + Coder 3B + Nomic |
| **Primary Output** | Microsoft Word (`.docx`), Excel (`.xlsx`), PDF (`.pdf`) | Microsoft Word (`.docx`), Excel (`.xlsx`), PDF (`.pdf`) |
| **Audit Trail** | Sandbox logs, full execution timeline, HITL approvals | Sandbox logs, full execution timeline, HITL approvals |
