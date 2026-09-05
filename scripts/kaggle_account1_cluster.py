import os
import subprocess
import time
import re
import urllib.request
import sys
import socket

from huggingface_hub import hf_hub_download


print("=" * 70)
print("🛡️ KAVACH CLUSTER [ACCOUNT 1]: 7B Deep Reasoner & 7B Vision")
print("=" * 70)


# ============================================================
# 1. INTERNET CONNECTIVITY VERIFICATION
# ============================================================

try:
    socket.create_connection(("huggingface.co", 443), timeout=5)
    print("✓ Kaggle Internet Connection is ACTIVE.")
except Exception as e:
    print("\n❌ CRITICAL: INTERNET IS TURNED OFF IN KAGGLE SETTINGS!")
    print("👉 Right sidebar -> Notebook options -> Settings -> Internet -> ON")
    print(f"Error: {e}\n")
    raise RuntimeError("Internet must be enabled in Kaggle settings.")


# ============================================================
# 2. TERMINATE PREVIOUS BACKGROUND PROCESSES
# ============================================================

print("\nCleaning previous background processes...")

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
# 3. SETUP CLOUDFLARED
# ============================================================

CLOUDFLARED = "/usr/local/bin/cloudflared"

if not os.path.exists(CLOUDFLARED):
    print("\nDownloading and configuring cloudflared...")

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

print(f"✓ cloudflared installed at {CLOUDFLARED}")


# ============================================================
# 4. INSTALL / CHECK CUDA-ACCELERATED LLAMA-CPP-PYTHON
# ============================================================

try:
    import llama_cpp.server

    print("✓ llama-cpp-python[server] is already installed.")

except ImportError:

    print(
        "\nInstalling llama-cpp-python[server] "
        "with CUDA 12.2 GPU acceleration..."
    )

    res = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "llama-cpp-python[server]",
            "--prefer-binary",
            "--extra-index-url",
            "https://abetlen.github.io/llama-cpp-python/whl/cu122",
        ]
    )

    if res.returncode != 0:

        print(
            "\n⚠️ CUDA 12.2 installation failed."
            "\nTrying CUDA 12.1 wheel..."
        )

        res2 = subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "llama-cpp-python[server]",
                "--prefer-binary",
                "--extra-index-url",
                "https://abetlen.github.io/llama-cpp-python/whl/cu121",
            ]
        )

        if res2.returncode != 0:
            raise RuntimeError(
                "❌ Could not install CUDA-enabled llama-cpp-python."
            )

    print("✓ llama-cpp-python installation complete.")


# ============================================================
# 5. DOWNLOAD MODEL WEIGHTS
# ============================================================

print("\n[1/2] Downloading model weights from Hugging Face...")


# ------------------------------------------------------------
# 5A. 7B DEEP REASONER
# ------------------------------------------------------------

print("-> [1/2] Fetching 7B Deep Reasoner...")

reasoner_path = hf_hub_download(
    repo_id="bartowski/Qwen2.5-7B-Instruct-GGUF",
    filename="Qwen2.5-7B-Instruct-Q4_K_M.gguf",
)

print(f"✓ Deep Reasoner downloaded:")
print(f"  {reasoner_path}")


# ------------------------------------------------------------
# 5B. 7B VISION MODEL
# ------------------------------------------------------------

print("\n-> [2/2] Fetching 7B Vision Model...")

vision_path = hf_hub_download(
    repo_id="bartowski/Qwen_Qwen2.5-VL-7B-Instruct-GGUF",
    filename="Qwen_Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf",
)

print(f"✓ Vision model downloaded:")
print(f"  {vision_path}")


# ------------------------------------------------------------
# 5C. VISION PROJECTOR
# ------------------------------------------------------------

print("\n-> Fetching Vision projector...")

mmproj_path = hf_hub_download(
    repo_id="bartowski/Qwen_Qwen2.5-VL-7B-Instruct-GGUF",
    filename="mmproj-Qwen_Qwen2.5-VL-7B-Instruct-f16.gguf",
)

print(f"✓ Vision projector downloaded:")
print(f"  {mmproj_path}")

print("\n✓ All weights are ready.")


