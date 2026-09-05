import hashlib
import json

def hash_observation_tail(toolname: str, args: dict, observation: str) -> str:
    # Hash the TAIL: tracebacks share identical prefixes;
    # the distinguishing error text lives at the end.
    # sort_keys=True guarantees deterministic serialization.
    payload = toolname + json.dumps(args, sort_keys=True) + observation[-500:]
    return hashlib.sha256(payload.encode()).hexdigest()

# Public alias — consumed by src/main.py as `from src.loop_killer import get_step_hash`
get_step_hash = hash_observation_tail
