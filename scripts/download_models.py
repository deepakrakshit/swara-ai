"""Model Downloader for Swara.ai.
Downloads quantized sovereign GGUF models directly from Hugging Face into their respective directories:
  1. CEO (Primary Reasoning):
     - Qwen3-1.7B-Q4_K_M.gguf (unsloth/Qwen3-1.7B-GGUF) -> models/ceo/
  2. Vision (Multimodal Model & OCR):
     - Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf (ggml-org/Qwen2.5-VL-3B-Instruct-GGUF) -> models/vision/
     - mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf (ggml-org/Qwen2.5-VL-3B-Instruct-GGUF) -> models/vision/
  3. Finalizer (Fast Output Polish):
     - Qwen3-0.6B-Q8_0.gguf (Qwen/Qwen3-0.6B-GGUF) -> models/finalizer/
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Dict, Any

MODELS: list[dict[str, Any]] = [
    {
        "role": "CEO (Primary Reasoning)",
        "repo_id": "unsloth/Qwen3-1.7B-GGUF",
        "filename": "Qwen3-1.7B-Q4_K_M.gguf",
        "target_dir": Path("models/ceo"),
        "expected_size_mb": 1056.1,
    },
    {
        "role": "Vision (Multimodal Model)",
        "repo_id": "ggml-org/Qwen2.5-VL-3B-Instruct-GGUF",
        "filename": "Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf",
        "target_dir": Path("models/vision"),
        "expected_size_mb": 1840.5,
    },
    {
        "role": "Vision Projector (mmproj)",
        "repo_id": "ggml-org/Qwen2.5-VL-3B-Instruct-GGUF",
        "filename": "mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf",
        "target_dir": Path("models/vision"),
        "expected_size_mb": 805.6,
    },
    {
        "role": "Finalizer (Fast Review & Polish)",
        "repo_id": "Qwen/Qwen3-0.6B-GGUF",
        "filename": "Qwen3-0.6B-Q8_0.gguf",
        "target_dir": Path("models/finalizer"),
        "expected_size_mb": 609.8,
    },
    {
        "role": "Embedding (Vector Semantic Search)",
        "repo_id": "nomic-ai/nomic-embed-text-v1.5-GGUF",
        "filename": "nomic-embed-text-v1.5.Q8_0.gguf",
        "target_dir": Path("models/embedding"),
        "expected_size_mb": 139.4,
    },
]


def download_file(repo_id: str, filename: str, target_dir: Path, role: str, expected_size_mb: float) -> bool:
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / filename
    temp_file = target_dir / f"{filename}.download"

    print(f"\n[{role}]")
    print(f"  Target: {target_file}")
    print(f"  Source: https://huggingface.co/{repo_id}/resolve/main/{filename}")

    # Check if already downloaded and verified
    if target_file.is_file():
        actual_size_mb = target_file.stat().st_size / (1024 * 1024)
        if abs(actual_size_mb - expected_size_mb) < 5.0 or actual_size_mb > expected_size_mb * 0.95:
            print(f"  => [ALREADY PRESENT & VERIFIED] Size: {actual_size_mb:.1f} MB. Skipping download.")
            return True

    # Try downloading via huggingface_hub first
    try:
        from huggingface_hub import hf_hub_download
        print(f"  => Downloading via huggingface_hub...")
        downloaded_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=str(target_dir),
            local_dir_use_symlinks=False,
        )
        print(f"  => [SUCCESS] Downloaded to {downloaded_path}")
        return True
    except Exception as hf_err:
        print(f"  Notice: huggingface_hub fallback ({hf_err}), downloading via direct stream...")

    # Fallback to streaming requests download with progress bar
    import requests
    from tqdm import tqdm

    url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Swara-Model-Downloader"}

    resume_pos = 0
    if temp_file.is_file():
        resume_pos = temp_file.stat().st_size
        if resume_pos > 0:
            headers["Range"] = f"bytes={resume_pos}-"
            print(f"  => Resuming from byte {resume_pos} ({resume_pos / (1024*1024):.1f} MB)...")

    resp = requests.get(url, headers=headers, stream=True, timeout=30.0)
    if resp.status_code not in (200, 206):
        print(f"  => [ERROR] HTTP status {resp.status_code}: {resp.text[:200]}")
        return False

    total_size = int(resp.headers.get("Content-Length", 0)) + (resume_pos if resp.status_code == 206 else 0)
    mode = "ab" if resp.status_code == 206 and resume_pos > 0 else "wb"

    with open(temp_file, mode) as f, tqdm(
        total=total_size,
        initial=resume_pos,
        unit="B",
        unit_scale=True,
        unit_divisor=1024,
        desc=filename[:28],
        ascii=True,
    ) as bar:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
                bar.update(len(chunk))

    # Rename temp to target
    if target_file.exists():
        target_file.unlink()
    temp_file.rename(target_file)
    print(f"  => [SUCCESS] Saved to {target_file}")
    return True


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("=" * 70)
    print("  Swara.ai -- Sovereign High-Performance Model Downloader")
    print("=" * 70)
    print("  Target Models:")
    for m in MODELS:
        print(f"    - {m['role']}: {m['filename']} (~{m['expected_size_mb']:.1f} MB)")
    print("=" * 70)

    successes = 0
    start_time = time.time()

    for m in MODELS:
        ok = download_file(
            repo_id=m["repo_id"],
            filename=m["filename"],
            target_dir=m["target_dir"],
            role=m["role"],
            expected_size_mb=m["expected_size_mb"],
        )
        if ok:
            successes += 1
        else:
            print(f"  => [FAILED] Could not download {m['filename']}. You can re-run this script to retry.")

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"  Download Summary: {successes}/{len(MODELS)} models ready ({elapsed:.1f}s)")
    print("=" * 70)


if __name__ == "__main__":
    main()
