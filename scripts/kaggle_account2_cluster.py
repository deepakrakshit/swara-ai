import os
import sys
import time
import re
import socket
import shutil
import subprocess
import glob
import urllib.request
from pathlib import Path

# Ensure localhost traffic completely bypasses Kaggle's Squid HTTP proxy
os.environ["no_proxy"] = "localhost,127.0.0.1,0.0.0.0,::1"
os.environ["NO_PROXY"] = "localhost,127.0.0.1,0.0.0.0,::1"


# ============================================================
# KAVACH ACCOUNT 2 — FULL KAGGLE DEPLOYMENT
# Fast CEO 3B + Gemma 3 12B IT + Nomic Embeddings
# Dual T4 / CUDA / llama.cpp / Cloudflare
# ============================================================

print("=" * 75)
print("🛡️ KAVACH CLUSTER [ACCOUNT 2]")
print("Fast CEO 3B + Gemma 3 12B IT + Nomic Embeddings")
print("=" * 75)


# ============================================================
# 1. INTERNET CONNECTIVITY CHECK
# ============================================================

print("\n[1/14] Checking Internet connection...")

try:
    socket.create_connection(("huggingface.co", 443), timeout=8)
    print("✓ Kaggle Internet Connection is ACTIVE.")
except Exception as e:
    print("\n❌ CRITICAL: INTERNET IS TURNED OFF IN KAGGLE SETTINGS!")
    print("👉 In right sidebar -> Notebook options -> Settings -> Internet -> ON")
    print(f"Error: {e}\n")
    raise RuntimeError("Internet must be enabled in Kaggle settings.")


# ============================================================
# 2. GPU VALIDATION & TOPOLOGY
# ============================================================

print("\n[2/14] Checking GPU hardware topology...")

nvidia_smi = shutil.which("nvidia-smi")
if not nvidia_smi:
    for candidate in [
        "/usr/bin/nvidia-smi",
        "/usr/local/nvidia/bin/nvidia-smi",
        "/usr/local/cuda/bin/nvidia-smi",
    ]:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            nvidia_smi = candidate
            break

if nvidia_smi:
    try:
        subprocess.run([nvidia_smi], check=False)
    except Exception as e:
        print(f"Note: nvidia-smi run warning: {e}")
else:
    print("ℹ️ nvidia-smi command not found directly.")

GPU_COUNT = 0
try:
    import torch
    if torch.cuda.is_available():
        GPU_COUNT = torch.cuda.device_count()
        print(f"\n✓ CUDA is ACTIVE: {GPU_COUNT} GPU(s) detected:")
        for i in range(GPU_COUNT):
            props = torch.cuda.get_device_properties(i)
            print(f"    • GPU {i}: {props.name} | {props.total_memory / (1024 ** 3):.2f} GB VRAM")
    else:
        print("\n⚠️ PyTorch reports CUDA is NOT available.")
except Exception as e:
    print(f"Note: PyTorch CUDA probe: {e}")

if GPU_COUNT == 0:
    print("\n" + "=" * 75)
    print("⚠️ WARNING: NO NVIDIA GPU DETECTED IN THIS KAGGLE SESSION!")
    print("=" * 75)
    print("To enable full Dual T4 GPU acceleration:")
    print("  1. In the right panel under 'Notebook options' / 'Settings'")
    print("  2. Click 'Accelerator' and select 'GPU T4 x 2' (Dual Tesla T4 - 30GB VRAM)")
    print("  3. Restart session and run all cells.")
    print("=" * 75)
elif GPU_COUNT == 1:
    print("\nℹ️ Single GPU detected (GPU 0). Models will share GPU 0.")
else:
    print(f"\n✓ Dual GPU cluster topology verified: {GPU_COUNT} GPUs ready.")


# ============================================================
# 3. TERMINATE PREVIOUS BACKGROUND PROCESSES
# ============================================================

print("\n[3/14] Cleaning previous background processes...")

