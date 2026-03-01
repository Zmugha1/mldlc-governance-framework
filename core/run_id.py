"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (Run identification)
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path


def validate_run_id(run_id: str) -> None:
    """
    Validate run_id format. Raises GovernanceError if invalid.

    Rules:
    - Non-empty string
    - Alphanumeric, underscores, hyphens only
    - Reasonable length (1-128 chars)
    """
    from core.exceptions import GovernanceError

    if not run_id or not isinstance(run_id, str):
        raise GovernanceError("run_id is required and must be a non-empty string")
    run_id = run_id.strip()
    if not run_id:
        raise GovernanceError("run_id cannot be empty or whitespace")
    if len(run_id) > 128:
        raise GovernanceError("run_id must be 128 characters or less")
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")
    if not all(c in allowed for c in run_id):
        raise GovernanceError("run_id may only contain alphanumeric characters, underscores, and hyphens")


def generate_run_id(prefix: str = "run", inputs_hash: str | None = None) -> str:
    """
    Generate a deterministic run ID.

    Args:
        prefix: Optional prefix (e.g., "run", "challenger").
        inputs_hash: Optional hash of inputs for reproducibility.

    Returns:
        Run ID string like run_20260228_143022_a1b2c3d4
    """
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    seed = inputs_hash or hashlib.sha256(str(datetime.utcnow().timestamp()).encode()).hexdigest()[:8]
    return f"{prefix}_{ts}_{seed}"
