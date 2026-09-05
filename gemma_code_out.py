```python
import random
import json

def calculate_latencies():
    """Calculates 5 server latencies and returns a dictionary with analysis."""

    latencies = [random.randint(20, 200) for _ in range(5)]  # Simulate latencies between 20ms and 200ms

    average_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    min_latency = min(latencies)

    calc_data = {
        "raw_latencies": latencies,
        "average_latency": average_latency,
        "max_latency": max_latency,
        "min_latency": min_latency
    }

    key_findings = [
        f"Average latency: {average_latency:.2f}ms",
        f"Maximum latency observed: {max_latency}ms",
        f"Minimum latency observed: {min_latency}ms"
    ]

    recommendation = "Monitor server performance regularly. Investigate any consistently high latencies to identify bottlenecks."

    analysis = {
        "title": "Server Latency Analysis",
        "summary": "This report analyzes the latency of 5 servers.",
        "calc_data": calc_data,
        "key_findings": key_findings,
        "recommendation": recommendation
    }

    return analysis


if __name__ == "__main__":
    analysis_result = calculate_latencies()
    print(json.dumps(analysis_result, indent=4))
```