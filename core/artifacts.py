"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (Artifact enforcement layer)
# ARTIFACT_ENFORCEMENT: This module IS the enforcement - no direct writes allowed elsewhere
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from core.exceptions import GovernanceError
from core.lineage import emit_lineage_event
from core.run_id import validate_run_id


def _get_runs_dir() -> Path:
    """Get the runs directory path (repo root relative)."""
    return Path(__file__).resolve().parent.parent / "runs"


def _ensure_run_dir(run_id: str) -> Path:
    """Ensure run directory exists and return its path."""
    validate_run_id(run_id)
    run_dir = _get_runs_dir() / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def _load_artifacts_index(run_dir: Path) -> dict[str, Any]:
    """Load or create artifacts index."""
    index_path = run_dir / "artifacts_index.json"
    if index_path.exists():
        with open(index_path, encoding="utf-8") as f:
            return json.load(f)
    return {"artifacts": [], "run_id": str(run_dir.name), "created_at": datetime.utcnow().isoformat()}


def _save_artifacts_index(run_dir: Path, index: dict[str, Any]) -> None:
    """Save artifacts index. Uses direct write only for this governance index file."""
    index_path = run_dir / "artifacts_index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)


def write_artifact(
    run_id: str,
    content: str | bytes,
    filename: str,
    artifact_type: str = "generic",
    metadata: dict[str, Any] | None = None,
) -> str:
    """
    The ONLY sanctioned path for writing files in the MLDLC framework.

    Args:
        run_id: Valid run identifier (required).
        content: File content (string or bytes).
        filename: Output filename within runs/<run_id>/.
        artifact_type: Type for lineage (dataset, model, report, etc.).
        metadata: Optional metadata for the artifact.

    Returns:
        SHA-256 hash of the content.

    Raises:
        GovernanceError: If run_id is invalid or missing.
    """
    if not run_id or not run_id.strip():
        raise GovernanceError("run_id is required and cannot be empty")

    run_dir = _ensure_run_dir(run_id)
    metadata = metadata or {}

    # Normalize content to bytes for hashing
    content_bytes = content.encode("utf-8") if isinstance(content, str) else content
    content_hash = hashlib.sha256(content_bytes).hexdigest()

    # Write file
    out_path = run_dir / filename
    with open(out_path, "wb") as f:
        f.write(content_bytes)

    # Update artifacts index
    index = _load_artifacts_index(run_dir)
    artifact_entry = {
        "filename": filename,
        "sha256": content_hash,
        "artifact_type": artifact_type,
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": metadata,
    }
    # Remove existing entry for same filename if present
    index["artifacts"] = [a for a in index["artifacts"] if a.get("filename") != filename]
    index["artifacts"].append(artifact_entry)
    _save_artifacts_index(run_dir, index)

    # Emit lineage event
    emit_lineage_event(
        run_id=run_id,
        event_type="artifact_written",
        payload={
            "filename": filename,
            "sha256": content_hash,
            "artifact_type": artifact_type,
            "metadata": metadata,
        },
    )

    return content_hash


def verify_artifact(run_id: str, filename: str) -> bool:
    """
    Recompute hash of artifact and verify against index.

    Returns:
        True if hash matches, False otherwise.
    """
    run_dir = _get_runs_dir() / run_id
    file_path = run_dir / filename
    if not file_path.exists():
        return False

    index = _load_artifacts_index(run_dir)
    stored = next((a for a in index["artifacts"] if a.get("filename") == filename), None)
    if not stored:
        return False

    with open(file_path, "rb") as f:
        computed = hashlib.sha256(f.read()).hexdigest()
    return computed == stored.get("sha256")


def get_artifacts_index(run_id: str) -> dict[str, Any]:
    """Load artifacts index for a run."""
    run_dir = _get_runs_dir() / run_id
    if not run_dir.exists():
        return {"artifacts": [], "run_id": run_id}
    return _load_artifacts_index(run_dir)
