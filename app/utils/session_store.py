"""
Cloud-friendly artifact storage using session state.
Use when deployed to Streamlit Cloud (ephemeral filesystem).
"""

import hashlib
import json
from datetime import datetime
from typing import Any


def write_artifact_session(
    run_id: str,
    content: str | bytes,
    filename: str,
    artifact_type: str = "generic",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Store artifact in session state (cloud deployment mode).
    Computes SHA-256, logs lineage, no disk writes.
    """
    import streamlit as st

    if not run_id:
        raise ValueError("run_id is required for artifact writing")

    content_bytes = content.encode("utf-8") if isinstance(content, str) else content
    content_hash = hashlib.sha256(content_bytes).hexdigest()
    metadata = metadata or {}

    artifact_entry = {
        "run_id": run_id,
        "filename": filename,
        "type": artifact_type,
        "hash": content_hash,
        "timestamp": datetime.utcnow().isoformat(),
        "size": len(content_bytes),
        "metadata": metadata,
    }

    if "artifacts" not in st.session_state:
        st.session_state.artifacts = {}
    if "artifacts_index" not in st.session_state:
        st.session_state.artifacts_index = {}

    key = f"{run_id}:{filename}"
    st.session_state.artifacts[key] = content_bytes
    st.session_state.artifacts_index[key] = artifact_entry

    if "lineage" not in st.session_state:
        st.session_state.lineage = []
    st.session_state.lineage.append({
        "timestamp": datetime.utcnow().isoformat(),
        "run_id": run_id,
        "event": "artifact_created",
        "artifact": filename,
        "hash": content_hash,
    })

    return artifact_entry


def get_artifacts_for_run(run_id: str) -> list[dict[str, Any]]:
    """Get all artifact entries for a run from session state."""
    import streamlit as st

    if "artifacts_index" not in st.session_state:
        return []
    return [
        v for k, v in st.session_state.artifacts_index.items()
        if k.startswith(f"{run_id}:")
    ]


def get_lineage_for_run(run_id: str) -> list[dict]:
    """Get lineage events for a run."""
    import streamlit as st

    if "lineage" not in st.session_state:
        return []
    return [e for e in st.session_state.lineage if e.get("run_id") == run_id]


def verify_artifact_session(run_id: str, filename: str) -> bool:
    """Recompute hash and verify against stored index."""
    import streamlit as st

    key = f"{run_id}:{filename}"
    if key not in st.session_state.artifacts:
        return False
    content = st.session_state.artifacts[key]
    computed = hashlib.sha256(content).hexdigest()
    stored = st.session_state.artifacts_index.get(key, {}).get("hash", "")
    return computed == stored
