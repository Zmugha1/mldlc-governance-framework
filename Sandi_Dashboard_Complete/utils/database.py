"""SQLite CRUD operations for Sandy's Complete Dashboard."""
import sqlite3
import json
from pathlib import Path


def get_db_path():
    return Path(__file__).resolve().parent.parent / "data" / "sandi_dashboard.db"


def get_clients_path():
    return Path(__file__).resolve().parent.parent / "data" / "clients.json"


def get_all_clients():
    """Load clients from JSON."""
    path = get_clients_path()
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("clients", [])


def get_clients_by_compartment(compartment):
    clients = get_all_clients()
    if compartment == "All":
        return clients
    return [c for c in clients if c.get("compartment") == compartment]


def get_client_by_id(client_id):
    clients = get_all_clients()
    return next((c for c in clients if c.get("id") == client_id), None)


def get_pipeline_counts():
    """Return count of clients per compartment."""
    clients = get_all_clients()
    stages = ["IC", "C1", "C1.1", "C2", "C3", "C4", "C5", "CLOSED"]
    return {s: sum(1 for c in clients if c.get("compartment") == s) for s in stages}


def get_dashboard_stats():
    """Return dashboard summary stats."""
    clients = get_all_clients()
    active = sum(1 for c in clients if c.get("compartment") not in ["CLOSED", None])
    inactive = sum(1 for c in clients if (c.get("last_contact") or "") < "2026-03-01")
    closed = sum(1 for c in clients if c.get("compartment") == "CLOSED")
    pipeline_value = sum(c.get("conversion_probability", 0) * 5000 for c in clients if c.get("compartment") != "CLOSED")
    return {
        "active_clients": active,
        "inactive_clients": inactive,
        "closed_ytd": closed,
        "pipeline_value": pipeline_value,
    }