# ============================================================
# 6. DISPLAY GPU INFORMATION & TOPOLOGY
# ============================================================

print("\nGPU STATUS & TOPOLOGY")
print("-" * 70)

import shutil

nvidia_smi_bin = shutil.which("nvidia-smi")
if not nvidia_smi_bin:
    for candidate in [
        "/usr/bin/nvidia-smi",
        "/usr/local/nvidia/bin/nvidia-smi",
        "/usr/local/cuda/bin/nvidia-smi",
    ]:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            nvidia_smi_bin = candidate
            break

if nvidia_smi_bin:
    try:
        subprocess.run([nvidia_smi_bin], check=False)
    except Exception as e:
        print(f"Note: Could not run {nvidia_smi_bin}: {e}")
else:
    print("ℹ️ 'nvidia-smi' command not found in PATH or standard system paths.")

# Probe PyTorch CUDA device count and VRAM
gpu_count = 0
try:
    import torch
    if torch.cuda.is_available():
        gpu_count = torch.cuda.device_count()
        print(f"\n✓ PyTorch CUDA is ACTIVE: {gpu_count} GPU(s) detected:")
        for idx in range(gpu_count):
            name = torch.cuda.get_device_name(idx)
            vram_gb = round(torch.cuda.get_device_properties(idx).total_memory / (1024**3), 1)
            print(f"    • GPU {idx}: {name} ({vram_gb} GB VRAM)")
    else:
        print("\n⚠️ PyTorch reports CUDA is NOT available.")
except Exception as e:
    print(f"\nNote: PyTorch CUDA probe: {e}")

if gpu_count == 0:
    print("\n" + "=" * 70)
    print("⚠️ CRITICAL NOTICE: NO NVIDIA GPU DETECTED IN THIS KAGGLE SESSION!")
    print("=" * 70)
    print("You are currently running in CPU mode.")
    print("To enable full GPU acceleration:")
    print("  1. In the right panel under 'Notebook options' / 'Settings'")
    print("  2. Click 'Accelerator' and select 'GPU T4 x 2' (Dual Tesla T4 - 30GB VRAM)")
    print("  3. Ensure 'Internet' is toggled to ON")
    print("  4. Restart session and run all cells.")
    print("=" * 70)
    print("\nContinuing in CPU fallback mode (slower)...")
elif gpu_count == 1:
    print("\nℹ️ 1 GPU detected. Models will share GPU 0. (For maximum speed, select 'GPU T4 x 2' in Kaggle settings)")
else:
    print(f"\n✓ Multi-GPU cluster topology verified: {gpu_count} GPUs available.")


# ============================================================
# 7. LAUNCH DEEP REASONER ON GPU 0
# ============================================================

print("\n[2/3] Launching Deep Reasoner 7B on GPU 0...")

env_gpu0 = os.environ.copy()
env_gpu0["CUDA_VISIBLE_DEVICES"] = "0"

reasoner_log_path = "/tmp/server_reasoner.log"

log_r = open(reasoner_log_path, "w")

p_r = subprocess.Popen(
    [
        sys.executable,
        "-m",
        "llama_cpp.server",
        "--model",
        reasoner_path,
        "--host",
        "0.0.0.0",
        "--port",
        "8080",
        "--n_gpu_layers",
        "99",
        "--n_ctx",
        "8192",
    ],
    env=env_gpu0,
    stdout=log_r,
    stderr=subprocess.STDOUT,
)

print("✓ Deep Reasoner 7B launching on GPU 0 (Port 8080)...")


# ============================================================
# 8. LAUNCH VISION MODEL ON GPU 1
# ============================================================

print("\nLaunching Vision Model 7B on GPU 1...")

env_gpu1 = os.environ.copy()
env_gpu1["CUDA_VISIBLE_DEVICES"] = "1"

vision_log_path = "/tmp/server_vision.log"

log_v = open(vision_log_path, "w")

p_v = subprocess.Popen(
    [
        sys.executable,
        "-m",
        "llama_cpp.server",
        "--model",
        vision_path,
        "--clip_model_path",
        mmproj_path,
        "--host",
        "0.0.0.0",
        "--port",
        "8081",
        "--n_gpu_layers",
        "99",
        "--n_ctx",
        "4096",
    ],
    env=env_gpu1,
    stdout=log_v,
    stderr=subprocess.STDOUT,
)

