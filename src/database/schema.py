"""Sandy Bot database schema and operations."""
import sqlite3
from datetime import datetime
import json


class SandyBotDatabase:
    def __init__(self, db_path="sandy_bot.db"):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Clients table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                compartment TEXT NOT NULL,
                interest_level INTEGER,
                status TEXT DEFAULT 'ACTIVE',
                created_date TIMESTAMP,
                last_contact TIMESTAMP,
                next_action TEXT,
                next_action_date TIMESTAMP
            )
        """)

        # I.L.W.E. goals
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ilwe_goals (
                client_id TEXT PRIMARY KEY,
                income_goal TEXT,
                lifestyle_goal TEXT,
                wealth_goal TEXT,
                equity_goal TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        """)

        # DISC profiles
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS disc_profiles (
                client_id TEXT PRIMARY KEY,
                style TEXT,
                drive_score INTEGER,
                influence_score INTEGER,
                steadiness_score INTEGER,
                compliance_score INTEGER,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        """)

        # Flags
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flags (
                id TEXT PRIMARY KEY,
                client_id TEXT,
                flag_type TEXT,
                description TEXT,
                detected_date TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        """)

        # Calls
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS calls (
                id TEXT PRIMARY KEY,
                client_id TEXT,
                call_date TIMESTAMP,
                duration_minutes INTEGER,
                notes TEXT,
                coaching_score REAL,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        """)

        conn.commit()
        conn.close()
