#!/usr/bin/env python3
"""
tools/check_tunnels.py — Cloudflare Tunnel & Remote GPU Verification Utility
Swara.ai Sovereign Industrial AI Workbench (SIH26117 / MRPL / MoPNG)

Probes all 5 specialist model inference daemons over Cloudflare tunnels,
measures roundtrip latency in ms, and verifies /v1/models reachability.
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

import httpx

# ANSI Color Codes
RESET   = "\033[0m"
BOLD    = "\033[1m"
GREEN   = "\033[32m"
RED     = "\033[31m"
YELLOW  = "\033[33m"
CYAN    = "\033[36m"
MAGENTA = "\033[35m"
DIM     = "\033[2m"

MODELS_SPEC = [
    {
        "key": "deep_brain",
        "role": "Primary Reasoning / CEO",
        "model": "Qwen2.5-7B-Instruct",
        "env_var": "DEEP_BRAIN_URL",
        "fallback": "https://sims-pitch-dates-odds.trycloudflare.com",
    },
    {
        "key": "fast_brain",
        "role": "Fast Routing Judge (<1500ms)",
        "model": "Qwen2.5-3B-Instruct",
        "env_var": "FAST_BRAIN_URL",
        "fallback": "https://capture-elevation-bidder-skills.trycloudflare.com",
    },
    {
        "key": "coder",
        "role": "Deterministic Calculation & Specialist Coder",
        "model": "Gemma-3-12B-IT",
        "env_var": "CODER_URL",
        "fallback": "https://nuclear-breeding-busy-citizens.trycloudflare.com",
    },
    {
        "key": "vision",
        "role": "P&ID Tag OCR & Multimodal",
        "model": "Qwen2.5-VL-7B-Instruct",
        "env_var": "VISION_URL",
        "fallback": "https://distinct-simply-preference-facilitate.trycloudflare.com",
    },
    {
        "key": "embedding",
        "role": "Sovereign RAG Embeddings",
        "model": "nomic-embed-text-v1.5",
        "env_var": "EMBEDDING_URL",
        "fallback": "https://remain-flow-with-submission.trycloudflare.com",
    },
]


async def probe_endpoint(client: httpx.AsyncClient, item: dict) -> dict:
    url = os.getenv(item["env_var"]) or item["fallback"]
    probe_target = f"{url.rstrip('/')}/v1/models"
    t0 = time.perf_counter()
    try:
        resp = await client.get(probe_target, timeout=4.0)
        latency_ms = (time.perf_counter() - t0) * 1000.0
        reachable = resp.status_code in (200, 401, 403, 404)
        return {
            **item,
            "url": url,
            "status_code": resp.status_code,
            "latency_ms": latency_ms,
            "reachable": reachable,
            "error": None,
        }
    except Exception as exc:
        latency_ms = (time.perf_counter() - t0) * 1000.0
        return {
            **item,
            "url": url,
            "status_code": None,
            "latency_ms": latency_ms,
            "reachable": False,
            "error": type(exc).__name__,
        }


if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

async def main_async():
    print(f"\n{BOLD}{CYAN}======================================================================{RESET}")
    print(f"{BOLD}{CYAN}      SWARA.AI — CLOUDFLARE INFERENCE TUNNEL HEALTH VERIFIER          {RESET}")
    print(f"{BOLD}{CYAN}======================================================================{RESET}")
    print(f"{DIM}Root: {ROOT_DIR}{RESET}")
    print(f"{DIM}Scanning remote Kaggle GPU specialist endpoints (/v1/models)...{RESET}\n")

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[probe_endpoint(client, item) for item in MODELS_SPEC])

    # Table Header
    print(f"{BOLD}{'ROLE':<28} {'MODEL':<24} {'STATUS':<16} {'LATENCY':<12} {'ENDPOINT URL'}{RESET}")
    print(f"{DIM}{'-' * 100}{RESET}")

    all_online = True
    for res in results:
        role = res["role"]
        model = res["model"]
        url = res["url"]
        lat = f"{res['latency_ms']:.1f} ms"

        if res["reachable"]:
            status = f"{GREEN}[ONLINE]{RESET}"
        else:
            status = f"{RED}[UNREACHABLE]{RESET}"
            all_online = False

        print(f"{role:<28} {model:<24} {status:<25} {lat:<12} {DIM}{url}{RESET}")

    print(f"{DIM}{'-' * 100}{RESET}\n")

    if all_online:
        print(f"{GREEN}{BOLD}✓ ALL 5 SPECIALIST ENDPOINTS ARE ONLINE AND REACHABLE!{RESET}")
        print(f"{GREEN}The Swara.ai workbench has full remote GPU inference capabilities.{RESET}\n")
        return 0
    else:
        print(f"{YELLOW}{BOLD}⚠️  ATTENTION: ONE OR MORE REMOTE INFERENCE ENDPOINTS ARE UNREACHABLE{RESET}")
        print(f"{YELLOW}Cloudflare tunnels from Kaggle may have expired or notebook sessions halted.{RESET}")
        print(f"\n{BOLD}Recommended Recovery Steps:{RESET}")
        print(f"  1. Log into your Kaggle account and open the Swara.ai notebook.")
        print(f"  2. Click {BOLD}'Run All'{RESET} or restart the cloudflared daemon cell.")
        print(f"  3. Copy the newly generated {CYAN}*.trycloudflare.com{RESET} URLs.")
        print(f"  4. Update {BOLD}.env{RESET} in the project root with the new URLs:")
        print(f"     DEEP_BRAIN_URL=https://<new-url>.trycloudflare.com")
        print(f"     FAST_BRAIN_URL=https://<new-url>.trycloudflare.com")
        print(f"     CODER_URL=https://<new-url>.trycloudflare.com")
        print(f"     VISION_URL=https://<new-url>.trycloudflare.com")
        print(f"     EMBEDDING_URL=https://<new-url>.trycloudflare.com")
        print(f"  5. Re-run this check: {BOLD}python tools/check_tunnels.py{RESET}\n")
        return 1


def main():
    try:
        code = asyncio.run(main_async())
        sys.exit(code)
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(130)


if __name__ == "__main__":
    main()
