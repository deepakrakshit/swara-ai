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
# KAVACH CLUSTER [ACCOUNT 1] — FULL KAGGLE DEPLOYMENT
# 7B Deep Reasoner (GPU 0) + Native Qwen2.5-VL Vision Engine (GPU 1)
# Dual Tesla T4 / CUDA / Transformers + llama.cpp / Cloudflare
# ============================================================

print("=" * 75)
print("🛡️ KAVACH CLUSTER [ACCOUNT 1]")
print("7B Deep Reasoner (Qwen2.5-7B) + Native Qwen2.5-VL Vision Engine")
print("=" * 75)


# ============================================================
# 1. INTERNET CONNECTIVITY CHECK
# ============================================================

print("\n[1/13] Checking Internet connection...")

try:
    socket.create_connection(("huggingface.co", 443), timeout=8)
    print("✓ Kaggle Internet Connection is ACTIVE.")
except Exception as e:
    print("\n❌ CRITICAL: INTERNET IS TURNED OFF IN KAGGLE SETTINGS!")
    print("👉 Right sidebar -> Notebook options -> Settings -> Internet -> ON")
    print(f"Error: {e}\n")
    raise RuntimeError("Internet must be enabled in Kaggle settings.")


# ============================================================
# 2. TERMINATE PREVIOUS BACKGROUND PROCESSES
# ============================================================

print("\n[2/13] Cleaning previous background processes...")

