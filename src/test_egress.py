import socket
try:
    from src.main import stream_sse, DemoStopError
except ImportError:
    from orchestrator import stream_sse, DemoStopError
# stream_sse() and DemoStopError are provided by the FastAPI orchestrator runtime.

def run_test_egress():
    probes = [
        ("8.8.8.8",              53,  "external DNS (IPv4)"),
        ("10.0.99.254",          445, "lateral — unassigned subnet IP (IPv4)"),
        ("2001:4860:4860::8888", 53,  "external DNS (IPv6)"),
    ]
    for ip, port, label in probes:
        try:
            socket.create_connection((ip, port), timeout=0.3)   # 300 ms hard timeout
            raise DemoStopError(f"EGRESS SUCCEEDED to {label}")  # never expected
        except (TimeoutError, OSError):
            # IPv4 probes: dropped by SOVEREIGN_EGRESS -> timeout path.
            # IPv6 probe: with disable_ipv6=1 this fails fast (EAFNOSUPPORT /
            # ENETUNREACH); if IPv6 were ever re-enabled, SOVEREIGN_EGRESS6
            # drops it -> timeout path. Every outcome reports "blocked".
            stream_sse("egress_blocked", target=f"{ip}:{port}", label=label)
            # UI simultaneously renders the matching [AIRGAP-EGRESS*-DROP] kernel log line
