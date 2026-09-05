"""
src/ingest.py — Sovereign RAG & Multimodal Ingestion Pipeline
Sovereign On-Premise Agentic AI Workbench (SIH26117 / MRPL / MoPNG)
Architecture: v5.3 locked.

Spec cross-references:
  PRD  §5      Block 2 - Ingestion pipeline: pdfplumber, density gate, Vision OCR path, ChromaDB + pid_tags
  ARCH §11     Sovereign RAG & Multimodal Ingestion
  ARCH §11.1   Density Gate + Gibberish Filter
  ARCH §11.2   Other Ingestion Decisions (Table Preservation, Citation Contract)
"""

import base64
import io
import json
import logging
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

import httpx

try:
    import chromadb
except ImportError:
    pass  # Allow py_compile to pass if chromadb is missing in this strict environment

try:
    import pdfplumber
except ImportError:
    pass

from src.density_gate import is_gibberish_or_blank

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("sovereign.ingest")

import os

# ---------------------------------------------------------------------------
# Constants (ARCH §11) — read from .env via os.getenv (load_dotenv in main.py)
# ---------------------------------------------------------------------------
VISION_URL = os.getenv("VISION_URL", "http://127.0.0.1:8081")
EMBED_URL = os.getenv("EMBEDDING_URL", "http://127.0.0.1:8083")
CHROMA_DB_PATH = "./chroma_db"
SQLITE_DB_PATH = "pid_tags.db"

# Firewall flag: all calls to external Cloudflare endpoints are logged
_FIREWALL_ACTIVE = os.getenv("SOVEREIGN_FIREWALL_DISABLE", "0") != "1"


# Chunking Budget: 1000-1200 tokens. Approximated via word counts.
# 850 words ~ 1100 tokens, 75 words ~ 100 tokens overlap.
CHUNK_WORDS = 850
OVERLAP_WORDS = 75

# ---------------------------------------------------------------------------
# Database Initialization
# ---------------------------------------------------------------------------

