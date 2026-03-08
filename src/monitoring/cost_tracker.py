"""
Token Cost Monitoring System
Tracks LLM usage costs with budget enforcement and anomaly detection
"""
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from pathlib import Path
import threading


@dataclass
class CostEvent:
    """Single cost event"""
    timestamp: str
    model_id: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    user_id: str
    session_id: str
    operation_type: str  # 'chat', 'embedding', 'analysis', etc.


class CostTracker:
    """
    Real-time token cost tracking with budget enforcement

    Features:
    - Per-user, per-session, per-model cost tracking
    - Budget limits with hard/soft enforcement
    - Anomaly detection for cost spikes
    - Cost-based model routing
    """

    # Cost per 1K tokens (approximate, update as needed)
    MODEL_PRICING = {
        "gpt-4o": {"input": 0.0025, "output": 0.010},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        "claude-3-opus": {"input": 0.015, "output": 0.075},
        "claude-3-sonnet": {"input": 0.003, "output": 0.015},
        "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
        # Ollama models (local, effectively $0)
        "phi3:mini": {"input": 0.0, "output": 0.0},
        "llama3.1:8b": {"input": 0.0, "output": 0.0},
        "qwen2.5:0.8b": {"input": 0.0, "output": 0.0},
        "qwen2.5:4b": {"input": 0.0, "output": 0.0},
        "qwen3.5:0.8b": {"input": 0.0, "output": 0.0},
        "qwen3.5:4b": {"input": 0.0, "output": 0.0},
    }

    def __init__(self, db_path: str = "data/cost_tracking.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._budgets: Dict[str, Dict] = {}  # In-memory budget config
        self._alert_callbacks: List[Callable] = []
        self._lock = threading.Lock()

    def _init_db(self):
        """Initialize cost tracking database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cost_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    tokens_in INTEGER NOT NULL,
                    tokens_out INTEGER NOT NULL,
                    cost_usd REAL NOT NULL,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    operation_type TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cost_timestamp ON cost_events(timestamp)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cost_user ON cost_events(user_id)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cost_session ON cost_events(session_id)
            """)

            # Budget configuration table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS budget_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scope_type TEXT NOT NULL,
                    scope_id TEXT NOT NULL,
                    budget_limit REAL NOT NULL,
                    period TEXT NOT NULL,
                    hard_limit INTEGER NOT NULL DEFAULT 0,
                    alert_threshold REAL NOT NULL DEFAULT 0.8,
                    created_at TEXT NOT NULL
                )
            """)

    def set_budget(self, scope_type: str, scope_id: str, budget_limit: float,
                   period: str = "monthly", hard_limit: bool = False,
                   alert_threshold: float = 0.8):
        """
        Set a budget limit

        Args:
            scope_type: 'global', 'user', 'session', or 'model'
            scope_id: Identifier for the scope
            budget_limit: Maximum USD allowed
            period: 'daily', 'weekly', 'monthly'
            hard_limit: If True, block requests when exceeded
            alert_threshold: Alert when this % of budget is used (0.0-1.0)
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO budget_config
                (scope_type, scope_id, budget_limit, period, hard_limit, alert_threshold, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (scope_type, scope_id, budget_limit, period,
                  int(hard_limit), alert_threshold, datetime.utcnow().isoformat()))

        key = f"{scope_type}:{scope_id}:{period}"
        self._budgets[key] = {
            "limit": budget_limit,
            "period": period,
            "hard_limit": hard_limit,
            "alert_threshold": alert_threshold
        }

    def calculate_cost(self, model_id: str, tokens_in: int, tokens_out: int) -> float:
        """Calculate cost for a given model and token count"""
        pricing = self.MODEL_PRICING.get(model_id, {"input": 0.001, "output": 0.002})

        input_cost = (tokens_in / 1000) * pricing["input"]
        output_cost = (tokens_out / 1000) * pricing["output"]

        return round(input_cost + output_cost, 6)

    def record_usage(self, model_id: str, tokens_in: int, tokens_out: int,
                    user_id: str, session_id: str,
                    operation_type: str = "chat") -> Dict:
        """
        Record token usage and check budget

        Returns:
            Dict with cost info and budget status
        """
        cost = self.calculate_cost(model_id, tokens_in, tokens_out)

        event = CostEvent(
            timestamp=datetime.utcnow().isoformat(),
            model_id=model_id,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=cost,
            user_id=user_id,
            session_id=session_id,
            operation_type=operation_type
        )

        with self._lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO cost_events
                    (timestamp, model_id, tokens_in, tokens_out, cost_usd, user_id, session_id, operation_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (event.timestamp, event.model_id, event.tokens_in,
                      event.tokens_out, event.cost_usd, event.user_id,
                      event.session_id, event.operation_type))

        # Check budgets
        budget_status = self._check_budgets(user_id, session_id, model_id, cost)

        result = {
            "cost_usd": cost,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "total_tokens": tokens_in + tokens_out,
            "budget_status": budget_status
        }

        # Trigger alerts if needed
        if budget_status.get("alert_triggered"):
            self._trigger_alert(result)

        return result

    def _check_budgets(self, user_id: str, session_id: str, model_id: str,
                       current_cost: float) -> Dict:
        """Check all applicable budgets"""
        status = {"allowed": True, "violations": [], "alert_triggered": False}

        # Check scopes in priority order
        scopes = [
            ("session", session_id),
            ("user", user_id),
            ("model", model_id),
            ("global", "all")
        ]

        for scope_type, scope_id in scopes:
            for period in ["daily", "weekly", "monthly"]:
                key = f"{scope_type}:{scope_id}:{period}"
                budget = self._budgets.get(key)

                if budget:
                    spent = self._get_spent(scope_type, scope_id, period)
                    remaining = budget["limit"] - spent

                    if spent >= budget["limit"] and budget["hard_limit"]:
                        status["allowed"] = False
                        status["violations"].append({
                            "scope": key,
                            "reason": "Budget exceeded",
                            "spent": spent,
                            "limit": budget["limit"]
                        })
                    elif spent >= budget["limit"] * budget["alert_threshold"]:
                        status["alert_triggered"] = True
                        status["alert_details"] = {
                            "scope": key,
                            "spent": spent,
                            "limit": budget["limit"],
                            "percentage": (spent / budget["limit"]) * 100
                        }

        return status

    def _get_spent(self, scope_type: str, scope_id: str, period: str) -> float:
        """Get total cost for a scope in the given period"""
        now = datetime.utcnow()

        if period == "daily":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "weekly":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        else:  # monthly
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Build query based on scope
        if scope_type == "global":
            query = "SELECT SUM(cost_usd) FROM cost_events WHERE timestamp >= ?"
            params = (start.isoformat(),)
        else:
            column = "user_id" if scope_type == "user" else scope_type + "_id"
            query = f"SELECT SUM(cost_usd) FROM cost_events WHERE {column} = ? AND timestamp >= ?"
            params = (scope_id, start.isoformat())

        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute(query, params).fetchone()

        return result[0] or 0.0

    def get_cost_summary(self, user_id: Optional[str] = None,
                        period: str = "daily") -> Dict:
        """Get cost summary for dashboard"""
        now = datetime.utcnow()

        if period == "daily":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "weekly":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        query = "SELECT * FROM cost_events WHERE timestamp >= ?"
        params = (start.isoformat(),)

        if user_id:
            query += " AND user_id = ?"
            params += (user_id,)

        with sqlite3.connect(self.db_path) as conn:
            events = conn.execute(query, params).fetchall()

        total_cost = sum(e[5] for e in events)  # cost_usd column
        total_tokens = sum(e[3] + e[4] for e in events)  # tokens_in + tokens_out

        # Group by model
        by_model = {}
        for e in events:
            model = e[2]
            by_model[model] = by_model.get(model, {"cost": 0, "tokens": 0})
            by_model[model]["cost"] += e[5]
            by_model[model]["tokens"] += e[3] + e[4]

        # Group by operation type
        by_operation = {}
        for e in events:
            op = e[8]
            by_operation[op] = by_operation.get(op, {"cost": 0, "count": 0})
            by_operation[op]["cost"] += e[5]
            by_operation[op]["count"] += 1

        return {
            "period": period,
            "total_cost_usd": round(total_cost, 4),
            "total_tokens": total_tokens,
            "request_count": len(events),
            "by_model": by_model,
            "by_operation": by_operation,
            "average_cost_per_request": round(total_cost / len(events), 6) if events else 0
        }

    def detect_anomalies(self, window_hours: int = 24,
                        threshold_std: float = 3.0) -> List[Dict]:
        """
        Detect cost anomalies using statistical methods

        Args:
            window_hours: Hours of history to analyze
            threshold_std: Number of standard deviations for anomaly detection
        """
        since = (datetime.utcnow() - timedelta(hours=window_hours)).isoformat()

        with sqlite3.connect(self.db_path) as conn:
            hourly_costs = conn.execute("""
                SELECT strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
                       SUM(cost_usd) as total_cost
                FROM cost_events
                WHERE timestamp >= ?
                GROUP BY hour
                ORDER BY hour
            """, (since,)).fetchall()

        if len(hourly_costs) < 3:
            return []  # Not enough data

        costs = [c[1] for c in hourly_costs]
        mean_cost = sum(costs) / len(costs)
        variance = sum((c - mean_cost) ** 2 for c in costs) / len(costs)
        std_cost = variance ** 0.5

        anomalies = []
        for hour, cost in hourly_costs:
            if std_cost > 0 and abs(cost - mean_cost) > threshold_std * std_cost:
                anomalies.append({
                    "hour": hour,
                    "cost": cost,
                    "mean": round(mean_cost, 4),
                    "std": round(std_cost, 4),
                    "deviation": round((cost - mean_cost) / std_cost, 2),
                    "severity": "high" if abs(cost - mean_cost) > 5 * std_cost else "medium"
                })

        return anomalies

    def register_alert_callback(self, callback: Callable):
        """Register a callback for budget alerts"""
        self._alert_callbacks.append(callback)

    def _trigger_alert(self, alert_data: Dict):
        """Trigger all registered alert callbacks"""
        for callback in self._alert_callbacks:
            try:
                callback(alert_data)
            except Exception as e:
                print(f"Alert callback failed: {e}")


# Singleton instance
_cost_tracker: Optional[CostTracker] = None


def get_cost_tracker() -> CostTracker:
    """Get or create singleton cost tracker"""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = CostTracker()
    return _cost_tracker
