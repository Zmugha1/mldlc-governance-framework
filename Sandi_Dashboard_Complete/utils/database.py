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
