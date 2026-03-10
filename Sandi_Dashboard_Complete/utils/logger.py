"""Activity and error logging."""
import json
import sqlite3
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "sandi_dashboard.db"


def _get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DB_PATH)


def _init_log_tables():
    conn = _get_conn()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            action_type TEXT,
            client_id TEXT,
            details TEXT,
            page TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS error_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            error_type TEXT,
            error_message TEXT,
            page TEXT,
            stack_trace TEXT
        )
    """)
    conn.commit()
    conn.close()


def log_activity(action: str, client_id: Optional[str] = None, details: Optional[Dict] = None, page: Optional[str] = None):
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    ts = datetime.now().isoformat()
    details_str = json.dumps(details) if details else None
    c.execute("INSERT INTO activity_log (timestamp, action_type, client_id, details, page) VALUES (?, ?, ?, ?, ?)",
              (ts, action, client_id, details_str, page))
    conn.commit()
    conn.close()
    print(f"[ACTIVITY] {ts} | {action} | Page: {page}")


def log_error(error: Exception, page: Optional[str] = None):
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    ts = datetime.now().isoformat()
    c.execute("INSERT INTO error_log (timestamp, error_type, error_message, page, stack_trace) VALUES (?, ?, ?, ?, ?)",
              (ts, type(error).__name__, str(error), page, traceback.format_exc()))
    conn.commit()
    conn.close()


def get_recent_activities(limit=50):
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    c.execute("SELECT timestamp, action_type, client_id, details, page FROM activity_log ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows


def get_recent_errors(limit=50):
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    c.execute("SELECT timestamp, error_type, error_message, page, stack_trace FROM error_log ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows


def clear_logs(log_type="all"):
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    if log_type == "all":
        c.execute("DELETE FROM activity_log")
        c.execute("DELETE FROM error_log")
    elif log_type == "activity":
        c.execute("DELETE FROM activity_log")
    elif log_type == "error":
        c.execute("DELETE FROM error_log")
    conn.commit()
    conn.close()
