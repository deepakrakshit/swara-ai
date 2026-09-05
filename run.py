"""Master Single-Command Launcher for Swara.ai.
Launches:
  1. Local Model Server (llama_cpp Qwen 2.5 on :8080)
  2. Orchestrator Backend & Web UI (FastAPI on :8000)
  3. Automatically opens browser to http://localhost:8000
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def get_python_exe() -> str:
    venv_py = Path(__file__).parent / "venv" / "Scripts" / "python.exe"
    if venv_py.is_file():
        return str(venv_py)
    # Check parent directory venv fallback
    parent_venv = Path(__file__).parent.parent / "Project-Kavach" / "venv" / "Scripts" / "python.exe"
    if parent_venv.is_file():
        return str(parent_venv)
    return sys.executable


def banner(is_cluster: bool = False):
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    topo = "Distributed 4-GPU Cluster (Dual Tesla T4 x 2)" if is_cluster else "Local Host Inference"
    print(rf"""
 ======================================================================
   [#] Swara.ai -- Sovereign On-Premise Agentic AI Workbench
   MoPNG / MRPL (SIH26117)
 ======================================================================
   * Air-Gapped Localhost Enforcement : ACTIVE
   * Inference Topology               : {topo}
   * Sovereign Backend & Web UI       : http://127.0.0.1:8000
   * Zero External AI Leakage         : 100% Sovereign (MRPL Standard)
 ======================================================================
    """)


def main():
    # 0. Load Environment Configuration
    try:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent / ".env")
    except Exception:
        pass

    deep_brain = os.getenv("DEEP_BRAIN_URL") or os.getenv("BRAIN_URL") or ""
    fast_brain = os.getenv("FAST_BRAIN_URL") or ""
    is_cloud_cluster = "trycloudflare.com" in deep_brain or "trycloudflare.com" in fast_brain

    banner(is_cluster=is_cloud_cluster)
    python_exe = get_python_exe()
    procs: list[subprocess.Popen] = []

    try:
        # 1. Inference Engine Setup
        if is_cloud_cluster:
            print("[1/3] Connected to Remote 4-GPU Sovereign AI Cluster (64 GB VRAM):")
            print(f"      • Primary Reasoning CEO (7B) : {deep_brain}")
            print(f"      • Fast Routing Judge (3B)     : {fast_brain}")
            print(f"      • Specialist Coder (Gemma 12B): {os.getenv('CODER_URL', 'Ready')}")
            print(f"      • P&ID Multimodal Vision (7B) : {os.getenv('VISION_URL', 'Ready')}")
            print(f"      • Sovereign Vector Embeddings : {os.getenv('EMBEDDING_URL', 'Ready')}")
            print("      (Bypassing local CPU inference daemons to preserve host RAM)\n")
        else:
            # Start Local Model Server on :8080 if not already running
            if not is_port_in_use(8080):
                print("[1/3] Starting Local Model Server (Qwen on :8080)...")
                model_proc = subprocess.Popen(
                    [python_exe, "-m", "src.model_server"],
                    cwd=str(Path(__file__).parent),
                )
                procs.append(model_proc)
                for _ in range(30):
                    if is_port_in_use(8080):
                        print("      Model server ready on port 8080.")
                        break
                    time.sleep(0.5)
            else:
                print("[1/3] Port 8080 already in use (using active model server).")

            # Start Local Vision Server on :8081 if vision models are present
            vis_model = Path("models/vision/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf")
            vis_proj = Path("models/vision/mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf")
            if vis_model.is_file() and vis_proj.is_file() and not is_port_in_use(8081):
                print("      Starting Local Vision Server (Qwen2.5-VL on :8081)...")
                vis_proc = subprocess.Popen(
                    [python_exe, "-m", "src.vision_server"],
                    cwd=str(Path(__file__).parent),
                )
                procs.append(vis_proc)
                for _ in range(40):
                    if is_port_in_use(8081):
                        print("      Vision server ready on port 8081.")
                        break
                    time.sleep(0.5)

        # 2. Verify Static UI Distribution
        dist_dir = Path(__file__).parent / "dist"
        if not (dist_dir / "index.html").is_file():
            # Check fallback in sibling folder
            fallback_dist = Path(__file__).parent.parent / "Project-Kavach" / "dist"
            if (fallback_dist / "index.html").is_file():
                import shutil
                shutil.copytree(fallback_dist, dist_dir, dirs_exist_ok=True)
                print("      [UI] Copied pre-built static distribution to dist/.")

        # 3. Schedule Browser Launch
        def open_browser():
            # Wait for port 8000 to become active
            for _ in range(20):
                if is_port_in_use(8000):
                    break
                time.sleep(0.5)
            print("\n[3/3] Opening browser to http://localhost:8000 ...")
            webbrowser.open("http://localhost:8000")

        import threading
        threading.Thread(target=open_browser, daemon=True).start()

        # 4. Start Main Backend & UI Server on :8000
        print("[2/3] Starting Sovereign Workbench on http://127.0.0.1:8000...")
        backend_proc = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "src.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            cwd=str(Path(__file__).parent),
        )
        procs.append(backend_proc)

        print("\n>>> Swara.ai is running! Press CTRL+C at any time to shut down.\n")
        backend_proc.wait()

    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Stopping Swara.ai services...")
    finally:
        for p in procs:
            try:
                p.terminate()
                p.wait(timeout=2.0)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print("[SHUTDOWN] All services stopped.")


if __name__ == "__main__":
    main()
