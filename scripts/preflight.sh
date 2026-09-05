#!/usr/bin/env bash
# preflight.sh — boot-time sovereignty gates; non-zero exit blocks demo mode
set -euo pipefail

for v in ANONYMIZED_TELEMETRY HF_HUB_OFFLINE TRANSFORMERS_OFFLINE PIP_DISABLE_PIP_VERSION_CHECK; do
    [ -n "${!v:-}" ] || { echo "FAIL env ${v} unset"; exit 1; }
done
for h in huggingface.co cdn-lfs.huggingface.co api.github.com github.com pypi.org files.pythonhosted.org; do
    grep -q "127.0.0.1 ${h}$" /etc/hosts || { echo "FAIL hosts blackhole ${h}"; exit 1; }
done
iptables -L SOVEREIGN_EGRESS -n -v >/dev/null
[ "$(iptables -L FORWARD -n --line-numbers | awk '$1=="1"{print $2}')" = "SOVEREIGN_EGRESS" ]
[ "$(iptables -L OUTPUT  -n --line-numbers | awk '$1=="1"{print $2}')" = "SOVEREIGN_EGRESS" ]
pgrep -f sovereignty_watchdog.sh >/dev/null

# IPv6: kernel-disabled (primary) + ip6tables backstop pinned (secondary)
[ "$(sysctl -n net.ipv6.conf.all.disable_ipv6)" = "1" ] || { echo "FAIL ipv6 enabled (all)"; exit 1; }
[ "$(sysctl -n net.ipv6.conf.default.disable_ipv6)" = "1" ] || { echo "FAIL ipv6 enabled (default)"; exit 1; }
ip6tables -L SOVEREIGN_EGRESS6 -n -v >/dev/null
[ "$(ip6tables -L FORWARD -n --line-numbers | awk '$1=="1"{print $2}')" = "SOVEREIGN_EGRESS6" ]
[ "$(ip6tables -L OUTPUT  -n --line-numbers | awk '$1=="1"{print $2}')" = "SOVEREIGN_EGRESS6" ]

! grep -RqE "googleapis|unpkg|jsdelivr" dist/
python3 tools/verify_manifest.py models/ manifest.json
python3 tools/registry_health.py
pgrep -f "tcpdump -l" >/dev/null
docker image inspect sovereign-sandbox:1.0 >/dev/null
findmnt -no OPTIONS /srv/sovereign/job_out | grep -q "noexec"
findmnt -no OPTIONS /srv/sovereign/job_out | grep -q "nosuid"
! grep -Rq "/var/run/docker.sock" config/ src/
! grep -Rq "GZipMiddleware" src/
grep -Rq "X-Accel-Buffering" src/
echo "PREFLIGHT GREEN — demo-ready"
