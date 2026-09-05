#!/usr/bin/env bash
# freeze_evidence.sh — regenerates Appendix D.4/D.5 artifacts from REPO FILES, not the docs.
# Run at the freeze step; output pasted verbatim. Hand-edited evidence is banned (Appendix F).
set -eu
set -o pipefail 2>/dev/null || true
cd "$(dirname "$0")/.."

echo "== syntax gate (repo files) =="
bash -n scripts/sovereignty_firewall.sh
bash -n scripts/preflight.sh
bash -n scripts/egress_counter.sh
bash -n scripts/sovereignty_watchdog.sh
python3 -m py_compile src/loop_killer.py src/density_gate.py src/sandbox_runner.py \
                      src/test_egress.py src/router.py src/exporter.py
python3 -m json.tool config/registry.json >/dev/null
echo "syntax gate PASS"

echo "== mandated strings (grep -Fq on repo files; presence only, counts deliberately omitted) =="
grep -Fq 'iptables -N SOVEREIGN_EGRESS'             scripts/sovereignty_firewall.sh
grep -Fq 'iptables -A SOVEREIGN_EGRESS -o "${NIC}"' scripts/sovereignty_firewall.sh
grep -Fq 'ip6tables -N SOVEREIGN_EGRESS6'           scripts/sovereignty_firewall.sh
grep -Fq 'net.ipv6.conf.all.disable_ipv6'           scripts/preflight.sh
grep -Fq 'json.dumps(args, sort_keys=True)'         src/loop_killer.py
grep -Fq 'if len(stripped) < 50:'                   src/density_gate.py
grep -Fq 'network_mode="none"'                      src/sandbox_runner.py
grep -F -q 'security_opt=["no-new-privileges"]'       src/sandbox_runner.py
grep -Fq 'except (TimeoutError, OSError):'          src/test_egress.py
grep -Fq 'stream_sse("egress_blocked",'             src/test_egress.py
echo "mandated strings PASS"

echo "== markdown gate (both docs) =="
python3 tools/markdown_gate.py PRD.md
python3 tools/markdown_gate.py ARCHITECTURE.md
