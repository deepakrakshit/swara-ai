"""
tools/mock_llms.py — Unified Multi-Port Mock LLM Daemon
Sovereign On-Premise Agentic AI Workbench (SIH26117 / MRPL / MoPNG)
Architecture: v5.3 locked.

Simulates the four llama-server pool instances on an air-gapped dev node:
  Port 8080: Brain  — Qwen2.5-7B-Instruct (Planning, Reflection, L2 Routing)
  Port 8081: Vision — Qwen2.5-VL-3B (OCR, Equipment Tag & Bounding Box extraction)
  Port 8082: Coder  — Qwen2.5-Coder-3B (Engineering Python calculations)
  Port 8083: Embed  — nomic-embed-text-v1.5 (Vector Embeddings 768-dim)

Runs concurrently in a single event loop via asyncio.gather and uvicorn.Server.
"""

from __future__ import annotations

import asyncio
import json
import logging
import signal
import sys
from typing import Any, Dict, List, Union

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("sovereign.mock_llms")

# ---------------------------------------------------------------------------
# Subclass uvicorn.Server to disable per-instance signal handler installation,
# preventing handler collisions when 4 servers run in the same asyncio loop.
# ---------------------------------------------------------------------------
class StandaloneServer(uvicorn.Server):
    def install_signal_handlers(self) -> None:
        pass


# ===========================================================================
# 1. Port 8080 — Brain Service (Qwen2.5-7B-Instruct)
# ===========================================================================
app_8080 = FastAPI(title="Mock Brain (Qwen2.5-7B-Instruct)")


@app_8080.get("/health")
async def brain_health() -> Dict[str, str]:
    return {"status": "ok", "model": "Qwen2.5-7B-Instruct"}


@app_8080.post("/v1/chat/completions")
async def brain_chat(request: Request) -> Dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}

    messages = body.get("messages", [])
    prompt_tokens: List[str] = []
    for msg in messages:
        c = msg.get("content", "")
        if isinstance(c, str):
            prompt_tokens.append(c)
        elif isinstance(c, list):
            for item in c:
                if isinstance(item, dict) and "text" in item:
                    prompt_tokens.append(str(item["text"]))
    full_prompt = " ".join(prompt_tokens)

    # Condition 1: L2 routing check or classifier request
    if "L2_ROUTE_CHECK" in full_prompt or "routing classifier" in full_prompt.lower():
        content = json.dumps({
            "route": "coder",
            "confidence": 0.95,
            "trace": "L2 Brain-7B judged math intent",
        })
    # Condition 2: Planning request
    elif "decompose" in full_prompt.lower() or "numbered step list" in full_prompt.lower():
        content = (
            "Thought: Decomposing request into ReAct plan.\n"
            "Action: rag_search\n"
            'Action Input: {"query": "inspection SOP"}\n'
            "1. rag_search: retrieve SOP context [SOP-REF §3.2 p.14]\n"
            "2. sandbox_run: compute trend\n"
            "3. Finalize"
        )
    # Condition 3: Reflection request
    elif (
        "reflect" in full_prompt.lower()
        or "finalise" in full_prompt.lower()
        or "finalize" in full_prompt.lower()
    ):
        content = (
            "Thought: Verified calculation results and citations against [SOP-REF §3.2 p.14].\n"
            "FINALIZE [SOP-REF §3.2 p.14]"
        )
    # Default: Technical memo draft with valid citation for reflection gate
    else:
        content = (
            "MRPL Engineering Assessment Memo — Unit 200\n\n"
            "Executive Summary:\n"
            "In accordance with inspection standards [SOP-REF §3.2 p.14], ultrasonic "
            "thickness measurements indicate normal operational wear within allowable limits.\n"
            "Corrosion rates adhere to safety parameters established in [SOP-REF §3.2 p.14]."
        )

    return {
        "id": "chatcmpl-brain-mock",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "Qwen2.5-7B-Instruct",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 32,
            "completion_tokens": 64,
            "total_tokens": 96,
        },
    }


# ===========================================================================
# 2. Port 8081 — Vision Service (Qwen2.5-VL-3B)
# ===========================================================================
app_8081 = FastAPI(title="Mock Vision (Qwen2.5-VL-3B)")


@app_8081.get("/health")
async def vision_health() -> Dict[str, str]:
    return {"status": "ok", "model": "Qwen2.5-VL-3B"}


