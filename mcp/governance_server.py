"""
MCP Governance Server
Exposes tools for Cursor to validate code compliance before accepting generated code.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

# Banned patterns - code that bypasses write_artifact()
BANNED_PATTERNS = [
    (r'open\s*\(\s*["\'][^"\']+["\']\s*,\s*["\']w', "Use write_artifact() instead of open(..., 'w')"),
    (r"\.to_csv\s*\(", "Wrap pd.to_csv() with write_artifact()"),
    (r"pickle\.dump\s*\(", "Use write_artifact() with serialized content"),
    (r"joblib\.dump\s*\(", "Use write_artifact() with serialized content"),
]


def validate_code_compliance(code_string: str, zone: str = "challenger") -> list[dict]:
    """
    Check code for governance violations.
    Returns list of {pattern, message, line} for each violation.
    """
    violations = []
    for i, line in enumerate(code_string.split("\n"), 1):
        for pattern, msg in BANNED_PATTERNS:
            if re.search(pattern, line):
                violations.append({"line": i, "pattern": pattern, "message": msg})
    return violations


def check_gate_status(run_id: str, target_gate: int) -> dict:
    """Query runs/<run_id>/lineage.jsonl for gate status."""
    root = Path(__file__).resolve().parent.parent
    lineage_path = root / "runs" / run_id / "lineage.jsonl"
    if not lineage_path.exists():
        return {"run_id": run_id, "exists": False, "blocking_gates": [target_gate]}
    events = []
    with open(lineage_path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                events.append(json.loads(line))
    passed_gates = [
        e["payload"]["gate"]
        for e in events
        if e.get("event_type") == "gate_passed" and "gate" in e.get("payload", {})
    ]
    blocking = [g for g in range(target_gate + 1) if g not in passed_gates]
    return {
        "run_id": run_id,
        "exists": True,
        "passed_gates": passed_gates,
        "blocking_gates": blocking,
    }


def generate_artifact_wrapper(filename: str, content_type: str = "generic") -> str:
    """Return Python code template using write_artifact()."""
    return f'''
from core.artifacts import write_artifact

# Replace content with your actual data (string or bytes)
content = ...  # your content here
write_artifact(
    run_id=run_id,
    content=content,
    filename="{filename}",
    artifact_type="{content_type}",
    metadata={{"source": "generated"}},
)
'''


def get_policy(policy_path: str) -> str:
    """Load YAML content from policies/ directory."""
    root = Path(__file__).resolve().parent.parent
    full_path = root / "policies" / policy_path
    if not full_path.exists():
        full_path = root / policy_path
    if not full_path.exists():
        return ""
    return full_path.read_text(encoding="utf-8")


# MCP server entry point (for mcp package)
if __name__ == "__main__":
    # Quick test
    code = 'df.to_csv("output.csv")'
    print(validate_code_compliance(code))