subprocess.run(
    "pkill -9 -f llama_cpp || true",
    shell=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

subprocess.run(
    "pkill -9 -f cloudflared || true",
    shell=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

print("✓ Previous llama.cpp / cloudflared processes cleaned.")


# ============================================================
# 4. SETUP CLOUDFLARED
# ============================================================

print("\n[4/14] Setting up cloudflared tunnel client...")

CLOUDFLARED = "/usr/local/bin/cloudflared"

if not os.path.exists(CLOUDFLARED):
    print("Downloading and configuring cloudflared...")
    subprocess.run(
        [
            "curl",
            "-fsSL",
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
            "-o",
            CLOUDFLARED,
        ],
        check=True,
    )
    os.chmod(CLOUDFLARED, 0o755)

print(f"✓ cloudflared ready: {CLOUDFLARED}")


# ============================================================
# 5. CONFIGURE CUDA RUNTIME PATHS & SYMLINK FALLBACKS
# ============================================================

print("\n[5/14] Configuring CUDA runtime library paths & fallbacks...")

cuda_lib_dirs = []

try:
    import torch
    torch_lib = os.path.join(os.path.dirname(torch.__file__), "lib")
    if os.path.isdir(torch_lib):
        cuda_lib_dirs.append(torch_lib)
except Exception:
    pass

search_roots = [
    "/usr/local/cuda/lib64",
    "/usr/local/cuda",
    "/usr/local/nvidia/lib64",
    "/usr/local/nvidia",
    "/usr/lib/x86_64-linux-gnu",
]

for root in search_roots:
    if os.path.isdir(root):
        cuda_lib_dirs.append(root)

cuda_lib_dirs = sorted(set(cuda_lib_dirs))

# Create compatibility symlinks for libcudart.so.13 / libcublas.so.13 if needed
for dir_path in cuda_lib_dirs:
    for base in ["libcudart", "libcublas", "libcublasLt"]:
        existing_12 = glob.glob(os.path.join(dir_path, f"{base}.so.12*"))
        target_13 = os.path.join(dir_path, f"{base}.so.13")
        if existing_12 and not os.path.exists(target_13):
            try:
                os.symlink(existing_12[0], target_13)
                print(f"✓ Created compat symlink: {target_13} -> {existing_12[0]}")
            except Exception:
                pass

if cuda_lib_dirs:
    old_ld = os.environ.get("LD_LIBRARY_PATH", "")
    new_ld_parts = cuda_lib_dirs + (old_ld.split(":") if old_ld else [])
    new_ld_parts = [x for x in dict.fromkeys(new_ld_parts) if x]
    os.environ["LD_LIBRARY_PATH"] = ":".join(new_ld_parts)
    print("✓ CUDA dynamic library paths configured:")
    for p in cuda_lib_dirs[:5]:
        print(f"    • {p}")


# ============================================================
# 6. VERIFY OR REINSTALL CUDA LLAMA-CPP-PYTHON WHEEL
# ============================================================

print("\n[6/14] Verifying native llama-cpp-python CUDA acceleration...")

llama_ok = False
try:
    import llama_cpp
    import llama_cpp.server
    _ = llama_cpp.llama_backend_init(False)
    llama_ok = True
    print(f"✓ Native llama-cpp-python {llama_cpp.__version__} is verified and functional!")
except Exception as e:
    print(f"Native import check failed ({e}). Performing clean wheel installation...")

if not llama_ok:
    subprocess.run(
        [sys.executable, "-m", "pip", "uninstall", "-y", "llama-cpp-python"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    INDEX_CANDIDATES = [
        "https://abetlen.github.io/llama-cpp-python/whl/cu122",
        "https://abetlen.github.io/llama-cpp-python/whl/cu124",
        "https://abetlen.github.io/llama-cpp-python/whl/cu121",
    ]
    for idx_url in INDEX_CANDIDATES:
        print(f"Installing pre-built wheel from: {idx_url}")
        res = subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-cache-dir",
                "--force-reinstall",
                "llama-cpp-python[server]",
                "--prefer-binary",
                "--extra-index-url",
                idx_url,
            ],
            check=False,
        )
        if res.returncode == 0:
            try:
                import llama_cpp
                import llama_cpp.server
                _ = llama_cpp.llama_backend_init(False)
                llama_ok = True
                print(f"✓ Native llama-cpp-python {llama_cpp.__version__} successfully initialized!")
                break
            except Exception as e:
                print(f"⚠️ Verification failed on {idx_url}: {e}")

    if not llama_ok:
        raise RuntimeError("❌ Failed to load CUDA-accelerated llama-cpp-python.")


# ============================================================
# 7. DOWNLOAD MODEL WEIGHTS FROM HUGGING FACE
# ============================================================

print("\n[7/14] Loading model weights (cached in ~/.cache/huggingface)...")

from huggingface_hub import hf_hub_download

# 7A. Fast CEO (Qwen 2.5 3B Instruct)
print("-> [1/3] Fetching Qwen2.5-3B-Instruct (Fast CEO & Chat)... (~1.9 GB)")
ceo_path = hf_hub_download(
    repo_id="bartowski/Qwen2.5-3B-Instruct-GGUF",
    filename="Qwen2.5-3B-Instruct-Q4_K_M.gguf",
)
print(f"✓ Fast CEO model: {ceo_path}")

# 7B. Semantic Embeddings (Nomic Embed Text v1.5)
print("\n-> [2/3] Fetching nomic-embed-text-v1.5 (Semantic Embeddings)... (~139 MB)")
embed_path = hf_hub_download(
    repo_id="nomic-ai/nomic-embed-text-v1.5-GGUF",
    filename="nomic-embed-text-v1.5.Q8_0.gguf",
)
print(f"✓ Embeddings model: {embed_path}")

# 7C. Specialist Coder (Gemma 3 12B IT)
print("\n-> [3/3] Fetching Gemma 3 12B IT Q5_K_M (Specialist Coder)... (~8.4 GB)")
coder_path = hf_hub_download(
    repo_id="bartowski/google_gemma-3-12b-it-GGUF",
    filename="google_gemma-3-12b-it-Q5_K_M.gguf",
)
print(f"✓ Gemma 3 12B IT model: {coder_path}")
print("\n✓ All model weights ready.")


# ============================================================
# 8. START FAST CEO — GPU 0 (PORT 8080)
# ============================================================

print("\n[8/14] Launching Fast CEO 3B on GPU 0 (:8080)...")

env_gpu0 = os.environ.copy()
if GPU_COUNT >= 1:
    env_gpu0["CUDA_VISIBLE_DEVICES"] = "0"

ceo_log_path = "/tmp/server_ceo.log"
ceo_log = open(ceo_log_path, "w")

ceo_cmd = [
    sys.executable,
    "-m",
    "llama_cpp.server",
    "--model",
    ceo_path,
    "--host",
    "0.0.0.0",
    "--port",
    "8080",
    "--n_gpu_layers",
    "99" if GPU_COUNT > 0 else "0",
    "--n_ctx",
    "8192",
]

p_ceo = subprocess.Popen(
    ceo_cmd,
    env=env_gpu0,
    stdout=ceo_log,
    stderr=subprocess.STDOUT,
)
print("✓ CEO process started (PID: {}) → GPU 0 → Port 8080".format(p_ceo.pid))


# ============================================================
# 9. START EMBEDDING ENGINE — CPU (PORT 8083)
# ============================================================

print("\n[9/14] Launching Embedding Engine on CPU (:8083)...")
env_cpu = os.environ.copy()
env_cpu["CUDA_VISIBLE_DEVICES"] = ""

embed_log_path = "/tmp/server_embed.log"
embed_log = open(embed_log_path, "w")

embed_cmd = [
    sys.executable,
    "-m",
    "llama_cpp.server",
    "--model",
    embed_path,
    "--embedding",
    "true",
    "--host",
    "0.0.0.0",
    "--port",
    "8083",
    "--n_ctx",
    "2048",
    "--n_gpu_layers",
    "0",
]

p_embed = subprocess.Popen(
    embed_cmd,
    env=env_cpu,
    stdout=embed_log,
    stderr=subprocess.STDOUT,
)
print("✓ Embedding process started (PID: {}) → CPU → Port 8083".format(p_embed.pid))


# ============================================================
# 10. START GEMMA 3 12B IT — GPU 1 (PORT 8082)
# ============================================================

coder_gpu_idx = "1" if GPU_COUNT >= 2 else ("0" if GPU_COUNT == 1 else "")
print(f"\n[10/14] Launching Gemma 3 12B IT on GPU {coder_gpu_idx or 'CPU'} (:8082)...")

env_gpu1 = os.environ.copy()
if coder_gpu_idx:
    env_gpu1["CUDA_VISIBLE_DEVICES"] = coder_gpu_idx

coder_log_path = "/tmp/server_coder.log"
coder_log = open(coder_log_path, "w")

# Use valid CLI arguments supported by llama_cpp.server.settings.ModelSettings
coder_cmd = [
    sys.executable,
    "-m",
    "llama_cpp.server",
    "--model",
    coder_path,
    "--host",
    "0.0.0.0",
    "--port",
    "8082",
    "--n_gpu_layers",
    "99" if GPU_COUNT > 0 else "0",
    "--n_ctx",
    "8192",
    "--flash_attn",
    "true",
]

p_coder = subprocess.Popen(
    coder_cmd,
    env=env_gpu1,
    stdout=coder_log,
    stderr=subprocess.STDOUT,
)
print("✓ Gemma 3 12B IT process started (PID: {}) → GPU {} → Port 8082".format(p_coder.pid, coder_gpu_idx or 'CPU'))


# ============================================================
# 11. PROXY-FREE DIRECT SOCKET & HTTP HEALTH CHECK
# ============================================================

print("\n[11/14] Waiting for model servers to report READY...")

# Direct opener bypassing Kaggle Squid proxy for localhost
proxy_free_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def check_endpoint(port):
    # 1. Direct TCP Socket check (100% immune to HTTP proxies)
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return True
    except Exception:
        pass

    # 2. HTTP probe using proxy-free opener
    for path in ["/docs", "/v1/models"]:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}{path}")
            with proxy_free_opener.open(req, timeout=1.5) as res:
                if res.status in (200, 307):
                    return True
        except Exception:
            pass
    return False

def get_last_log_line(log_path):
    if os.path.exists(log_path):
        try:
            with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                lines = [line.strip() for line in f.readlines() if line.strip()]
                return lines[-1] if lines else "initializing..."
        except Exception:
            pass
    return "starting..."

ceo_ok = False
embed_ok = False
coder_ok = False

max_attempts = 60
for attempt in range(1, max_attempts + 1):
    time.sleep(2)

    # 1. Check if any process terminated
    if not ceo_ok and p_ceo.poll() is not None:
        print(f"\n❌ CRITICAL: Fast CEO process exited with code {p_ceo.poll()}!")
        if os.path.exists(ceo_log_path):
            with open(ceo_log_path, "r", encoding="utf-8", errors="replace") as f:
                print("--- FAST CEO ERROR LOG ---\n" + f.read())
        raise RuntimeError("Fast CEO process failed.")

    if not coder_ok and p_coder.poll() is not None:
        print(f"\n❌ CRITICAL: Gemma 3 12B IT process exited with code {p_coder.poll()}!")
        if os.path.exists(coder_log_path):
            with open(coder_log_path, "r", encoding="utf-8", errors="replace") as f:
                print("--- GEMMA 3 12B ERROR LOG ---\n" + f.read())
        raise RuntimeError("Gemma 3 12B IT process failed.")

    if not embed_ok and p_embed.poll() is not None:
        print(f"\n❌ CRITICAL: Embedding process exited with code {p_embed.poll()}!")
        if os.path.exists(embed_log_path):
            with open(embed_log_path, "r", encoding="utf-8", errors="replace") as f:
                print("--- EMBEDDING ERROR LOG ---\n" + f.read())
        raise RuntimeError("Embedding process failed.")

    # 2. Check port & endpoint availability
    if not ceo_ok and check_endpoint(8080):
        ceo_ok = True
        print(f"✓ Fast CEO 3B is ONLINE on :8080! ({attempt * 2}s)")

    if not embed_ok and check_endpoint(8083):
        embed_ok = True
        print(f"✓ Embedding Engine is ONLINE on :8083! ({attempt * 2}s)")

    if not coder_ok and check_endpoint(8082):
        coder_ok = True
        print(f"✓ Gemma 3 12B IT Coder is ONLINE on :8082! ({attempt * 2}s)")

    if ceo_ok and embed_ok and coder_ok:
        print("\n🎉 All 3 model servers are ONLINE and ready!")
        break

    if attempt % 5 == 0:
        ceo_st = "ONLINE" if ceo_ok else f"loading... [{get_last_log_line(ceo_log_path)[:50]}]"
        coder_st = "ONLINE" if coder_ok else f"loading... [{get_last_log_line(coder_log_path)[:50]}]"
        embed_st = "ONLINE" if embed_ok else f"loading... [{get_last_log_line(embed_log_path)[:50]}]"
        print(f"  [{attempt * 2}s] CEO: {ceo_st} | Gemma: {coder_st} | Embed: {embed_st}")


# ============================================================
# 12. DIAGNOSTICS (FALLBACK)
# ============================================================

if not (ceo_ok and coder_ok and embed_ok):
    print("\n" + "=" * 75)
    print("⚠️ SERVICE STARTUP TIMEOUT DIAGNOSTICS")
    print("=" * 75)

    if not ceo_ok and os.path.exists(ceo_log_path):
        print("\n--- FAST CEO LOG ---")
        with open(ceo_log_path, "r", encoding="utf-8", errors="replace") as f:
            print(f.read()[-4000:])

    if not coder_ok and os.path.exists(coder_log_path):
        print("\n--- GEMMA 3 12B CODER LOG ---")
        with open(coder_log_path, "r", encoding="utf-8", errors="replace") as f:
            print(f.read()[-4000:])

    if not embed_ok and os.path.exists(embed_log_path):
        print("\n--- EMBEDDING LOG ---")
        with open(embed_log_path, "r", encoding="utf-8", errors="replace") as f:
            print(f.read()[-4000:])


# ============================================================
# 13. START CLOUDFLARE QUICK TUNNELS
# ============================================================

print("\n[13/14] Establishing Cloudflare HTTP/2 tunnels...")

cf_ceo_log = "/tmp/cf_ceo.log"
cf_coder_log = "/tmp/cf_coder.log"
cf_embed_log = "/tmp/cf_embed.log"

subprocess.Popen([
    CLOUDFLARED, "tunnel",
    "--url", "http://127.0.0.1:8080",
    "--protocol", "http2",
    "--logfile", cf_ceo_log,
])

subprocess.Popen([
    CLOUDFLARED, "tunnel",
    "--url", "http://127.0.0.1:8082",
    "--protocol", "http2",
    "--logfile", cf_coder_log,
])

subprocess.Popen([
    CLOUDFLARED, "tunnel",
    "--url", "http://127.0.0.1:8083",
    "--protocol", "http2",
    "--logfile", cf_embed_log,
])

def get_url(log_file, timeout_seconds=40):
    pattern = r"https://[a-zA-Z0-9-]+\.trycloudflare\.com"
    for _ in range(timeout_seconds):
        if os.path.exists(log_file):
            try:
                with open(log_file, "r") as f:
                    content = f.read()
                urls = re.findall(pattern, content)
                if urls:
                    return urls[-1]
            except Exception:
                pass
        time.sleep(1)
    return None

fast_brain_url = get_url(cf_ceo_log)
coder_url = get_url(cf_coder_log)
embed_url = get_url(cf_embed_log)


# ============================================================
# 14. FINAL SUMMARY & .ENV CONFIGURATION
# ============================================================

print("\n" + "=" * 75)
print("🔥 KAVACH ACCOUNT 2 CLUSTER ONLINE!")
print("=" * 75)

print("\nCopy these lines into Project-Kavach/.env or Project-Kavach-Swara/.env:")
print("-" * 75)
print(f"FAST_BRAIN_URL={fast_brain_url}")
print(f"CODER_URL={coder_url}")
print(f"EMBED_URL={embed_url}")
print("-" * 75)

print("\nService status:")
print(f"  Fast CEO 3B       : {'ONLINE' if ceo_ok else 'FAILED'}")
print(f"  Gemma 3 Coder 12B : {'ONLINE' if coder_ok else 'FAILED'}")
print(f"  Embeddings Engine : {'ONLINE' if embed_ok else 'FAILED'}")
print(f"  CEO Tunnel        : {'ONLINE' if fast_brain_url else 'FAILED'}")
print(f"  Coder Tunnel      : {'ONLINE' if coder_url else 'FAILED'}")
print(f"  Embed Tunnel      : {'ONLINE' if embed_url else 'FAILED'}")

if nvidia_smi:
    print("\nGPU MEMORY UTILIZATION:")
    subprocess.run(
        [
            nvidia_smi,
            "--query-gpu=index,name,memory.used,memory.total,utilization.gpu",
            "--format=csv",
        ],
        check=False,
    )

print("\n[ACTIVE] Cluster running. Keep this Kaggle session alive.")


# ============================================================
# KEEP-ALIVE
# ============================================================

try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("\nShutting down cluster services...")
    subprocess.run("pkill -9 -f llama_cpp || true", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run("pkill -9 -f cloudflared || true", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("✓ Cluster stopped cleanly.")