@app_8081.post("/v1/chat/completions")
async def vision_chat(request: Request) -> Dict[str, Any]:
    content = json.dumps({
        "tags": [
            {"tag": "FV-101", "bbox": [120, 340, 200, 410], "confidence": 0.98},
            {"tag": "P-201A", "bbox": [450, 180, 520, 260], "confidence": 0.95},
        ]
    })

    return {
        "id": "chatcmpl-vision-mock",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "Qwen2.5-VL-3B",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 64,
            "completion_tokens": 32,
            "total_tokens": 96,
        },
    }


# ===========================================================================
# 3. Port 8082 — Coder Service (Qwen2.5-Coder-3B)
# ===========================================================================
app_8082 = FastAPI(title="Mock Coder (Qwen2.5-Coder-3B)")


@app_8082.get("/health")
async def coder_health() -> Dict[str, str]:
    return {"status": "ok", "model": "Qwen2.5-Coder-3B"}


@app_8082.post("/v1/chat/completions")
async def coder_chat(request: Request) -> Dict[str, Any]:
    content = (
        "import pandas as pd\n"
        "import matplotlib.pyplot as plt\n"
        "print('DATA_PROCESSED_SUCCESS')\n"
    )

    return {
        "id": "chatcmpl-coder-mock",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "Qwen2.5-Coder-3B",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 16,
            "completion_tokens": 24,
            "total_tokens": 40,
        },
    }


# ===========================================================================
# 4. Port 8083 — Embedding Service (nomic-embed-text-v1.5)
# ===========================================================================
app_8083 = FastAPI(title="Mock Embed (nomic-embed-text-v1.5)")


@app_8083.get("/health")
async def embed_health() -> Dict[str, str]:
    return {"status": "ok", "model": "nomic-embed-text-v1.5"}


@app_8083.post("/v1/embeddings")
async def embed_create(request: Request) -> Dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}

    raw_input = body.get("input", "")
    if isinstance(raw_input, list):
        inputs = raw_input
    elif isinstance(raw_input, str):
        inputs = [raw_input]
    else:
        inputs = [str(raw_input)]

    # 768-dimensional float embedding vector for nomic-embed-text-v1.5
    dummy_vector = [0.01] * 768
    data = [
        {
            "object": "embedding",
            "index": idx,
            "embedding": dummy_vector,
        }
        for idx in range(len(inputs))
    ]

    return {
        "object": "list",
        "data": data,
        "model": "nomic-embed-text-v1.5",
        "usage": {
            "prompt_tokens": 8 * len(inputs),
            "total_tokens": 8 * len(inputs),
        },
    }


# ===========================================================================
# Concurrency Architecture: Multi-Port Launcher
# ===========================================================================
async def run_servers() -> None:
    """Launch all four mock servers concurrently on ports 8080-8083."""
    configs = [
        (app_8080, 8080),
        (app_8081, 8081),
        (app_8082, 8082),
        (app_8083, 8083),
    ]

    servers: List[StandaloneServer] = [
        StandaloneServer(
            uvicorn.Config(
                app=app,
                host="127.0.0.1",
                port=port,
                log_level="warning",
                access_log=False,
            )
        )
        for app, port in configs
    ]

    def trigger_shutdown(*args: Any) -> None:
        log.info("Received shutdown signal. Stopping all mock servers...")
        for s in servers:
            s.should_exit = True

    # Register OS signal handlers for clean teardown
    if sys.platform == "win32":
        try:
            signal.signal(signal.SIGINT, trigger_shutdown)
            signal.signal(signal.SIGTERM, trigger_shutdown)
        except Exception:
            pass
    else:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, trigger_shutdown)
            except (NotImplementedError, RuntimeError):
                pass

    # Root CLI verification banner (required verbatim)
    print("[SOVEREIGN MOCK] Brain:8080 | Vision:8081 | Coder:8082 | Embed:8083 LIVE")
    sys.stdout.flush()

    tasks = [asyncio.create_task(server.serve()) for server in servers]
    try:
        await asyncio.gather(*tasks)
    except (asyncio.CancelledError, KeyboardInterrupt):
        trigger_shutdown()
        await asyncio.gather(*tasks, return_exceptions=True)
    finally:
        for s in servers:
            s.should_exit = True


def main() -> None:
    try:
        asyncio.run(run_servers())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
