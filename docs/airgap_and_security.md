# Air-Gap, Sovereignty & Security Architecture

---

## 1. Threat Model & Security Imperative

Industrial control systems and refinery engineering networks are high-value targets for industrial espionage, sabotage, and regulatory non-compliance. In refineries managed by entities like MRPL / MoPNG:
* **The Danger of Cloud APIs**: Transmitting P&IDs, corrosion rates, turnaround schedules, or SOP thresholds to external SaaS/cloud AI endpoints breaks the security perimeter, violating CERT-In and NCIIPC directives.
* **Hidden Cloud Egress**: Even "local" AI libraries frequently contain hidden telemetry pings (e.g., ChromaDB anonymous analytics, Hugging Face hub check-ins, Sentry crash reporting).
* **The Swara Guarantee**: Sovereignty in Swara.ai is **demonstrated as cryptographic and network proof**, not merely declared in documentation.

---

## 2. Multi-Layered Defense-in-Depth Architecture

```
     ┌────────────────────────────────────────────────────────┐
     │                Air-Gapped Refinery LAN                 │
     ├────────────────────────────────────────────────────────┤
     │  Layer 1: Network Subnet Isolation (10.0.99.0/24)      │
     ├────────────────────────────────────────────────────────┤
     │  Layer 2: Kernel iptables SOVEREIGN_EGRESS Drop Chain  │
     ├────────────────────────────────────────────────────────┤
     │  Layer 3: Kernel IPv6 Stack Disabled (sysctl + ip6tab) │
     ├────────────────────────────────────────────────────────┤
     │  Layer 4: Telemetry Blackholes (/etc/hosts -> 0.0.0.0) │
     ├────────────────────────────────────────────────────────┤
     │  Layer 5: Live tcpdump Egress Watchdog (Count == 0)    │
     ├────────────────────────────────────────────────────────┤
     │  Layer 6: SHA-256 Cryptographic Weight Provenance      │
     ├────────────────────────────────────────────────────────┤
     │  Layer 7: Hardened Sandbox Runtime (network_mode: none)│
     ├────────────────────────────────────────────────────────┤
     │  Layer 8: Human-In-The-Loop (HITL) Authorization Gate  │
     └────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Defense Implementations

### 3.1 Kernel-Level IPv4 Egress Firewall (`scripts/sovereignty_firewall.sh`)
Swara creates a dedicated netfilter chain named **`SOVEREIGN_EGRESS`**:
* Evaluates all outbound TCP/UDP traffic from the workstation.
* Permits only loopback (`127.0.0.1/8`) and the trusted refinery subnet (`10.0.99.0/24`).
* Drops all other outbound attempts with packet logging enabled.

```bash
# Core logic executed at system boot:
iptables -N SOVEREIGN_EGRESS 2>/dev/null || iptables -F SOVEREIGN_EGRESS
iptables -A SOVEREIGN_EGRESS -o lo -j ACCEPT
iptables -A SOVEREIGN_EGRESS -d 10.0.99.0/24 -j ACCEPT
iptables -A SOVEREIGN_EGRESS -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A SOVEREIGN_EGRESS -j LOG --log-prefix "[SOVEREIGN_DROP] " --log-level 4
iptables -A SOVEREIGN_EGRESS -j DROP
```

### 3.2 Dual-Stack IPv6 Neutralization
Because attackers or misconfigured libraries can bypass IPv4 firewalls via IPv6 tunnels:
1. IPv6 is disabled at the Linux kernel level via `sysctl`:
   ```bash
   sysctl -w net.ipv6.conf.all.disable_ipv6=1
   sysctl -w net.ipv6.conf.default.disable_ipv6=1
   ```
2. A backup **`SOVEREIGN_EGRESS6`** ip6tables drop chain drops any residual IPv6 frames attempting network exit.

### 3.3 Telemetry Blackholing (`/etc/hosts`)
Preflight scripts inject null-route mappings (`0.0.0.0`) for known telemetry domains:
```text
0.0.0.0 api.segment.io
0.0.0.0 telemetry.chromadb.com
0.0.0.0 huggingface.co
0.0.0.0 sentry.io
0.0.0.0 stats.openwebui.com
```
In addition, runtime environment variables permanently enforce telemetry opt-outs:
```ini
CHROMA_TELEMETRY_OPTOUT=True
ANONYMIZED_TELEMETRY=False
HF_HUB_OFFLINE=1
TRANSFORMERS_OFFLINE=1
```

### 3.4 Live Egress Watchdog & Zero-Packet Counter (`scripts/sovereignty_watchdog.sh`)
* A background watchdog process monitors the network interface using `tcpdump`:
  ```bash
  tcpdump -l -n -i any "tcp[tcpflags] & tcp-syn != 0 and not net 127.0.0.0/8 and not net 10.0.99.0/24"
  ```
* Displays a live counter in the engineer UI.
* If **any** unauthorized packet leaves the machine, the counter increments, an audible alarm triggers in the UI, and the orchestrator immediately freezes all agent loops.

### 3.5 Cryptographic Model Provenance
To prevent malicious model tampering or model-poisoning supply chain attacks:
* Every model weight file (`.gguf` or PyTorch checkpoint) is verified against a strict SHA-256 manifest before the model is loaded into GPU VRAM.
* If a single byte of a model file has been altered, the boot sequence aborts with a security violation error.

### 3.6 Isolated Calculation Sandbox (`src/sandbox_runner.py`)
Code written by the Specialist Coder (e.g. remaining-life equations, matplotlib plotting) executes inside a hardened container:
* **Network Mode**: `network_mode="none"` (No socket creation allowed).
* **Resource Quotas**: Max 2 GB RAM, 15 seconds CPU execution timeout.
* **Filesystem**: Read-only root with `noexec` / `nosuid` mounts on temporary scratch paths.
* **Docker Socket**: The host `docker.sock` is **never** exposed to the container.

### 3.7 Human-In-The-Loop (HITL) Enforcement
Autonomous agents cannot finalize documents or alter database states autonomously:
* The LangGraph state machine introduces a blocking `HITL_REQUIRED` interruption point.
* The engineer inspects:
  1. The generated code and calculation results.
  2. Extracted P&ID tags and citations.
  3. A preview of the draft document.
* Only after the engineer clicks **"Approve & Sign"** does the synthesizer write the `.docx` / `.pdf` file to disk.
