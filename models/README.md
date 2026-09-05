# Unit8 Local Models Directory

This directory stores quantized local GGUF models and local OCR/embedding weights for the sovereign on-premise agent runtime.

## Expected Directory Layout

```text
models/
├── ceo/
│   ├── Qwen3-1.7B-Instruct-Q4_K_M.gguf      (Primary CEO Orchestrator)
│   └── Qwen3-0.6B-Instruct-Q4_K_M.gguf      (Fallback small CEO)
├── finalizer/
│   └── Qwen3-0.6B-Instruct-Q4_K_M.gguf      (Response Finalizer)
├── vision/
│   ├── Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf   (Vision-Language Model)
│   └── mmproj-Qwen2.5-VL-3B-Instruct.gguf   (Vision Projector)
├── document/
│   └── paddleocr/                           (Local PaddleOCR weights)
└── embedding/
    └── bge-small-en-v1.5/                   (Local Sentence Transformers)
```

## Hardware Profile
* **Target GPU**: NVIDIA GeForce RTX 2050 (4 GB VRAM)
* **VRAM Allocation Budget**: Max 4096 MB resident across all tasks.
* **Lifecycle**: Models are dynamically loaded and unloaded on-demand by `backend.app.models.manager.ModelManager`. Inactive heavy models (e.g. Vision/OCR) are unloaded after execution to prevent Out-Of-Memory errors.
* **Fallback**: When model files are not yet present, Unit8 falls back to the deterministic local rule & template runtime so full pipeline tests and offline demos work out-of-the-box.
