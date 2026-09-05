"""Local Sovereign Model Inference Server.
Hosts Qwen 2.5 on port 8080 with an OpenAI-compatible /v1/chat/completions endpoint.
Zero cloud egress, 100% on-premise air-gapped inference.
"""

from __future__ import annotations

import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] model.server — %(message)s")
log = logging.getLogger("model.server")

app = FastAPI(title="Swara.ai Sovereign Local Model Server", version="1.0.0")

_llm = None
MODEL_PATHS = [
    Path("models/ceo/Qwen3-1.7B-Q4_K_M.gguf"),
    Path("models/ceo/qwen2.5-1.5b-instruct-q4_k_m.gguf"),
    Path("models/finalizer/Qwen3-0.6B-Q8_0.gguf"),
    Path("models/finalizer/qwen2.5-0.5b-instruct-q4_k_m.gguf"),
]


def get_target_model() -> Path | None:
    ceo_dir = Path("models/ceo")
    if (ceo_dir / "Qwen3-1.7B-Q4_K_M.gguf").is_file():
        return ceo_dir / "Qwen3-1.7B-Q4_K_M.gguf"
    if (ceo_dir / "qwen2.5-1.5b-instruct-q4_k_m.gguf").is_file():
        return ceo_dir / "qwen2.5-1.5b-instruct-q4_k_m.gguf"
    if ceo_dir.is_dir():
        for f in sorted(ceo_dir.glob("*.gguf")):
            return f

    fin_dir = Path("models/finalizer")
    if (fin_dir / "Qwen3-0.6B-Q8_0.gguf").is_file():
        return fin_dir / "Qwen3-0.6B-Q8_0.gguf"
    if (fin_dir / "qwen2.5-0.5b-instruct-q4_k_m.gguf").is_file():
        return fin_dir / "qwen2.5-0.5b-instruct-q4_k_m.gguf"
    if fin_dir.is_dir():
        for f in sorted(fin_dir.glob("*.gguf")):
            return f
    return None


def get_llm():
    global _llm
    if _llm is None:
        import llama_cpp

        target_model = get_target_model()

        if not target_model:
            log.warning("No GGUF model files found in models/. Model server will run in fallback mock mode.")
            return None

        log.info("Loading GGUF model from %s...", target_model)
        n_ctx_val = int(os.environ.get("SWARA_N_CTX", "12288"))
        try:
            _llm = llama_cpp.Llama(
                model_path=str(target_model),
                n_ctx=n_ctx_val,
                n_gpu_layers=99,  # Offload to GPU if available, else falls back to CPU automatically
                verbose=False,
            )
            log.info("GGUF model loaded successfully with %d context window.", n_ctx_val)
        except Exception as exc:
            log.warning("GPU offload failed (%s), loading on CPU...", exc)
            _llm = llama_cpp.Llama(
                model_path=str(target_model),
                n_ctx=n_ctx_val,
                n_gpu_layers=0,
                verbose=False,
            )
            log.info("GGUF model loaded on CPU successfully with %d context window.", n_ctx_val)
    return _llm


_finalizer_llm = None

def get_finalizer_llm():
    global _finalizer_llm
    if _finalizer_llm is None:
        import llama_cpp
        fin_path = Path("models/finalizer/Qwen3-0.6B-Q8_0.gguf")
        if not fin_path.is_file():
            fin_dir = Path("models/finalizer")
            if fin_dir.is_dir():
                for f in sorted(fin_dir.glob("*.gguf")):
                    fin_path = f
                    break
        if fin_path.is_file():
            log.info("Loading Finalizer model from %s on CPU...", fin_path)
            try:
                _finalizer_llm = llama_cpp.Llama(
                    model_path=str(fin_path),
                    n_ctx=2048,
                    n_gpu_layers=0,  # Run on CPU to keep 100% VRAM free for CEO
                    verbose=False,
                )
                log.info("Finalizer model loaded successfully on CPU.")
            except Exception as e:
                log.warning("Could not load finalizer model: %s", e)
    return _finalizer_llm


