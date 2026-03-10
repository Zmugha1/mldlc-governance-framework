"""Sandy Bot database - SQLite client data."""
import sqlite3
import json
from datetime import datetime


class SandyDatabase:
    def __init__(self, db_path="sandy_bot.db"):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()

        c.execute(
            """CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            compartment TEXT,
            interest INTEGER,
            status TEXT,
            created_date TEXT,
            last_contact TEXT,
            next_action TEXT,
            next_action_date TEXT
        )"""
        )

        c.execute(
            """CREATE TABLE IF NOT EXISTS disc (
            client_id TEXT PRIMARY KEY,
            style TEXT,
            d_score INTEGER,
            i_score INTEGER,
            s_score INTEGER,
            c_score INTEGER,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )"""
        )

        c.execute(
            """CREATE TABLE IF NOT EXISTS ilwe (
            client_id TEXT PRIMARY KEY,
            income TEXT,
            lifestyle TEXT,
            wealth TEXT,
            equity TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )"""
        )

        c.execute(
            """CREATE TABLE IF NOT EXISTS flags (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            type TEXT,
            description TEXT,
            date TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )"""
        )

        c.execute(
            """CREATE TABLE IF NOT EXISTS calls (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            call_date TEXT,
            duration_minutes INTEGER,
            notes TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )"""
        )

        conn.commit()
        conn.close()

    def add_client(self, client_data):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute(
            """INSERT OR REPLACE INTO clients
            (id, name, email, phone, compartment, interest, status,
             created_date, last_contact, next_action, next_action_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                client_data["id"],
                client_data["name"],
                client_data.get("email"),
                client_data.get("phone"),
                client_data["compartment"],
                client_data.get("interest", 3),
                client_data.get("status", "ACTIVE"),
                client_data.get("created_date"),
                client_data.get("last_contact"),
                client_data.get("next_action"),
                client_data.get("next_action_date"),
            ),
        )
        conn.commit()
        conn.close()

    def get_all_clients(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM clients ORDER BY name")
        cols = [d[0] for d in c.description]
        rows = c.fetchall()
        conn.close()
        return [dict(zip(cols, row)) for row in rows]

    def get_client(self, client_id):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
        row = c.fetchone()
        conn.close()
        if not row:
            return None
        cols = ["id", "name", "email", "phone", "compartment", "interest", "status", "created_date", "last_contact", "next_action", "next_action_date"]
        return dict(zip(cols, row))

    def get_pipeline_counts(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT compartment, COUNT(*) FROM clients WHERE status = 'ACTIVE' GROUP BY compartment")
        counts = dict(c.fetchall())
        conn.close()
        return counts

    def add_call(self, client_id, duration_minutes, notes):
        import uuid
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        call_id = str(uuid.uuid4())[:8]
        call_date = datetime.now().isoformat()
        c.execute(
            "INSERT INTO calls (id, client_id, call_date, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)",
            (call_id, client_id, call_date, duration_minutes, notes),
        )
        c.execute("UPDATE clients SET last_contact = ? WHERE id = ?", (call_date, client_id))
        conn.commit()
        conn.close()
        return call_id

    def seed_from_json(self, json_path):
        """Load clients from sample_clients.json into database."""
        with open(json_path, "r") as f:
            clients = json.load(f)
        for c in clients:
            client_data = {k: v for k, v in c.items() if k not in ("disc", "ilwe", "red_flags", "green_flags")}
            self.add_client(client_data)
