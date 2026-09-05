import re
import sys

raw = open(sys.argv[1], encoding="utf-8").read()
fences = re.findall(r"^```", raw, re.M)
assert len(fences) % 2 == 0, "unbalanced code fences"
for row in re.findall(r"^\|.*\|$", raw, re.M):
    assert "```" not in row, "code fence inside table row"
print("MARKDOWN GATE PASS", sys.argv[1], "fences:", len(fences))