subprocess.run("pkill -9 -f llama_cpp || true", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run("pkill -9 -f cloudflared || true", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run("pkill -9 -f vision_server || true", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("✓ Previous cluster processes cleaned.")


# ============================================================
# 3. SETUP CLOUDFLARED
# ============================================================

print("\n[3/13] Setting up cloudflared tunnel client...")

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
# 4. GPU TOPOLOGY & CUDA ENVIRONMENT
# ============================================================

print("\n[4/13] Checking GPU hardware topology...")

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
    print("To enable full GPU acceleration:")
    print("  1. In the right panel under 'Notebook options' / 'Settings'")
    print("  2. Click 'Accelerator' and select 'GPU T4 x 2' (Dual Tesla T4 - 30GB VRAM)")
    print("  3. Restart session and run all cells.")
    print("=" * 75)
elif GPU_COUNT == 1:
    print("\nℹ️ Single GPU detected. Reasoner and Vision will share GPU 0.")
else:
    print(f"\n✓ Dual GPU cluster topology verified: {GPU_COUNT} GPUs ready.")


# ============================================================
# 5. CONFIGURE CUDA RUNTIME & INSTALL LLAMA-CPP-PYTHON
# ============================================================

print("\n[5/13] Verifying llama-cpp-python CUDA acceleration for Reasoner...")

llama_ok = False
try:
    import llama_cpp
    import llama_cpp.server
    _ = llama_cpp.llama_backend_init(False)
    llama_ok = True
    print(f"✓ Native llama-cpp-python {llama_cpp.__version__} is verified and functional!")
except Exception as e:
    print(f"Native import check failed ({e}). Installing clean wheel...")

if not llama_ok:
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
# 6. INSTALL VISION DEPENDENCIES (QWEN-VL-UTILS & ACCELERATE)
# ============================================================

print("\n[6/13] Checking native vision dependencies (qwen-vl-utils, torchvision, accelerate)...")

try:
    import qwen_vl_utils
    import torchvision
    print("✓ Vision utilities verified.")
except ImportError:
    print("Installing qwen-vl-utils and accelerate...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", "--no-cache-dir", "qwen-vl-utils", "accelerate"],
        check=True,
    )
    print("✓ Vision utilities installed.")


# ============================================================
# 7. FETCH 7B DEEP REASONER WEIGHTS (GGUF)
# ============================================================

print("\n[7/13] Fetching 7B Deep Reasoner model weights from Hugging Face...")

from huggingface_hub import hf_hub_download

reasoner_path = hf_hub_download(
    repo_id="bartowski/Qwen2.5-7B-Instruct-GGUF",
    filename="Qwen2.5-7B-Instruct-Q4_K_M.gguf",
)
print(f"✓ Deep Reasoner 7B model: {reasoner_path}")


# ============================================================
# 8. CREATE NATIVE HIGH-PERFORMANCE VISION SERVER SCRIPT
# ============================================================

print("\n[8/13] Creating native Qwen2.5-VL Vision Server (0% Question Marks)...")

vision_server_code = '''
import os
import sys
import time
import torch
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info

app = FastAPI(title="Swara Sovereign Vision Server", version="2.0.0")

MODEL_ID = os.environ.get("VISION_MODEL_ID", "Qwen/Qwen2.5-VL-3B-Instruct")
dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
device = "cuda:0" if torch.cuda.is_available() else "cpu"

print(f"[Vision Engine] Initializing {MODEL_ID} on {device} ({dtype})...", flush=True)

model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=dtype,
    device_map=device,
)
processor = AutoProcessor.from_pretrained(MODEL_ID)
print("[Vision Engine] Model weights & processor loaded successfully!", flush=True)


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": MODEL_ID,
                "object": "model",
                "created": int(time.time()),
                "owned_by": "qwen",
            }
        ],
    }


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_ID}


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    messages = body.get("messages", [])
    max_tokens = int(body.get("max_tokens", 512))
    temperature = float(body.get("temperature", 0.1))

    # Standardize messages to format expected by qwen_vl_utils
    formatted_messages = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content")

        if isinstance(content, str):
            formatted_messages.append({
                "role": role,
                "content": [{"type": "text", "text": content}],
            })
        elif isinstance(content, list):
            qwen_content = []
            for item in content:
                if not isinstance(item, dict):
                    continue
                itype = item.get("type", "")
                if itype == "text":
                    qwen_content.append({"type": "text", "text": item.get("text", "")})
                elif itype == "image_url":
                    img_url_data = item.get("image_url", {})
                    url_val = img_url_data.get("url") if isinstance(img_url_data, dict) else img_url_data
                    qwen_content.append({"type": "image", "image": url_val})
                elif itype == "image":
                    qwen_content.append(item)
            formatted_messages.append({"role": role, "content": qwen_content})
        else:
            formatted_messages.append({"role": role, "content": [{"type": "text", "text": str(content)}]})

    if not formatted_messages:
        formatted_messages = [{"role": "user", "content": [{"type": "text", "text": "Hello"}]}]

    try:
        text_prompt = processor.apply_chat_template(
            formatted_messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(formatted_messages)

        inputs = processor(
            text=[text_prompt],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(device)

        with torch.no_grad():
            gen_kwargs = {
                "max_new_tokens": max_tokens,
                "do_sample": temperature > 0.05,
            }
            if temperature > 0.05:
                gen_kwargs["temperature"] = temperature
                gen_kwargs["top_p"] = 0.9

            generated_ids = model.generate(**inputs, **gen_kwargs)

        # Trim input prompt tokens
        generated_ids_trimmed = [
            out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = processor.batch_decode(
            generated_ids_trimmed,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0].strip()

        return {
            "id": f"chatcmpl-vision-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": MODEL_ID,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": output_text},
                    "finish_reason": "stop",
                }
            ],
        }

    except Exception as e:
        print(f"[Vision Engine Error] {e}", flush=True)
        return JSONResponse(
            status_code=500,
            content={"error": {"message": str(e), "type": "vision_inference_error"}},
        )


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
'''

vision_server_path = "/tmp/vision_server.py"
with open(vision_server_path, "w", encoding="utf-8") as f:
    f.write(vision_server_code.strip() + "\n")

print(f"✓ Vision server script written: {vision_server_path}")


# ============================================================
# 9. START DEEP REASONER 7B — GPU 0 (PORT 8080)
# ============================================================

print("\n[9/13] Launching Deep Reasoner 7B on GPU 0 (:8080)...")

env_gpu0 = os.environ.copy()
if GPU_COUNT >= 1:
    env_gpu0["CUDA_VISIBLE_DEVICES"] = "0"

reasoner_log_path = "/tmp/server_reasoner.log"
log_r = open(reasoner_log_path, "w")

cmd_reasoner = [
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
    "99" if GPU_COUNT > 0 else "0",
    "--n_ctx",
    "8192",
]

p_r = subprocess.Popen(
    cmd_reasoner,
    env=env_gpu0,
    stdout=log_r,
    stderr=subprocess.STDOUT,
)
print(f"✓ Deep Reasoner 7B process started (PID: {p_r.pid}) → GPU 0 → Port 8080")


# ============================================================
# 10. START NATIVE VISION SERVER — GPU 1 (PORT 8081)
# ============================================================

vision_gpu_idx = "1" if GPU_COUNT >= 2 else ("0" if GPU_COUNT == 1 else "")
print(f"\n[10/13] Launching Native Qwen2.5-VL Vision Engine on GPU {vision_gpu_idx or 'CPU'} (:8081)...")

env_gpu1 = os.environ.copy()
if vision_gpu_idx:
    env_gpu1["CUDA_VISIBLE_DEVICES"] = vision_gpu_idx

vision_log_path = "/tmp/server_vision.log"
log_v = open(vision_log_path, "w")

cmd_vision = [sys.executable, vision_server_path, "8081"]

p_v = subprocess.Popen(
    cmd_vision,
    env=env_gpu1,
    stdout=log_v,
    stderr=subprocess.STDOUT,
)
print(f"✓ Vision Engine process started (PID: {p_v.pid}) → GPU {vision_gpu_idx or 'CPU'} → Port 8081")


# ============================================================
# 11. PROXY-FREE HEALTH CHECK WITH FAIL-FAST MONITORING
# ============================================================

print("\n[11/13] Waiting for model servers to report READY...")

proxy_free_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def check_endpoint(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return True
    except Exception:
        pass

    for path in ["/health", "/docs", "/v1/models"]:
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
                lines = [l.strip() for l in f.readlines() if l.strip()]
                return lines[-1] if lines else "initializing..."
        except Exception:
            pass
    return "starting..."

r_ok = False
v_ok = False

max_attempts = 75
for attempt in range(1, max_attempts + 1):
    time.sleep(2)

    # Fail-fast check
    if not r_ok and p_r.poll() is not None:
        print(f"\n❌ CRITICAL: Deep Reasoner process exited with code {p_r.poll()}!")
        if os.path.exists(reasoner_log_path):
            with open(reasoner_log_path, "r", encoding="utf-8", errors="replace") as f:
                print("--- REASONER ERROR LOG ---\n" + f.read())
        raise RuntimeError("Deep Reasoner process failed.")

    if not v_ok and p_v.poll() is not None:
        print(f"\n❌ CRITICAL: Vision Engine process exited with code {p_v.poll()}!")
        if os.path.exists(vision_log_path):
            with open(vision_log_path, "r", encoding="utf-8", errors="replace") as f:
                print("--- VISION ERROR LOG ---\n" + f.read())
        raise RuntimeError("Vision Engine process failed.")

    if not r_ok and check_endpoint(8080):
        r_ok = True
        print(f"✓ Deep Reasoner 7B is ONLINE on :8080! ({attempt * 2}s)")

    if not v_ok and check_endpoint(8081):
        v_ok = True
        print(f"✓ Native Qwen2.5-VL Vision Engine is ONLINE on :8081! ({attempt * 2}s)")

    if r_ok and v_ok:
        print("\n🎉 Both Reasoner and Vision servers are ONLINE and ready!")
        break

    if attempt % 5 == 0:
        r_st = "ONLINE" if r_ok else f"loading... [{get_last_log_line(reasoner_log_path)[:50]}]"
        v_st = "ONLINE" if v_ok else f"loading... [{get_last_log_line(vision_log_path)[:50]}]"
        print(f"  [{attempt * 2}s] Reasoner: {r_st} | Vision: {v_st}")


# ============================================================
# 12. START CLOUDFLARE HTTP/2 QUICK TUNNELS
# ============================================================

print("\n[12/13] Establishing Cloudflare HTTP/2 tunnels...")

cf_reasoner_log = "/tmp/cf_reasoner.log"
cf_vision_log = "/tmp/cf_vision.log"

subprocess.Popen([
    CLOUDFLARED, "tunnel",
    "--url", "http://127.0.0.1:8080",
    "--protocol", "http2",
    "--logfile", cf_reasoner_log,
])

subprocess.Popen([
    CLOUDFLARED, "tunnel",
    "--url", "http://127.0.0.1:8081",
    "--protocol", "http2",
    "--logfile", cf_vision_log,
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

think_url = get_url(cf_reasoner_log)
vision_url = get_url(cf_vision_log)


# ============================================================
# 13. FINAL STATUS & .ENV CONFIGURATION
# ============================================================

print("\n" + "=" * 75)
print("🔥 KAVACH ACCOUNT 1 CLUSTER ONLINE!")
print("=" * 75)

print("\nCopy these lines into Project-Kavach/.env or Project-Kavach-Swara/.env:")
print("-" * 75)
print(f"THINK_URL={think_url}")
print(f"VISION_URL={vision_url}")
print("-" * 75)

print("\nService status:")
print(f"  Deep Reasoner 7B : {'ONLINE' if r_ok else 'FAILED'}")
print(f"  Vision Engine    : {'ONLINE' if v_ok else 'FAILED'}")
print(f"  Reasoner Tunnel  : {'ONLINE' if think_url else 'FAILED'}")
print(f"  Vision Tunnel    : {'ONLINE' if vision_url else 'FAILED'}")

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
    subprocess.run("pkill -9 -f vision_server || true", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("✓ Cluster stopped cleanly.")
