#!/usr/bin/env bash
# sovereignty_watchdog.sh — watchdog that re-asserts sovereignty firewall rules every 5s
set -euo pipefail

while true; do
    if ! iptables -C OUTPUT -j SOVEREIGN_EGRESS 2>/dev/null; then
        iptables -I OUTPUT 1 -j SOVEREIGN_EGRESS
    fi
    if ! iptables -C FORWARD -j SOVEREIGN_EGRESS 2>/dev/null; then
        iptables -I FORWARD 1 -j SOVEREIGN_EGRESS
    fi
    if ! ip6tables -C OUTPUT -j SOVEREIGN_EGRESS6 2>/dev/null; then
        ip6tables -I OUTPUT 1 -j SOVEREIGN_EGRESS6
    fi
    if ! ip6tables -C FORWARD -j SOVEREIGN_EGRESS6 2>/dev/null; then
        ip6tables -I FORWARD 1 -j SOVEREIGN_EGRESS6
    fi
    sleep 5
done
