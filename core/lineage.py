"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (Lineage / audit logging)
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from core.run_id import validate_run_id


def _get_lineage_path(run_id: str) -> Path:
    """Get lineage.jsonl path for a run."""
    validate_run_id(run_id)
    run_dir = Path(__file__).resolve().parent.parent / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir / "lineage.jsonl"


def emit_lineage_event(
    run_id: str,
    event_type: str,
    payload: dict[str, Any] | None = None,
) -> None:
    """
    Append a lineage event to runs/<run_id>/lineage.jsonl.

    Args:
        run_id: Valid run identifier.
        event_type: Type of event (artifact_written, gate_passed, gate_failed, etc.).
        payload: Event payload (arbitrary JSON-serializable dict).
    """
    if not run_id or not run_id.strip():
        return

    path = _get_lineage_path(run_id)
    payload = payload or {}
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "payload": payload,
    }
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")


def get_lineage_events(run_id: str) -> list[dict[str, Any]]:
    """Load all lineage events for a run."""
    path = Path(__file__).resolve().parent.parent / "runs" / run_id / "lineage.jsonl"
    if not path.exists():
        return []
    events = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                events.append(json.loads(line))
    return events


def compute_lineage_hash(run_id: str) -> str:
    """Compute SHA-256 hash of lineage file for audit trail."""
    import hashlib

    path = Path(__file__).resolve().parent.parent / "runs" / run_id / "lineage.jsonl"
    if not path.exists():
        return hashlib.sha256(b"").hexdigest()
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()
