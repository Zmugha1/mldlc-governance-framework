"""Logging system - activity, errors, queries."""
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
            user_action TEXT,
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
    c.execute("""
        CREATE TABLE IF NOT EXISTS query_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            query TEXT,
            execution_time_ms REAL,
            rows_affected INTEGER,
            page TEXT
        )
    """)
    conn.commit()
    conn.close()


def log_activity(
    action: str,
    client_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    page: Optional[str] = None,
):
    """Log a user activity."""
    import json
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    ts = datetime.now().isoformat()
    details_str = json.dumps(details) if details else None
    c.execute(
        "INSERT INTO activity_log (timestamp, user_action, client_id, details, page) VALUES (?, ?, ?, ?, ?)",
        (ts, action, client_id, details_str, page),
    )
    conn.commit()
    conn.close()
    print(f"[ACTIVITY] {ts} | {action} | Client: {client_id} | Page: {page}")


def log_error(
    error: Exception,
    page: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
):
    """Log an error with stack trace."""
    import json
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    ts = datetime.now().isoformat()
    err_type = type(error).__name__
    err_msg = str(error)
    stack = traceback.format_exc()
    c.execute(
        "INSERT INTO error_log (timestamp, error_type, error_message, page, stack_trace) VALUES (?, ?, ?, ?, ?)",
        (ts, err_type, err_msg, page, stack),
    )
    conn.commit()
    conn.close()
    print(f"[ERROR] {ts} | {err_type} | {err_msg} | Page: {page}")


def log_query(
    query: str,
    execution_time_ms: float,
    rows_affected: int = 0,
    page: Optional[str] = None,
):
    """Log a database query."""
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    ts = datetime.now().isoformat()
    c.execute(
        "INSERT INTO query_log (timestamp, query, execution_time_ms, rows_affected, page) VALUES (?, ?, ?, ?, ?)",
        (ts, query[:500], execution_time_ms, rows_affected, page),
    )
    conn.commit()
    conn.close()
    if execution_time_ms > 100:
        print(f"[SLOW QUERY] {ts} | {execution_time_ms:.2f}ms | {query[:80]}...")


def get_recent_activities(limit: int = 50) -> List[tuple]:
    """Get recent activities."""
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    c.execute(
        "SELECT timestamp, user_action, client_id, details, page FROM activity_log ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def get_recent_errors(limit: int = 50) -> List[tuple]:
    """Get recent errors."""
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    c.execute(
        "SELECT timestamp, error_type, error_message, page, stack_trace FROM error_log ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def get_recent_queries(limit: int = 50) -> List[tuple]:
    """Get recent queries."""
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    c.execute(
        "SELECT timestamp, query, execution_time_ms, rows_affected, page FROM query_log ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def get_activity_summary(days: int = 7) -> dict:
    """Get activity summary for last N days."""
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    since = (datetime.now() - timedelta(days=days)).isoformat()

    c.execute("SELECT COUNT(*) FROM activity_log WHERE timestamp >= ?", (since,))
    total_activities = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM error_log WHERE timestamp >= ?", (since,))
    total_errors = c.fetchone()[0]

    c.execute(
        "SELECT page, COUNT(*) FROM activity_log WHERE timestamp >= ? GROUP BY page",
        (since,),
    )
    activities_by_page = dict(c.fetchall())

    conn.close()
    return {
        "total_activities": total_activities,
        "total_errors": total_errors,
        "activities_by_page": activities_by_page,
    }


def clear_logs(log_type: str = "all"):
    """Clear logs. log_type: 'all', 'activity', 'error', 'query'."""
    _init_log_tables()
    conn = _get_conn()
    c = conn.cursor()
    if log_type == "all":
        c.execute("DELETE FROM activity_log")
        c.execute("DELETE FROM error_log")
        c.execute("DELETE FROM query_log")
    elif log_type == "activity":
        c.execute("DELETE FROM activity_log")
    elif log_type == "error":
        c.execute("DELETE FROM error_log")
    elif log_type == "query":
        c.execute("DELETE FROM query_log")
    conn.commit()
    conn.close()