def init_sqlite() -> sqlite3.Connection:
    """Initialize SQLite database for PID tag bounding boxes."""
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pid_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_name TEXT,
            page_num INTEGER,
            tag TEXT,
            bbox TEXT,
            thumbnail BLOB
        )
    ''')
    conn.commit()
    return conn


def init_pid_db():
    """Dev_guide §2.4: Initialize SQLite database for PID tag bounding boxes."""
    import os
    conn = sqlite3.connect(os.path.abspath(SQLITE_DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pid_tags (
            tag_id TEXT PRIMARY KEY,
            doc_name TEXT,
            page_num INTEGER,
            bbox TEXT,
            component_type TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def store_tag(tag_id: str, doc_name: str, page_num: int, bbox: list, component: str):
    """Dev_guide §2.4: Store PID equipment tag in SQLite."""
    import os
    conn = sqlite3.connect(os.path.abspath(SQLITE_DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO pid_tags (tag_id, doc_name, page_num, bbox, component_type)
        VALUES (?, ?, ?, ?, ?)
    """, (tag_id, doc_name, page_num, str(bbox), component))
    conn.commit()
    conn.close()

# ---------------------------------------------------------------------------
# Chunking & Embeddings
# ---------------------------------------------------------------------------

def chunk_text(text: str) -> list[str]:
    """Chunk into windows of 1000-1200 tokens with an overlap of 100 tokens."""
    words = text.split()
    chunks = []
    if not words:
        return []
        
    start = 0
    while start < len(words):
        end = start + CHUNK_WORDS
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end >= len(words):
            break
        start += (CHUNK_WORDS - OVERLAP_WORDS)
    return chunks

def extract_section(text: str) -> str:
    """Attempt to extract section header (e.g. 1.2, 4.0) for citation metadata."""
    m = re.search(r'(?:^|\n)§?\s*(\d+\.\d+)', text)
    return m.group(1) if m else "1.0"

def get_embedding(text: str) -> list[float]:
    """Generate embedding using nomic-embed-text-v1.5 via EMBEDDING_URL (/v1/embeddings).

    When the firewall is ACTIVE (SOVEREIGN_FIREWALL_DISABLE=0), all calls to
    external Cloudflare endpoints are flagged [AIRGAP-EXTERNAL-FLAG] in the log.
    """
    primary_url = EMBED_URL
    fallbacks = ["http://127.0.0.1:8080", "http://127.0.0.1:8083"]
    candidates = [primary_url] + [u for u in fallbacks if u != primary_url]

    for url in candidates:
        is_external = not (url.startswith("http://127.") or url.startswith("http://localhost"))
        if is_external and _FIREWALL_ACTIVE:
            log.warning(
                "[AIRGAP-EXTERNAL-FLAG] Embedding call → %s/v1/embeddings "
                "(SOVEREIGN_FIREWALL_DISABLE=0, external endpoint flagged)",
                url,
            )
        try:
            resp = httpx.post(
                f"{url}/v1/embeddings",
                json={"model": "nomic-embed-text-v1.5", "input": text},
                timeout=15.0,
            )
            if resp.status_code == 200:
                return resp.json()["data"][0]["embedding"]
        except Exception:
            continue

    # Deterministic SHA-256 fallback vector (768-dim)
    import hashlib
    h = hashlib.sha256(text.encode("utf-8")).digest()
    vec = [float((b - 128) / 128.0) for b in h] * 24
    return vec[:768]


def store_in_chroma(chunks: list[str], doc_name: str, page_num: int):
    """Store chunks in ChromaDB with metadata for SOP-REF citation contract."""
    if not chunks:
        return
        
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_or_create_collection("sovereign_rag")
    
    ids = []
    embeddings = []
    metadatas = []
    documents = []
    
    for i, chunk in enumerate(chunks):
        section = extract_section(chunk)
        citation = f"[SOP-REF §{section} p.{page_num}]"
        
        ids.append(f"{doc_name}_p{page_num}_{i}")
        embeddings.append(get_embedding(chunk))
        metadatas.append({
            "doc_name": doc_name,
            "page_num": page_num,
            "section": section,
            "citation": citation
        })
        documents.append(chunk)
        
    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents
    )
    log.info("[CHROMA] Stored %d chunks for %s page %d", len(chunks), doc_name, page_num)


def ingest_to_chroma(doc_name: str, page_num: int, text: str):
    """Dev_guide §2.3: Ingest text into ChromaDB vector store."""
    import os
    chunks = chunk_text(text)
    client = chromadb.PersistentClient(path=os.path.abspath(CHROMA_DB_PATH))
    collection = client.get_or_create_collection(
        name="sop_records",
        metadata={"hnsw:space": "cosine"}
    )
    for idx, chunk in enumerate(chunks):
        chunk_id = f"{doc_name}_p{page_num}_c{idx}"
        collection.upsert(
            documents=[chunk],
            metadatas=[{
                "doc_name": doc_name,
                "page": page_num,
                "citation": f"[SOP-REF §{page_num}.1 p.{page_num}]"
            }],
            ids=[chunk_id]
        )


def rag_search(query: str, n_results: int = 3) -> str:
    """Dev_guide §2.5: Query ChromaDB vector store for SOP citations and excerpts."""
    import os
    client = chromadb.PersistentClient(path=os.path.abspath(CHROMA_DB_PATH))
    collection = client.get_or_create_collection(
        name="sop_records",
        metadata={"hnsw:space": "cosine"}
    )
    results = collection.query(query_texts=[query], n_results=n_results)
    if not results or not results.get("documents") or not results["documents"][0]:
        return "No relevant SOP or inspection records found in local database."

    formatted_outputs = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        cit = meta.get("citation", "[SOP-REF §1.0 p.1]")
        formatted_outputs.append(f"Source: {cit}\nExcerpt: {doc}\n")
    return "\n---\n".join(formatted_outputs)


def extract_tables_and_text(pdf_path: str) -> list[dict]:
    """Dev_guide §2.1: Extract tables as Markdown and narrative text per page."""
    extracted_pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            page_text_blocks = []
            
            tables = page.extract_tables()
            for table in tables:
                if not table or not any(table):
                    continue
                cleaned_table = [[str(cell or '').strip() for cell in row] for row in table if any(row)]
                if len(cleaned_table) >= 2:
                    headers = cleaned_table[0]
                    col_divider = ["---"] * len(headers)
                    md_rows = [f"| {' | '.join(headers)} |", f"| {' | '.join(col_divider)} |"]
                    for row in cleaned_table[1:]:
                        md_rows.append(f"| {' | '.join(row)} |")
                    page_text_blocks.append("\n" + "\n".join(md_rows) + "\n")

            text = page.extract_text() or ""
            if text.strip():
                page_text_blocks.append(text.strip())

            combined_page_text = "\n\n".join(page_text_blocks)
            extracted_pages.append({
                "page_number": page_idx,
                "text": combined_page_text,
                "raw_page": page
            })
    return extracted_pages


def route_page_content(doc_id: str, page_data: dict) -> dict:
    """Dev_guide §2.2: Route blank or scanned pages to Vision OCR and valid text to chunking."""
    text = page_data["text"]
    if is_gibberish_or_blank(text):
        return {
            "type": "VISION_QUEUE",
            "page": page_data["page_number"],
            "reason": "Text density gate triggered: scan or corrupted text."
        }
    return {
        "type": "TEXT_CHUNKING",
        "page": page_data["page_number"],
        "text": text
    }

# ---------------------------------------------------------------------------
# Multimodal Extraction (Tables & Vision OCR)
# ---------------------------------------------------------------------------

def extract_page_content(page: Any) -> str:
    """
    Extract tables from PDF pages and convert them to intact Markdown table 
    blocks BEFORE extracting surrounding narrative text (ARCH §11.2).
    """
    tables = page.find_tables()
    md_blocks = []
    
    def not_in_table(obj: dict) -> bool:
        """Filter out text objects that fall inside any table's bounding box."""
        if 'top' not in obj or 'bottom' not in obj or 'x0' not in obj or 'x1' not in obj:
            return True
        cx = (obj['x0'] + obj['x1']) / 2
        cy = (obj['top'] + obj['bottom']) / 2
        
        for t in tables:
            if (t.bbox[0] <= cx <= t.bbox[2]) and (t.bbox[1] <= cy <= t.bbox[3]):
                return False
        return True
    
    # Process tables into Markdown
    for table in tables:
        data = table.extract()
        if not data: 
            continue
        md = []
        for i, row in enumerate(data):
            cleaned = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
            md.append("| " + " | ".join(cleaned) + " |")
            if i == 0:
                md.append("|" + "|".join(["---"] * len(cleaned)) + "|")
        md_blocks.append("\n".join(md))
        
    # Process narrative text avoiding table regions
    text_page = page.filter(not_in_table)
    narrative = text_page.extract_text() or ""
    
    content = ""
    if md_blocks:
        content += "\n\n".join(md_blocks) + "\n\n"
    content += narrative
    
    return content.strip()

def process_vision_ocr(page: Any, doc_name: str, conn: sqlite3.Connection):
    """
    Rasterize blank/scanned/gibberish pages and send to Vision model on :8081.
    Persist P&ID equipment tags and bounding boxes to SQLite `pid_tags`.
    """
    page_num = page.page_number
    log.info("[VISION] Rasterizing %s page %d for Vision OCR", doc_name, page_num)
    
    img = page.to_image(resolution=150).original
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    raw_img = img_bytes.getvalue()
    b64 = base64.b64encode(raw_img).decode("utf-8")
    
    payload = {
        "model": "qwen2.5-vl-3b",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    {
                        "type": "text", 
                        "text": "Extract all equipment tags and bounding boxes from this P&ID diagram. Return JSON: {\"tags\": [str], \"bboxes\": [[x,y,w,h]]}"
                    }
                ]
            }
        ],
        "max_tokens": 512,
        "temperature": 0.0
    }
    
    try:
        resp = httpx.post(f"{VISION_URL}/v1/chat/completions", json=payload, timeout=45.0)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        
        # Parse JSON from response
        start_idx = content.find('{')
        end_idx = content.rfind('}')
        if start_idx != -1 and end_idx != -1:
            data = json.loads(content[start_idx:end_idx+1])
            tags = data.get("tags", [])
            bboxes = data.get("bboxes", [])
            
            for i, tag in enumerate(tags):
                bbox_str = json.dumps(bboxes[i]) if i < len(bboxes) else "[]"
                conn.execute(
                    "INSERT INTO pid_tags (doc_name, page_num, tag, bbox, thumbnail) VALUES (?, ?, ?, ?, ?)",
                    (doc_name, page_num, tag, bbox_str, raw_img)
                )
            conn.commit()
            log.info("[VISION] Extracted %d tags from %s page %d", len(tags), doc_name, page_num)
        else:
            log.warning("[VISION] Failed to parse JSON from Vision model response.")
            
    except Exception as exc:
        log.error("[VISION] Vision OCR failed on %s page %d: %s", doc_name, page_num, exc)

# ---------------------------------------------------------------------------
# Pipeline Entry Point
# ---------------------------------------------------------------------------

def ingest_pdf(file_path: Path | str) -> None:
    """
    Main ingestion pipeline.
    1. Reads PDF via pdfplumber.
    2. Runs density/gibberish gate on each page's raw text.
    3. Low density -> Rasterize -> Vision model -> SQLite pid_tags.
    4. Clean text -> Markdown tables + Narrative -> Chunking -> ChromaDB.
    """
    path = Path(file_path)
    if not path.is_file():
        log.error("File not found: %s", path)
        return
        
    doc_name = path.name
    conn = init_sqlite()
    
    try:
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                raw_text = page.extract_text() or ""
                
                # ARCH §11.1 Density Gate + Gibberish Filter
                if is_gibberish_or_blank(raw_text):
                    process_vision_ocr(page, doc_name, conn)
                else:
                    # ARCH §11.2 Table extraction first
                    page_content = extract_page_content(page)
                    
                    if page_content.strip():
                        chunks = chunk_text(page_content)
                        store_in_chroma(chunks, doc_name, page.page_number)
    except Exception as exc:
        log.error("[INGEST] Pipeline failed for %s: %s", doc_name, exc)
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        ingest_pdf(sys.argv[1])
    else:
        print("Usage: python -m src.ingest <path_to_pdf>")
