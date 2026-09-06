# Models & Cluster Topology Documentation

---

## 1. Overview of Deployed Models

The Swara.ai (Project Kavach) ecosystem utilizes a multi-model cooperative architecture where specialized open-weight models handle designated cognitive responsibilities:

| Model Identifier | Parameter Scale | Quantization | Serving Engine | Role in Swara | Host / Port |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Qwen2.5-7B-Instruct** | 7.6 Billion | `Q4_K_M` | `llama.cpp` (CUDA) | Deep Reasoner, Planner & L2 Judge | Account 1 (GPU 0) :8080 |
| **Qwen2.5-VL-3B-Instruct** | 3.8 Billion | Native `fp16` | PyTorch Transformers | Multimodal Vision & P&ID OCR | Account 1 (GPU 1) :8081 |
| **Qwen2.5-3B-Instruct** | 3.1 Billion | `Q4_K_M` | `llama.cpp` (CUDA) | Fast Router, CEO & Gateway Chat | Account 2 (GPU 0) :8080 |
| **Google Gemma 3 12B IT** | 12.0 Billion | `Q5_K_M` | `llama.cpp` (CUDA) | Specialist Coder & Document Synthesizer | Account 2 (GPU 1) :8082 |
| **nomic-embed-text-v1.5** | 137 Million | `Q8_0` | `llama.cpp` (CPU) | High-Dimensional Semantic Embeddings | Account 2 (CPU) :8083 |

---

## 2. Distributed Development Cluster Topology (Kaggle Dual-Cloud)

### 2.1 Why Dual-Cluster Distributed Development Was Chosen
Running large models like **Gemma 3 12B IT** alongside a **7B Deep Reasoner** and **Qwen2.5-VL** concurrently requires significant VRAM. Due to hardware and budget constraints in educational and hackathon environments:
* Dual Kaggle accounts were linked to provide **4x Tesla T4 GPUs (64 GB aggregate VRAM)**.
* Each account runs a self-healing cluster script with proxy-free local socket checks and fail-fast process monitoring.
* Endpoints are securely published to the local development environment using ephemeral **Cloudflare HTTP/2 tunnels**.

### 2.2 Account Allocation Breakdown

#### Account 1 Cluster (`scripts/kaggle_account1_cluster.py`)
* **Hardware**: 2x Tesla T4 (32 GB VRAM)
* **GPU 0 (16 GB)**: Hosts `Qwen2.5-7B-Instruct` on `:8080` (`THINK_URL`). Handles high-level reasoning, multi-step engineering logic, and complex regulatory validation.
* **GPU 1 (16 GB)**: Hosts `Qwen2.5-VL-3B-Instruct` on `:8081` (`VISION_URL`). Native PyTorch execution with `qwen-vl-utils` eliminating any tokenization or M-RoPE collapse.

#### Account 2 Cluster (`scripts/kaggle_account2_cluster.py`)
* **Hardware**: 2x Tesla T4 (32 GB VRAM) + 4 vCPUs
* **GPU 0 (16 GB)**: Hosts `Qwen2.5-3B-Instruct` on `:8080` (`FAST_BRAIN_URL`). Provides instant triage and sub-second chat responses.
* **GPU 1 (16 GB)**: Hosts `google_gemma-3-12b-it-Q5_K_M` on `:8082` (`CODER_URL`). Specialized coding model synthesizing complex Python data simulations, calculation scripts, and document synthesis logic.
* **Host CPU (30 GB RAM)**: Hosts `nomic-embed-text-v1.5` on `:8083` (`EMBED_URL`). Offloaded to CPU to preserve 100% of GPU VRAM for the 12B model.

---

## 3. Verified Benchmark Metrics (Live Cluster Health Check)

The live dual-cluster endpoints were benchmarked and verified:

```text
======================================================================
FINAL HEALTHCHECK SUMMARY (VERIFIED LIVE)
======================================================================
FAST_BRAIN_URL : 🟢 ONLINE  (Latency: 0.43s) -> Qwen2.5-3B-Instruct
CODER_URL      : 🟢 ONLINE  (Latency: 0.54s) -> Gemma 3 12B IT
EMBED_URL      : 🟢 ONLINE  (Latency: 0.41s) -> Nomic Embed v1.5 (dim: 768)
THINK_URL      : 🟢 ONLINE  (Latency: 0.53s) -> Qwen2.5-7B-Instruct
VISION_URL     : 🟢 ONLINE  (Latency: 0.71s) -> Qwen2.5-VL-3B-Instruct
```

---

## 4. Production On-Premise Allocation (Survival Mode)

In a refinery on-premise installation running on a single sovereign workstation (e.g., NVIDIA RTX 3090 / RTX 4090 with 24 GB VRAM), the architecture dynamically compresses into **Survival Mode**:

| Model | Quantization | VRAM Allocation | Residual KV-Cache Headroom |
| :--- | :---: | :---: | :---: |
| **Qwen2.5-7B-Instruct** (Brain / Planner) | `Q4_K_M` | ≈ 7.5 GB | — |
| **Qwen2.5-VL-3B** (Vision OCR) | `Q4` | ≈ 2.0 GB | — |
| **Qwen2.5-Coder-3B** (Coder) | `Q4` | ≈ 2.8 GB | — |
| **nomic-embed-text-v1.5** (Embeddings) | `Q8_0` / `f16` | ≈ 0.5 GB | — |
| **Static Total Memory** | — | **≈ 12.8 GB** | **≈ 11.2 GB Available** |

On a 24 GB GPU, this leaves **over 11 GB of VRAM headroom** for long-context KV caching (8192 tokens per request), completely preventing Out-Of-Memory (OOM) faults.

---

## 5. Dynamic Hot-Add Model Registry (`config/registry.json`)

Swara provides a decoupled model registry enabling refinery IT administrators to add or swap models without modifying application source code:

```json
{
  "brain-qwen25-7b": {
    "engine": "llama-server",
    "port": 8080,
    "quant": "Q4_K_M",
    "sha256": "8911e8a47f92bac19d6f5c64a2e2095bd2f7d0317e08920bcdeba3017a6a7c64",
    "health_endpoint": "http://127.0.0.1:8080/health"
  },
  "vision-qwen25-vl-3b": {
    "engine": "transformers",
    "port": 8081,
    "quant": "fp16",
    "sha256": "native-huggingface-verified",
    "health_endpoint": "http://127.0.0.1:8081/health"
  },
  "coder-gemma3-12b": {
    "engine": "llama-server",
    "port": 8082,
    "quant": "Q5_K_M",
    "sha256": "648e3a36a77c8a9f12d86e741f9dcb9089c769c4c7c88b63a48e42f9b17789a2",
    "health_endpoint": "http://127.0.0.1:8082/health"
  },
  "embed-nomic-v15": {
    "engine": "llama-server",
    "port": 8083,
    "quant": "Q8_0",
    "sha256": "0188c9bf409793f810680a5a431e7b899c46104c8ec6b51f89a95267b2d5f0e1",
    "health_endpoint": "http://127.0.0.1:8083/health"
  }
}
```

New models can be hot-added by:
1. Placing the GGUF weights in `/models`.
2. Validating the SHA-256 cryptographic hash against approved manifests.
3. Appending the entry to `registry.json`.
4. Starting the daemon.