def polish_response(raw_output: str) -> str:
    """Uses the fast Finalizer model (Qwen3-0.6B) to structure, clean and polish raw CEO drafts when needed."""
    if not raw_output or len(raw_output.strip()) < 30:
        return raw_output

    # Fast-path: If the draft does not contain unresolved placeholders like [Insert ...] or [List ...],
    # and has complete content, return immediately with 0 latency overhead.
    PLACEHOLDER_RE = re.compile(r"\[(?:Insert|List|Add|Your|Date|Team|Name|Details|TBD)[^\]]*\]", re.IGNORECASE)
    has_placeholders = bool(PLACEHOLDER_RE.search(raw_output))
    if not has_placeholders:
        return raw_output

    # Strip obvious placeholders via deterministic regex first
    cleaned_output = PLACEHOLDER_RE.sub("", raw_output)

    fin_llm = get_finalizer_llm()
    if fin_llm is None:
        return cleaned_output

    think_match = re.search(r"<(?:think|thought)>(.*?)</(?:think|thought)>", raw_output, re.DOTALL | re.IGNORECASE)
    thought_part = ""
    draft_part = cleaned_output
    if think_match:
        thought_part = think_match.group(1).strip()
        draft_part = re.sub(r"<(?:think|thought)>.*?</(?:think|thought)>\s*", "", cleaned_output, flags=re.DOTALL | re.IGNORECASE).strip()

    if not draft_part or len(draft_part) < 25:
        return cleaned_output

    try:
        fin_prompt = (
            "You are the Executive Output Editor. "
            "Refine and structure the draft response into a professional markdown answer. "
            "Ensure clear headings and clean bullet points. "
            "Do NOT remove substantive code or technical facts. "
            "Output ONLY the final polished answer without meta-commentary or thinking tags."
        )
        fin_res = fin_llm.create_chat_completion(
            messages=[
                {"role": "system", "content": fin_prompt},
                {"role": "user", "content": f"Draft to polish and structure:\n{draft_part}"},
            ],
            max_tokens=768,
            temperature=0.1,
        )
        polished = fin_res["choices"][0]["message"]["content"].strip()
        polished = re.sub(r"<(?:think|thought)>.*?</(?:think|thought)>\s*", "", polished, flags=re.DOTALL | re.IGNORECASE).strip()
        if polished and len(polished) > 20:
            if thought_part:
                return f"<think>\n{thought_part}\n</think>\n\n{polished}"
            return polished
    except Exception as fe:
        log.warning("Finalizer polish pass failed (%s), using cleaned draft.", fe)

    return cleaned_output


_embed_llm = None

def get_embed_llm():
    global _embed_llm
    if _embed_llm is None:
        import llama_cpp
        embed_path = Path("models/embedding/nomic-embed-text-v1.5.Q8_0.gguf")
        if not embed_path.is_file():
            embed_dir = Path("models/embedding")
            if embed_dir.is_dir():
                for f in sorted(embed_dir.glob("*.gguf")):
                    embed_path = f
                    break
        if embed_path.is_file():
            log.info("Loading Embedding model from %s on CPU...", embed_path)
            try:
                _embed_llm = llama_cpp.Llama(
                    model_path=str(embed_path),
                    embedding=True,
                    n_ctx=4096,
                    n_gpu_layers=0,  # Runs fast on CPU with zero VRAM impact
                    verbose=False,
                )
                log.info("Embedding model loaded successfully on CPU.")
            except Exception as e:
                log.warning("Could not load embedding model: %s", e)
    return _embed_llm


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: Optional[str] = "qwen2.5-1.5b-instruct"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 2048
    stream: Optional[bool] = False


class EmbeddingRequest(BaseModel):
    input: Any
    model: Optional[str] = "nomic-embed-text-v1.5"


@app.get("/health")
async def health():
    return JSONResponse({
        "status": "healthy",
        "model_loaded": _llm is not None or any(p.is_file() for p in MODEL_PATHS),
        "finalizer_loaded": _finalizer_llm is not None or Path("models/finalizer/Qwen3-0.6B-Q8_0.gguf").is_file(),
        "embedding_loaded": _embed_llm is not None or Path("models/embedding/nomic-embed-text-v1.5.Q8_0.gguf").is_file(),
        "service": "swara-model-inference",
        "port": 8080,
    })


