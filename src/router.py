"""
src/router.py — Intelligent 3-Layer Request Router
Swara.ai Orchestrator (SIH26117 / MRPL / MoPNG)

Layer architecture (PRD §5.1 / ARCH §8):
  L1  Deterministic fast-path   < 5 ms    — MIME / filename / regex rules
  L2  Fast-Brain judge          < 1500 ms — Cloudflare Fast-Brain JSON classifier
  L3  Manual override           instant   — model_override != "auto" bypasses L1+L2

AIRGAP Note: All L2 calls to the Cloudflare Fast-Brain endpoint are flagged with
[AIRGAP-EXTERNAL-FLAG] in the log because SOVEREIGN_FIREWALL_DISABLE=0.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Optional

import httpx

log = logging.getLogger("sovereign.router")

# ---------------------------------------------------------------------------
# L1 — Deterministic regex for deliverables and math/calculation intent
# ---------------------------------------------------------------------------
DELIVERABLE_CREATION_RE = re.compile(
    r"\b(create|generate|draft|export|build|render|make|produce|write|compile)\b.*"
    r"\b(memo|report|deliverable|pdf|docx|xlsx|pptx|excel|word|presentation|slides|deck|document|spreadsheet|workbook)\b",
    re.I,
)

EXPLICIT_FORMAT_RE = re.compile(
    r"\b(in|as|to|into)\s+(pdf|docx|xlsx|pptx|excel|word|powerpoint)\b|"
    r"\b\d+-page\s+(pdf|report|memo|document)\b|"
    r"\b(formal\s+memo|formal\s+report|executive\s+deck|briefing\s+deck)\b",
    re.I,
)

DO_NOT_DOC_RE = re.compile(
    r"\b(not\s+create|don'?t\s+create|not\s+generate|don'?t\s+generate|just\s+analyze|only\s+analyze|no\s+doc|not\s+another\s+doc)\b",
    re.I,
)

DELIVERABLE_RE = DELIVERABLE_CREATION_RE


def has_explicit_deliverable_intent(prompt: str) -> bool:
    """
    Returns True ONLY when the user explicitly requests generating or exporting
    a new document deliverable file (PDF, DOCX, XLSX, PPTX, formal memo/report).

    If the user asks to analyze, examine, explain, or review without asking
    to create/export a file, returns False so the agent provides an analytical
    conversational response directly in chat without writing files to disk.
    """
    if not prompt:
        return False
    if DO_NOT_DOC_RE.search(prompt):
        return False
    if DELIVERABLE_CREATION_RE.search(prompt) or EXPLICIT_FORMAT_RE.search(prompt):
        return True
    return False

CALC_RE = re.compile(
    r"\b(calculate|compute|compute\s+the|trend|fouling|rate|delta|pressure\s+drop|"
    r"correlation|NPSHa|NPSHr|fouling\s+factor|darcy|weisbach|friction|efficiency|"
    r"standard\s+deviation|confidence\s+interval|python|sensor\s+logs)\b",
    re.I,
)

_IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tiff", ".svg", ".gif")
_SHEET_EXTS = (".xlsx", ".csv")

# L2 endpoint — reads from env at call time (allows runtime override)
def _fast_brain_url() -> str:
    return os.getenv("FAST_BRAIN_URL") or "https://capture-elevation-bidder-skills.trycloudflare.com"


def route_l1(
    mimes: Any = None,
    names: Any = None,
    prompt: str = "",
    page_outcome: str = "",
    **kwargs: Any,
) -> tuple[Optional[str], str]:
    """
    Deterministic fast-path (< 5 ms).  Returns (specialist | None, trace).
    None → escalate to L2.

    Rules (evaluated in priority order):
      1. Explicit deliverable creation intent (draft/generate/export file) → agent_workflow (Deep Brain)
      2. Any image MIME or image file extension  → vision
      3. Any .xlsx / .csv file                   → coder
      4. Prompt matches isolated math/calculation regex → coder
      5. Page density outcome is blank/scanned   → vision (OCR)
    """
    effective_prompt = prompt
    effective_names = names if isinstance(names, list) else []
    effective_mimes = mimes if isinstance(mimes, list) else []

    if isinstance(mimes, str) and not prompt:
        effective_prompt = mimes
        if isinstance(names, list):
            effective_names = names
        effective_mimes = []

    if "files" in kwargs and not effective_names:
        effective_names = kwargs["files"]

    # Rule 1: High-priority explicit deliverable creation intent
    if has_explicit_deliverable_intent(effective_prompt):
        return "agent_workflow", "L1 deliverable-intent -> Agent Workflow (Deep Brain)"

    # Rule 2: image attachment
    if any(m.startswith("image/") for m in effective_mimes) or any(
        n.lower().endswith(_IMAGE_EXTS) for n in effective_names
    ):
        return "vision", "L1 image attachment -> Vision"

    # Rule 3: spreadsheet
    if any(n.lower().endswith(_SHEET_EXTS) for n in effective_names):
        return "coder", "L1 MIME spreadsheet -> Coder"

    # Rule 4: math/calculation intent in prompt (isolated code/calculation snippet)
    if CALC_RE.search(effective_prompt):
        return "coder", "L1 regex math-intent -> Coder"

    # Rule 5: low-density / scanned / gibberish page
    if page_outcome in ("blank", "scanned", "gibberish"):
        return "vision", "L1 density/gibberish -> Vision OCR"

    return None, "L1 no-match -> L2"


class RouteL2Result:
    """
    Hybrid return object: can be awaited (in async endpoints) or unpacked directly
    as (specialist, trace) in sync legacy tests.
    """
    def __init__(self, coro_or_fn, sync_result: Optional[tuple[str, str]] = None):
        self._coro_or_fn = coro_or_fn
        self._sync_result = sync_result
        self._coro = None

    def _get_coro(self):
        if self._coro is None:
            if callable(self._coro_or_fn):
                self._coro = self._coro_or_fn()
            else:
                self._coro = self._coro_or_fn
        return self._coro

    def __await__(self):
        return self._get_coro().__await__()

    def __iter__(self):
        if self._sync_result is not None:
            return iter(self._sync_result)
        return iter(asyncio.run(self._get_coro()))


async def _async_route_l2(
    prompt: str,
    sse_emit=None,
) -> tuple[str, str]:
    """
    Fast-Brain constrained JSON judge (< 1500 ms timeout).
    Calls Cloudflare Fast-Brain /v1/chat/completions with temperature=0.
    Falls back to deep_brain on timeout or any error.
    """
    url = f"{_fast_brain_url()}/v1/chat/completions"
    firewall_active = not bool(int(os.getenv("SOVEREIGN_FIREWALL_DISABLE", "0")))

    if firewall_active:
        log.warning(
            "[AIRGAP-EXTERNAL-FLAG] L2 Fast-Brain call → %s  "
            "(SOVEREIGN_FIREWALL_DISABLE=0, call logged for compliance)",
            url,
        )

    system_prompt = (
        "You are a specialist routing classifier for an industrial AI workbench. "
        "Analyse the user's engineering prompt and respond with ONLY a JSON object: "
        '{"route": "<specialist>", "reason": "<one sentence>"} '
        "where specialist is exactly one of: deep_brain, vision, coder. "
        "deep_brain = complex reasoning/analysis; vision = image/diagram/OCR; "
        "coder = code, calculation, spreadsheet, numeric."
    )

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.post(
                url,
                json={
                    "model": "Qwen2.5-3B-Instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt[:512]},
                    ],
                    "max_tokens": 64,
                    "temperature": 0.0,
                },
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            raw = raw.strip("`").strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()

            decision = json.loads(raw)
            route = str(decision.get("route", "deep_brain"))
            reason = str(decision.get("reason", f"L2 Fast-Brain -> {route}"))

            if route not in ("deep_brain", "vision", "coder"):
                log.warning("[L2] unexpected route '%s' — defaulting to deep_brain", route)
                route = "deep_brain"
                reason = f"L2 invalid route corrected -> {route}"

            trace = f"[ROUTE] L2 Fast-Brain selected: {route}"
            if firewall_active:
                trace += " [AIRGAP-EXTERNAL-FLAG]"

            log.info("[L2] %s | reason: %s", trace, reason)

            if sse_emit is not None:
                sse_emit(
                    "[ROUTE]",
                    {
                        "layer": "L2",
                        "specialist": route,
                        "trace": trace,
                        "airgap_flag": firewall_active,
                    },
                )

            return route, trace

    except (httpx.TimeoutException, httpx.ConnectError) as exc:
        fallback_trace = f"L2 timeout/connection error ({type(exc).__name__}) -> fallback: deep_brain"
        if firewall_active:
            fallback_trace += " [AIRGAP-EXTERNAL-FLAG]"
        log.warning("[L2] %s", fallback_trace)
        return "deep_brain", fallback_trace

    except Exception as exc:
        fallback_trace = f"L2 error ({exc}) -> fallback: deep_brain"
        log.warning("[L2] %s", fallback_trace)
        return "deep_brain", fallback_trace


def route_l2(
    prompt: str,
    brain_client=None,
    sse_emit=None,
) -> RouteL2Result:
    """
    L2 routing entrypoint.
    If brain_client is passed (e.g. In unit tests), runs synchronously against it.
    Otherwise returns an awaitable/unrollable RouteL2Result querying Fast-Brain.
    """
    if brain_client is not None:
        try:
            decision = brain_client.chat(
                prompt=prompt,
                temperature=0.0,
                max_tokens=64,
                response_schema={"specialist": ["vision", "rag", "coder", "brain"]},
            )
            spec = str(decision.get("specialist", "brain"))
            res = (spec, f"L2 Brain-7B judge -> {spec}")
        except Exception as e:
            res = ("brain", f"L2 error -> brain ({e})")

        async def _dummy():
            return res

        return RouteL2Result(_dummy, sync_result=res)

    return RouteL2Result(_async_route_l2(prompt=prompt, sse_emit=sse_emit))


def route_l3(model_override: str) -> tuple[str, str]:
    """
    Manual override (instant).  Bypasses L1 and L2 completely.
    Called when model_override is not None and not 'auto'.

    Returns (specialist, trace).
    """
    _alias_map = {
        "deep_brain": "deep_brain",
        "fast_brain": "fast_brain",
        "coder": "coder",
        "vision": "vision",
        "embedding": "embedding",
        "brain": "deep_brain",
        "rag": "deep_brain",
        "agent_workflow": "agent_workflow",
    }
    specialist = _alias_map.get(model_override.lower(), model_override)
    trace = f"L3 manual override -> {specialist}"
    log.info("[L3] %s (raw input: %s)", trace, model_override)
    return specialist, trace


def detect_requested_formats(prompt: str) -> list[str]:
    """
    Analyzes prompt text to identify the specific deliverable format(s) requested
    by the engineer. Returns a subset of ['docx', 'xlsx', 'pdf', 'pptx'] or all 4
    if general or full-suite intent is identified.
    """
    if not prompt:
        return ["docx", "xlsx", "pdf", "pptx"]

    p_lower = prompt.lower()
    fmts = []

    is_pdf = bool(re.search(r"\b(pdf|report\.pdf)\b", p_lower))
    is_xlsx = bool(re.search(r"\b(excel|xlsx|spreadsheet|workbook|sheet|sheets|csv)\b", p_lower))
    is_pptx = bool(re.search(r"\b(pptx|ppt|powerpoint|presentation|slides|pitch\s*deck|slide\s*deck|briefing\s*deck)\b", p_lower))
    is_docx = bool(re.search(r"\b(docx|doc|word|memorandum|memo)\b", p_lower))

    is_all = bool(re.search(r"\b(all\s*(?:formats|deliverables|docs|documents)|full\s*suite|4-in-1|complete\s*suite|all\s*four)\b", p_lower))
    if is_all:
        return ["docx", "xlsx", "pdf", "pptx"]

    if is_pdf:
        fmts.append("pdf")
    if is_xlsx:
        fmts.append("xlsx")
    if is_pptx:
        fmts.append("pptx")
    if is_docx:
        fmts.append("docx")

    if not fmts:
        # Contextual inference if no specific extension mentioned
        if "report" in p_lower:
            fmts = ["pdf"]
        elif "memo" in p_lower:
            fmts = ["docx"]
        elif "slide" in p_lower or "deck" in p_lower:
            fmts = ["pptx"]
        elif "calc" in p_lower or "data" in p_lower:
            fmts = ["xlsx"]
        else:
            fmts = ["docx", "xlsx", "pdf", "pptx"]

    return fmts


def detect_prompt_domain(prompt: str) -> str:
    """
    Classifies the prompt into an appropriate functional domain:
    - 'industrial': refinery, piping, metallurgy, API 510/570, corrosion, pressure vessels
    - 'software_tech': software, architecture, cloud, AI, ML, platform, APIs, databases, climate intelligence
    - 'finance': SaaS, financials, ARR, MRR, revenue, budgeting, valuation, ROI
    - 'general': general engineering, management, science, or unspecified
    """
    if not prompt:
        return "general"
    p = prompt.lower()

    if any(k in p for k in ["refinery", "corrosion", "piping", "wall loss", "ultrasonic", "utt", "api 510", "api 570", "asme", "crude", "distillation", "furnace", "boiler", "reboiler", "heat exchanger", "pressure vessel", "mrpl"]):
        return "industrial"
    if any(k in p for k in ["saas", "arr", "mrr", "revenue", "ebitda", "financial", "cash flow", "balance sheet", "p&l", "valuation", "investor", "seed round", "cac", "ltv", "burn rate", "projections", "budget", "roi", "attribution", "marketing channel"]):
        return "finance"
    if any(k in p for k in ["software", "architecture", "platform", "cloud", "ai", "artificial intelligence", "machine learning", "ml", "api", "microservice", "kubernetes", "docker", "frontend", "backend", "database", "cybersecurity", "zero-trust", "latency", "throughput", "pipeline", "climate intelligence", "system design", "agent", "agents", "smart grid", "distributed", "network", "server", "telemetry", "deep learning"]):
        return "software_tech"
    return "general"


def extract_document_title(prompt: str, default: str = "Technical Deliverable") -> str:
    """
    Intelligently extracts the intended document title from a user prompt.
    Supports quotation marks, explicit 'titled / named' keywords, and topic patterns.
    """
    if not prompt:
        return default

    # 1. Title in smart quotes or straight quotes
    m = re.search(r'["“\']([^"”\']{6,120})["”\']', prompt)
    if m:
        t = m.group(1).strip()
        if not t.lower().startswith(("http", "select", "insert", "create table")):
            return t

    # 2. Explicit keyword like 'titled: ...' or 'named: ...'
    m = re.search(r'(?:titled|named|title\s*:|subject\s*:)\s*["“\']?([^"\n\.,;]{5,100})', prompt, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # 3. Action phrases like 'generate a report on/for <Topic>' or 'pitch deck for <Topic>'
    m = re.search(
        r'(?:generate|create|produce|draft|build|write)\s+(?:a|an)?\s*(?:complete|comprehensive|technical|executive|formal|detailed)?\s*'
        r'(?:report|document|memo|memorandum|presentation|pitch\s*deck|slides|deck|workbook|spreadsheet|model)?\s*'
        r'(?:on|for|about|regarding)\s+([^\n\.,;]{4,100})',
        prompt,
        re.IGNORECASE,
    )
    if m:
        topic = m.group(1).strip()
        topic = re.sub(r'\s+(?:in|as|using)\s+(?:pdf|excel|word|pptx|docx|xlsx|slides)\b.*$', '', topic, flags=re.IGNORECASE)
        if topic.islower():
            return topic.title()
        return topic

    # 4. If first line is a concise title (< 80 chars)
    first_line = prompt.strip().split("\n")[0].strip("#* ")
    if 10 <= len(first_line) <= 80 and not first_line.lower().startswith(("can you", "please", "i want", "help me", "you are")):
        return first_line

    # Fallback to domain default
    domain = detect_prompt_domain(prompt)
    if domain == "industrial":
        return "Sovereign Industrial Engineering Deliverable"
    elif domain == "software_tech":
        return "Software & Systems Engineering Specification"
    elif domain == "finance":
        return "Financial & Operational Model Report"
    return default

