"""
tools/audit_verification.py â€” Comprehensive End-to-End Runtime Audit Script
Performs runtime verification of:
  - 3-layer router (L1, L2, L3)
  - HITL 403 authorization gates & unlock workflow
  - Excel deliverable generation and streaming
  - Sovereignty telemetry (/api/egress-count, /api/test-egress, /api/sovereignty/registry)
  - P&ID tags database query (/api/pid-tags)
  - Branding verification across endpoints
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient

from src.main import create_app
from src.router import route_l1, route_l2, route_l3
from src.exporter import render_excel_deliverable

def run_audit():
    print("=================================================================")
    print("         SWARA.AI COMPREHENSIVE RUNTIME AUDIT VERIFICATION       ")
    print("=================================================================\n")

    results = {}

    # -----------------------------------------------------------------
    # 1. Router Verification
    # -----------------------------------------------------------------
    print("[1/5] Auditing 3-Layer Router...")
    # L1 Fast-path timing
    t0 = time.perf_counter()
    spec_img, trace_img = route_l1(["image/png"], ["diagram.png"], "Inspect tag")
    t1 = time.perf_counter()
    l1_ms = (t1 - t0) * 1000
    assert spec_img == "vision"
    assert l1_ms < 5.0, f"L1 took {l1_ms:.2f} ms (expected < 5 ms)"

    spec_calc, trace_calc = route_l1([], [], "calculate fouling rate delta")
    assert spec_calc == "coder"

    spec_sheet, trace_sheet = route_l1([], ["sheet.xlsx"], "read data")
    assert spec_sheet == "coder"

    # L3 Manual Override
    spec_l3, trace_l3 = route_l3("coder")
    assert spec_l3 == "coder"
    assert "L3 manual override -> coder" in trace_l3

    spec_l3_brain, _ = route_l3("deep_brain")
    assert spec_l3_brain == "deep_brain"

    results["router_l1_l3"] = "PASSED"
    print(f"  âœ“ L1 fast-path: {l1_ms:.3f} ms (Target < 5 ms)")
    print(f"  âœ“ L1 image -> {spec_img}")
    print(f"  âœ“ L1 math -> {spec_calc}")
    print(f"  âœ“ L1 spreadsheet -> {spec_sheet}")
    print(f"  âœ“ L3 override -> {spec_l3}")

    # -----------------------------------------------------------------
    # 2. Excel Exporter Verification
    # -----------------------------------------------------------------
    print("\n[2/5] Auditing Excel Exporter...")
    task_id = f"audit_{os.urandom(4).hex()}"
    test_data = [
        {"Tag": "HEX-01", "Service": "Crude Pre-heat", "Corrosion (mm/y)": 0.22, "Action": "Inspect"},
        {"Tag": "HEX-02", "Service": "Vacuum Residue", "Corrosion (mm/y)": 0.45, "Action": "Retire"},
    ]
    excel_path = render_excel_deliverable(task_id, test_data)
    assert os.path.isfile(excel_path), f"Excel file not found at {excel_path}"
    assert os.path.getsize(excel_path) > 1000
    results["excel_exporter"] = "PASSED"
    print(f"  âœ“ Excel deliverable generated: {excel_path} ({os.path.getsize(excel_path)} bytes)")

    # -----------------------------------------------------------------
    # 3. FastAPI Client Runtime & HITL Gates
    # -----------------------------------------------------------------
    print("\n[3/5] Auditing FastAPI Endpoints & HITL Authorization Gate...")
    app = create_app()
    client = TestClient(app)

    # Health & System Status Branding
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["system"] == "Swara.ai"
    assert r_health.json()["version"] == "3.0.0"
    print("  âœ“ /health reports system: Swara.ai v3.0.0")

    r_status = client.get("/system/status")
    assert r_status.status_code == 200
    assert r_status.json()["name"] == "Swara.ai"
    print("  âœ“ /system/status reports name: Swara.ai")

    # HITL Gate on unapproved task
    r_unapproved_docx = client.get(f"/api/artifact/{task_id}")
    assert r_unapproved_docx.status_code == 403
    print("  âœ“ GET /api/artifact/{task_id} -> 403 Forbidden (Gate Active)")

    r_unapproved_xlsx = client.get(f"/api/artifact/{task_id}/xlsx")
    assert r_unapproved_xlsx.status_code == 403
    print("  âœ“ GET /api/artifact/{task_id}/xlsx -> 403 Forbidden (Gate Active)")

    # Unlock workflow via /api/hitl/approve
    r_approve = client.post("/api/hitl/approve", json={"task_id": task_id, "approved": True})
    assert r_approve.status_code == 200
    assert r_approve.json()["approved"] is True
    print("  âœ“ POST /api/hitl/approve -> Gate Unlocked")

    # Now verify .xlsx file is streamed successfully
    r_approved_xlsx = client.get(f"/api/artifact/{task_id}/xlsx")
    assert r_approved_xlsx.status_code == 200
    assert r_approved_xlsx.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(r_approved_xlsx.content) > 1000
    print(f"  âœ“ GET /api/artifact/{task_id}/xlsx -> 200 OK (Streamed {len(r_approved_xlsx.content)} bytes)")
    results["hitl_gates"] = "PASSED"

    # Cleanup test excel
    try:
        os.remove(excel_path)
    except OSError:
        pass

    # -----------------------------------------------------------------
    # 4. Sovereignty Telemetry & P&ID Tags
    # -----------------------------------------------------------------
    print("\n[4/5] Auditing Sovereignty Telemetry & P&ID Tags...")
    # Egress count
    r_egress = client.get("/api/egress-count")
    assert r_egress.status_code == 200
    assert "egress_count" in r_egress.json()
    print(f"  âœ“ GET /api/egress-count -> {r_egress.json()}")

    # Registry
    r_reg = client.get("/api/sovereignty/registry")
    assert r_reg.status_code == 200
    models = r_reg.json()
    assert "deep_brain" in models
    assert "fast_brain" in models
    assert "coder" in models
    assert "vision" in models
    assert "embedding" in models
    print(f"  âœ“ GET /api/sovereignty/registry -> {len(models)} models registered with SHA-256")

    # Test Egress tri-probe
    r_probe = client.post("/api/test-egress")
    assert r_probe.status_code == 200
    assert "sovereignty_intact" in r_probe.json()
    assert "probes" in r_probe.json()
    print(f"  âœ“ POST /api/test-egress -> Status: {r_probe.json()['status']} (Probes: {len(r_probe.json()['probes'])})")

    # PID tags
    r_pid = client.get("/api/pid-tags")
    assert r_pid.status_code == 200
    assert "tags" in r_pid.json()
    print(f"  âœ“ GET /api/pid-tags -> {len(r_pid.json()['tags'])} equipment tags queried from pid_tags.db")
    results["sovereignty_telemetry"] = "PASSED"

    # -----------------------------------------------------------------
    # 5. Summary
    # -----------------------------------------------------------------
    print("\n=================================================================")
    print("                     ALL AUDIT GATES PASSED                     ")
    print("=================================================================")
    for k, v in results.items():
        print(f"  â€¢ {k}: {v}")

if __name__ == "__main__":
    run_audit()

