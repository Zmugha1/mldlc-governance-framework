"""SQLite CRUD operations for Sandi Dashboard."""
import sqlite3
import json
from pathlib import Path


def get_db_path():
    return Path(__file__).resolve().parent.parent / "data" / "sandi.db"


def init_db():
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            compartment TEXT,
            interest INTEGER,
            disc_style TEXT,
            best_match TEXT,
            blocker TEXT,
            last_contact TEXT,
            next_action TEXT,
            notes TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def load_sample_clients():
    """Load clients from sample_clients.json into SQLite."""
    data_path = Path(__file__).resolve().parent.parent / "data" / "sample_clients.json"
    if not data_path.exists():
        return []
    with open(data_path) as f:
        data = json.load(f)
    return data.get("clients", [])


def get_all_clients():
    """Get all clients - load from JSON (full client data with ilwe, flags, etc)."""
    clients = load_sample_clients()
    if clients:
        return clients
    init_db()
    conn = sqlite3.connect(get_db_path())
    c = conn.cursor()
    c.execute("SELECT * FROM clients")
    rows = c.fetchall()
    conn.close()
    if rows:
        cols = ["id", "name", "email", "phone", "compartment", "interest", "disc_style", "best_match", "blocker", "last_contact", "next_action", "notes", "created_at"]
        return [dict(zip(cols, r)) for r in rows]
    return []


def get_clients_by_compartment(compartment):
    clients = get_all_clients()
    if compartment == "All":
        return clients
    return [c for c in clients if c.get("compartment") == compartment]