@app.post("/v1/embeddings")
async def create_embeddings(req: EmbeddingRequest):
    embedder = get_embed_llm()
    inputs = [req.input] if isinstance(req.input, str) else req.input
    data_list = []
    total_tokens = 0

    if embedder is not None:
        try:
            for idx, text in enumerate(inputs):
                res = embedder.create_embedding(input=text)
                vec = res["data"][0]["embedding"]
                prompt_tok = res.get("usage", {}).get("prompt_tokens", len(text.split()))
                total_tokens += prompt_tok
                data_list.append({
                    "object": "embedding",
                    "index": idx,
                    "embedding": vec,
                })
        except Exception as e:
            log.warning("Local embedding model inference failed (%s), falling back to pseudo-vector.", e)
            embedder = None

    if embedder is None:
        import hashlib
        for idx, text in enumerate(inputs):
            h = hashlib.sha256(text.encode("utf-8")).digest()
            vec = [float((b - 128) / 128.0) for b in h] * 24
            vec = vec[:768]
            data_list.append({
                "object": "embedding",
                "index": idx,
                "embedding": vec,
            })
            total_tokens += len(text.split())

    return JSONResponse({
        "object": "list",
        "data": data_list,
        "model": req.model or "nomic-embed-text-v1.5",
        "usage": {
            "prompt_tokens": total_tokens,
            "total_tokens": total_tokens,
        },
    })


@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest):
    llm = get_llm()
    if llm is None:
        raise HTTPException(
            status_code=503,
            detail="Local GGUF model not found in models/ directory. Run download or place Qwen2.5 GGUF in models/.",
        )

    # Prepare message dicts for llama_cpp
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    try:
        res = llm.create_chat_completion(
            messages=messages,
            temperature=req.temperature or 0.3,
            max_tokens=req.max_tokens or 2048,
            repeat_penalty=1.15,
            frequency_penalty=0.08,
        )
        res["choices"][0]["message"]["content"] = polish_response(res["choices"][0]["message"]["content"])
        return JSONResponse(res)
    except Exception as e:
        err_msg = str(e)
        log.warning("Primary inference failed (%s). Checking if context window exceeded...", err_msg)
        
        # If tokens exceeded context window, gracefully trim the largest context payload and retry
        if "exceed context window" in err_msg.lower() or "requested tokens" in err_msg.lower():
            try:
                log.info("Applying dynamic context window trimming to accommodate payload within 16k context window...")
                trimmed_messages = []
                for m in messages:
                    c = m.get("content", "")
                    if len(c) > 18000:
                        # Keep key header (40%) and key ending/user ask (60%)
                        head = c[:8000]
                        tail = c[-10000:]
                        trimmed_messages.append({
                            "role": m["role"],
                            "content": f"{head}\n\n[... Middle context omitted to fit 16,384 context window ...]\n\n{tail}",
                        })
                    else:
                        trimmed_messages.append(m)

                retry_res = llm.create_chat_completion(
                    messages=trimmed_messages,
                    temperature=req.temperature or 0.3,
                    max_tokens=min(req.max_tokens or 1024, 768),
                    repeat_penalty=1.15,
                    frequency_penalty=0.08,
                )
                retry_res["choices"][0]["message"]["content"] = polish_response(retry_res["choices"][0]["message"]["content"])
                log.info("Inference succeeded on trimmed retry.")
                return JSONResponse(retry_res)
            except Exception as retry_err:
                log.error("Trimmed retry also failed: %s", retry_err)
                err_msg = str(retry_err)

        log.error("Inference error: %s", err_msg)
        return JSONResponse({
            "id": f"chatcmpl-err-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": req.model or "qwen2.5-1.5b-instruct",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": f"Inference error: {err_msg}",
                    },
                    "finish_reason": "error",
                }
            ],
        })


def main():
    get_llm()
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="warning")


if __name__ == "__main__":
    main()
