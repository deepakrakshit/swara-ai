# Deployment & Operations Guide

---

## 1. Two Deployment Modes

Swara.ai (Project Kavach) supports two distinct operational modes:

1. **Production Sovereign Mode (Air-Gapped Refinery Workstation)**:
   * 100% offline, on-premise single-workstation or rack server deployment.
   * Zero external connectivity, zero internet access.
   * Runs the optimized Survival Mode model stack within 24 GB VRAM.
2. **Development & Testing Mode (Distributed Kaggle Dual-Cluster)**:
   * Used for rapid evaluation, stress-testing large 12B models, and continuous development without requiring expensive private GPU clusters.
   * Utilizes 2 Kaggle accounts (4x Tesla T4 GPUs, 64 GB VRAM) connected via secure Cloudflare HTTP/2 tunnels.

---

## 2. Production On-Premise Sovereign Deployment

### 2.1 Hardware Prerequisites
* **Processor**: 8+ Core x86_64 CPU (Intel Xeon / AMD Ryzen or EPYC).
* **GPU**: NVIDIA GPU with 24 GB+ VRAM (e.g., RTX 3090, RTX 4090, RTX A5000, RTX 6000 Ada, or Dual RTX 4080s).
* **System RAM**: 32 GB Minimum (64 GB Recommended).
* **Storage**: 200 GB+ NVMe SSD.
* **Operating System**: Ubuntu 22.04 LTS / 24.04 LTS or Windows 11 Enterprise (WSL2/Native).

### 2.2 Air-Gapped Installation Steps

#### Step 1: Model Transfer (Via Secure Physical Media)
In accordance with air-gap protocol, download the verified model files onto an encrypted, scan-verified external USB drive and copy them into `models/`:
```bash
# Model directory structure:
models/
├── ceo/
│   └── Qwen2.5-3B-Instruct-Q4_K_M.gguf
├── document/
│   └── Qwen2.5-7B-Instruct-Q4_K_M.gguf
├── vision/
│   └── Qwen2.5-VL-3B-Instruct/ (PyTorch weights or GGUF)
├── coder/
│   └── google_gemma-3-12b-it-Q5_K_M.gguf (or Qwen2.5-Coder-3B-Q4_K_M.gguf)
└── embedding/
    └── nomic-embed-text-v1.5.Q8_0.gguf
```

#### Step 2: Environment Setup
```bash
# Clone or transfer repository:
cd Project-Kavach-Swara

# Create python virtual environment:
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install offline dependencies:
pip install --no-index --find-links=/path/to/wheelhouse -r requirements.txt
```

#### Step 3: Run Preflight Sovereignty Gate
```bash
# Validates model SHA-256 hashes, locks down iptables firewall, and disables IPv6:
chmod +x scripts/preflight.sh scripts/sovereignty_firewall.sh
sudo bash scripts/preflight.sh
```

#### Step 4: Configure Local `.env`
```ini
# Production Air-Gap Configuration (.env)
DEEP_BRAIN_URL=http://127.0.0.1:8080
BRAIN_URL=http://127.0.0.1:8080
THINK_URL=http://127.0.0.1:8080
VISION_URL=http://127.0.0.1:8081
FAST_BRAIN_URL=http://127.0.0.1:8080
CODER_URL=http://127.0.0.1:8082
EMBEDDING_URL=http://127.0.0.1:8083
EMBED_URL=http://127.0.0.1:8083

SOVEREIGN_FIREWALL_DISABLE=0
CHROMA_TELEMETRY_OPTOUT=True
ANONYMIZED_TELEMETRY=False
```

#### Step 5: Start All Services
```bash
python run.py
```
* The static frontend will be served at `http://10.0.99.x:8000` (or `http://localhost:8000`).
* All model daemons bind exclusively to localhost and the local subnet.

---

## 3. Development & Testing Deployment (Kaggle Dual-Cluster)

### 3.1 Rationale for Kaggle Dual-Cluster
To allow development and evaluation of heavy 12B/7B models without requiring costly dedicated enterprise GPUs, we created a distributed 4-GPU testing harness across two Kaggle accounts.

### 3.2 Account 1 Deployment (`scripts/kaggle_account1_cluster.py`)
1. Create a new Kaggle notebook.
2. In the right panel under **Settings**:
   * Set **Accelerator** to **GPU T4 x 2** (Dual T4).
   * Set **Internet** to **ON**.
3. Paste the contents of `scripts/kaggle_account1_cluster.py` into a cell and execute.
4. When finished, it prints:
   ```text
   THINK_URL=https://<subdomain>.trycloudflare.com
   VISION_URL=https://<subdomain>.trycloudflare.com
   ```

### 3.3 Account 2 Deployment (`scripts/kaggle_account2_cluster.py`)
1. Open a second Kaggle notebook (under a second account).
2. Configure **Accelerator** to **GPU T4 x 2** and **Internet** to **ON**.
3. Paste the contents of `scripts/kaggle_account2_cluster.py` into a cell and execute.
4. When finished, it prints:
   ```text
   FAST_BRAIN_URL=https://<subdomain>.trycloudflare.com
   CODER_URL=https://<subdomain>.trycloudflare.com
   EMBED_URL=https://<subdomain>.trycloudflare.com
   ```

### 3.4 Updating Local `.env`
Paste the five URLs into `.env`:
```ini
THINK_URL=https://<account1-think>.trycloudflare.com
VISION_URL=https://<account1-vision>.trycloudflare.com
FAST_BRAIN_URL=https://<account2-fastbrain>.trycloudflare.com
CODER_URL=https://<account2-coder>.trycloudflare.com
EMBED_URL=https://<account2-embed>.trycloudflare.com
EMBEDDING_URL=https://<account2-embed>.trycloudflare.com
```

### 3.5 Verifying Endpoint Health
Run the automated multi-endpoint verification script:
```bash
python scratch/test_endpoints.py
```
Expected output:
```text
======================================================================
FINAL HEALTHCHECK SUMMARY
======================================================================
FAST_BRAIN_URL : 🟢 ONLINE  (Latency: 0.43s)
CODER_URL      : 🟢 ONLINE  (Latency: 0.54s)
EMBED_URL      : 🟢 ONLINE  (Latency: 0.41s)
THINK_URL      : 🟢 ONLINE  (Latency: 0.53s)
VISION_URL     : 🟢 ONLINE  (Latency: 0.71s)
```

### 3.6 Launching Local Developer UI & Orchestrator
```bash
# Starts FastAPI server and hosts the frontend UI on port 8000:
python run.py
```
Open `http://localhost:8000` in your web browser.
