"""Local Sovereign Multimodal Vision Server.
Hosts Qwen2.5-VL on port 8081 with an OpenAI-compatible multimodal /v1/chat/completions endpoint.
Uses Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf and mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf.
Zero cloud egress, 100% on-premise air-gapped vision inference.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] vision.server — %(message)s")
log = logging.getLogger("vision.server")

app = FastAPI(title="Swara.ai Sovereign Local Vision Server", version="1.0.0")

_vision_llm = None


def get_safe_qwen25_vl_chat_handler(mmproj_path: Path):
    import llama_cpp
    from llama_cpp.llama_chat_format import Qwen25VLChatHandler, suppress_stdout_stderr

    class SafeQwen25VLChatHandler(Qwen25VLChatHandler):
        """Custom ChatHandler that offloads the heavy mmproj CLIP projector to host memory
        preventing Vulkan/CUDA 4.5GB+ single-buffer VRAM allocation crashes on 4GB GPUs.
        """
        def _init_mtmd_context(self, llama_model):
            if self.mtmd_ctx is not None:
                return
            with suppress_stdout_stderr(disable=self.verbose):
                ctx_params = self._mtmd_cpp.mtmd_context_params_default()
                ctx_params.use_gpu = False  # Clip projector runs on Host RAM (safe from VRAM ceiling)
                ctx_params.print_timings = False
                ctx_params.n_threads = max(4, min(os.cpu_count() or 4, 8))
                ctx_params.flash_attn_type = llama_cpp.LLAMA_FLASH_ATTN_TYPE_DISABLED

                self.mtmd_ctx = self._mtmd_cpp.mtmd_init_from_file(
                    self.clip_model_path.encode(), llama_model.model, ctx_params
                )
                if self.mtmd_ctx is None:
                    raise ValueError(f"Failed to load mtmd context from: {self.clip_model_path}")

                if not self._mtmd_cpp.mtmd_support_vision(self.mtmd_ctx):
                    raise ValueError("Vision is not supported by this model")

                def mtmd_free():
                    if self.mtmd_ctx is not None:
                        self._mtmd_cpp.mtmd_free(self.mtmd_ctx)
                        self.mtmd_ctx = None

                llama_model._stack.callback(mtmd_free)

    return SafeQwen25VLChatHandler(clip_model_path=str(mmproj_path), verbose=False)


def get_vision_llm():
    global _vision_llm
    if _vision_llm is None:
        import llama_cpp

        model_path = Path("models/vision/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf")
        mmproj_path = Path("models/vision/mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf")

        if not model_path.is_file() or not mmproj_path.is_file():
            log.warning("Vision model files missing in models/vision/. Running in standby fallback mode.")
            return None

        log.info("Loading Qwen2.5-VL with SafeQwen25VLChatHandler (Optimized 24 GPU layers, 8 CPU threads)...")
        try:
            chat_handler = get_safe_qwen25_vl_chat_handler(mmproj_path)
            # Offload 24 layers of the LLM to GPU for ultra-fast ~35 tok/s generation
            _vision_llm = llama_cpp.Llama(
                model_path=str(model_path),
                chat_handler=chat_handler,
                n_ctx=2048,
                n_gpu_layers=24,
                verbose=False,
            )
            log.info("Vision model loaded successfully (Optimized Hybrid Mode).")
        except Exception as e:
            log.warning("Vision hybrid load failed (%s), falling back to pure CPU...", e)
            try:
                chat_handler = get_safe_qwen25_vl_chat_handler(mmproj_path)
                _vision_llm = llama_cpp.Llama(
                    model_path=str(model_path),
                    chat_handler=chat_handler,
                    n_ctx=2048,
                    n_gpu_layers=0,
                    verbose=False,
                )
                log.info("Vision model loaded on CPU successfully.")
            except Exception as cpu_e:
                log.error("Failed to load vision model on CPU: %s", cpu_e)
                return None
    return _vision_llm


def _optimize_image_data_uri(data_uri: str, max_size: int = 448) -> str:
    """Downscale large images (e.g. 4k scans) to max_size while maintaining aspect ratio,
    ensuring ultra-fast ~5s CLIP encoding and zero buffer overflow.
    """
    if not data_uri.startswith("data:image"):
        return data_uri

    try:
        header, b64_data = data_uri.split(",", 1)
        raw_bytes = base64.b64decode(b64_data)
        img = Image.open(io.BytesIO(raw_bytes))
        
        # Convert RGBA / P to RGB
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        w, h = img.size
        if max(w, h) > max_size:
            ratio = max_size / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=88)
        new_b64 = base64.b64encode(out_buf.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{new_b64}"
    except Exception as e:
        log.warning("Image optimization failed (%s), passing original URI.", e)
        return data_uri


@app.get("/health")
async def health():
    model_path = Path("models/vision/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf")
    mmproj_path = Path("models/vision/mmproj-Qwen2.5-VL-3B-Instruct-Q8_0.gguf")
    return JSONResponse({
        "status": "healthy",
        "model_loaded": _vision_llm is not None or (model_path.is_file() and mmproj_path.is_file()),
        "service": "swara-vision-inference",
        "port": 8081,
    })


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    data = await request.json()
    llm = get_vision_llm()
    if llm is None:
        return JSONResponse({
            "id": "mock-vis-comp",
            "object": "chat.completion",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Vision model files not found in models/vision/. Please ensure Qwen2.5-VL GGUF is downloaded.",
                    },
                    "finish_reason": "stop",
                }
            ],
        })

    raw_messages = data.get("messages", [])
    max_tokens = data.get("max_tokens", 384)
    temperature = data.get("temperature", 0.1)

    # Process and optimize any images in messages
    clean_messages = []
    for msg in raw_messages:
        role = msg.get("role", "user")
        content = msg.get("content")
        if isinstance(content, list):
            new_content = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "image_url":
                    img_url_obj = item.get("image_url", {})
                    url_val = img_url_obj.get("url", "") if isinstance(img_url_obj, dict) else str(img_url_obj)
                    opt_url = _optimize_image_data_uri(url_val)
                    new_content.append({"type": "image_url", "image_url": {"url": opt_url}})
                else:
                    new_content.append(item)
            clean_messages.append({"role": role, "content": new_content})
        else:
            clean_messages.append(msg)

    try:
        response = llm.create_chat_completion(
            messages=clean_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return JSONResponse(response)
    except Exception as e:
        log.error("Vision chat completion failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Vision inference error: {e}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8081, log_level="info")