print("✓ Vision Model 7B launching on GPU 1 (Port 8081)...")


# ============================================================
# 9. HEALTH CHECK WAIT LOOP
# ============================================================

print("\nWaiting for models to load into VRAM...")

r_ok = False
v_ok = False

for _ in range(90):

    time.sleep(2)

    # --------------------------------------------------------
    # Reasoner health check
    # --------------------------------------------------------

    if not r_ok:

        try:

            with urllib.request.urlopen(
                "http://127.0.0.1:8080/v1/models",
                timeout=2,
            ) as res:

                if res.status == 200:
                    r_ok = True
                    print("✓ Deep Reasoner 7B is ONLINE on :8080!")

        except Exception:
            pass


    # --------------------------------------------------------
    # Vision health check
    # --------------------------------------------------------

    if not v_ok:

        try:

            with urllib.request.urlopen(
                "http://127.0.0.1:8081/v1/models",
                timeout=2,
            ) as res:

                if res.status == 200:
                    v_ok = True
                    print("✓ Vision Model 7B is ONLINE on :8081!")

        except Exception:
            pass


    # --------------------------------------------------------
    # Both ready
    # --------------------------------------------------------

    if r_ok and v_ok:
        break


# ============================================================
# 10. PRINT FAILURE LOGS
# ============================================================

if not (r_ok and v_ok):

    print(
        "\n⚠️ One or more instances failed "
        "to report ready."
    )

    if not r_ok and os.path.exists(reasoner_log_path):

        print("\n--- REASONER LOG ---")

        with open(reasoner_log_path, "r") as f:
            print(f.read()[-5000:])


    if not v_ok and os.path.exists(vision_log_path):

        print("\n--- VISION LOG ---")

        with open(vision_log_path, "r") as f:
            print(f.read()[-5000:])


# ============================================================
# 11. START CLOUDFLARE HTTP/2 QUICK TUNNELS
# ============================================================

print("\n[3/3] Establishing Cloudflare HTTP/2 tunnels...")


cf_reasoner_log = "/tmp/cf_reasoner.log"
cf_vision_log = "/tmp/cf_vision.log"


subprocess.Popen(
    [
        CLOUDFLARED,
        "tunnel",
        "--url",
        "http://127.0.0.1:8080",
        "--protocol",
        "http2",
        "--logfile",
        cf_reasoner_log,
    ]
)


subprocess.Popen(
    [
        CLOUDFLARED,
        "tunnel",
        "--url",
        "http://127.0.0.1:8081",
        "--protocol",
        "http2",
        "--logfile",
        cf_vision_log,
    ]
)


# ============================================================
# 12. EXTRACT CLOUDFLARE URL
# ============================================================

def get_url(log_file, timeout_seconds=30):

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


think_url = get_url(cf_reasoner_log)
vision_url = get_url(cf_vision_log)


# ============================================================
# 13. FINAL STATUS
# ============================================================

print("\n" + "=" * 70)
print("🔥 KAVACH ACCOUNT 1 CLUSTER ONLINE!")
print("=" * 70)

print("\nCopy these lines into Project-Kavach/.env:")
print("-" * 70)

print(f"THINK_URL={think_url}")
print(f"VISION_URL={vision_url}")

print("-" * 70)

print("\nService status:")
print(
    f"Deep Reasoner 7B : "
    f"{'ONLINE' if r_ok else 'FAILED'}"
)

print(
    f"Vision Model 7B  : "
    f"{'ONLINE' if v_ok else 'FAILED'}"
)

print(
    f"Reasoner Tunnel  : "
    f"{'ONLINE' if think_url else 'FAILED'}"
)

print(
    f"Vision Tunnel    : "
    f"{'ONLINE' if vision_url else 'FAILED'}"
)


# ============================================================
# 14. KEEP-ALIVE
# ============================================================

print("\n[ACTIVE] Cluster running.")
print("Keep the Kaggle session alive while using these endpoints.")

try:

    while True:
        time.sleep(60)

except KeyboardInterrupt:

    print("\nShutting down cluster...")

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

    print("✓ Cluster stopped.")