#!/usr/bin/env bash
# egress_counter.sh — line-buffered outbound packet counter; UI polls the file every 500 ms
set -euo pipefail
NIC="eth0"
OUT=/srv/sovereign/metrics/egress_count
echo 0 > "${OUT}"
tcpdump -l -Q out -i "${NIC}" -n "ip or ip6" 2>/dev/null | while IFS= read -r pkt; do
    printf '%d\n' $(( $(cat "${OUT}") + 1 )) > "${OUT}"
done
