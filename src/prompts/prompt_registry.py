"""
Prompt Registry - Versioned prompt management
A/B testing, performance tracking, security scanning
"""
import json
import sqlite3
import hashlib
import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass
class PromptVersion:
    """Version of a prompt"""
    prompt_id: str
    version: int
    content: str
    description: str
    variables: List[str]
    performance_score: float
    usage_count: int
    created_at: str
    created_by: str


class PromptRegistry:
    """Prompt version control: version history, A/B testing, performance, security scanning"""

    def __init__(self, db_path: str = "data/prompt_registry.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prompts (
                    prompt_id TEXT NOT NULL, version INTEGER NOT NULL, content TEXT NOT NULL,
                    description TEXT, variables TEXT, performance_score REAL DEFAULT 0,
                    usage_count INTEGER DEFAULT 0, created_at TEXT, created_by TEXT,
                    PRIMARY KEY (prompt_id, version))
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prompt_ab_tests (
                    test_id TEXT PRIMARY KEY, prompt_id TEXT NOT NULL,
                    version_a INTEGER NOT NULL, version_b INTEGER NOT NULL,
                    traffic_split REAL DEFAULT 0.5, status TEXT DEFAULT 'running',
                    winner_version INTEGER, start_date TEXT, end_date TEXT)
            """)

    def register_prompt(self, prompt_id: str, content: str,
                       description: str = "", created_by: str = "unknown") -> int:
        variables = self._extract_variables(content)
        security_report = self.scan_security(content)
        if security_report.get("issues"):
            for issue in security_report["issues"]:
                print(f"Warning: {issue['type']}: {issue.get('severity', 'unknown')}")
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT MAX(version) FROM prompts WHERE prompt_id = ?", (prompt_id,)).fetchone()
            version = (row[0] or 0) + 1
            conn.execute("""
                INSERT INTO prompts (prompt_id, version, content, description, variables, created_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (prompt_id, version, content, description, json.dumps(variables),
                  datetime.utcnow().isoformat(), created_by))
        return version

    def get_prompt(self, prompt_id: str, version: Optional[int] = None) -> Optional[PromptVersion]:
        with sqlite3.connect(self.db_path) as conn:
            if version:
                row = conn.execute("SELECT * FROM prompts WHERE prompt_id = ? AND version = ?", (prompt_id, version)).fetchone()
            else:
                row = conn.execute("SELECT * FROM prompts WHERE prompt_id = ? ORDER BY version DESC LIMIT 1", (prompt_id,)).fetchone()
        if not row:
            return None
        return PromptVersion(prompt_id=row[0], version=row[1], content=row[2], description=row[3] or "",
            variables=json.loads(row[4]) if row[4] else [], performance_score=row[5] or 0,
            usage_count=row[6] or 0, created_at=row[7] or "", created_by=row[8] or "")

    def render_prompt(self, prompt_id: str, variables: Dict[str, Any], version: Optional[int] = None) -> str:
        prompt = self.get_prompt(prompt_id, version)
        if not prompt:
            raise ValueError(f"Prompt '{prompt_id}' not found")
        content = prompt.content
        for var_name, var_value in variables.items():
            content = content.replace(f"{{{var_name}}}", str(var_value))
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE prompts SET usage_count = usage_count + 1 WHERE prompt_id = ? AND version = ?",
                         (prompt_id, prompt.version))
        return content

    def create_ab_test(self, prompt_id: str, version_a: int, version_b: int, traffic_split: float = 0.5) -> str:
        test_id = f"ab_{prompt_id}_{datetime.utcnow().timestamp()}"
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO prompt_ab_tests (test_id, prompt_id, version_a, version_b, traffic_split, start_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (test_id, prompt_id, version_a, version_b, traffic_split, datetime.utcnow().isoformat()))
        return test_id

    def get_ab_test_version(self, test_id: str, user_id: str) -> int:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT version_a, version_b, traffic_split FROM prompt_ab_tests WHERE test_id = ?", (test_id,)).fetchone()
        if not row:
            raise ValueError(f"A/B test '{test_id}' not found")
        version_a, version_b, split = row
        hash_val = int(hashlib.md5(f"{test_id}:{user_id}".encode()).hexdigest(), 16)
        return version_a if (hash_val % 100) / 100 < split else version_b

    def record_performance(self, prompt_id: str, version: int, score: float, metric: str = "quality"):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE prompts SET performance_score = (performance_score * usage_count + ?) / (usage_count + 1)
                WHERE prompt_id = ? AND version = ?
            """, (score, prompt_id, version))

    def scan_security(self, content: str) -> Dict[str, Any]:
        issues = []
        for pattern, issue_type, severity in [
            (r'ignore previous instructions', "instruction_override", "high"),
            (r'disregard.*prompt', "instruction_override", "high"),
            (r'you are now.*mode', "role_manipulation", "high"),
            (r'system prompt.*reveal', "prompt_leakage", "critical"),
            (r' DAN ', "jailbreak_attempt", "high"),
            (r'jailbreak', "jailbreak_attempt", "high"),
        ]:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append({"type": issue_type, "pattern": pattern, "severity": severity})
        for pattern, pii_type, severity in [
            (r'\b\d{3}-\d{2}-\d{4}\b', "SSN", "high"),
            (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', "credit_card", "critical"),
        ]:
            if re.search(pattern, content):
                issues.append({"type": "potential_pii", "pii_type": pii_type, "severity": severity})
        risk_score = sum({"critical": 1.0, "high": 0.5, "medium": 0.25}.get(i["severity"], 0) for i in issues)
        return {"safe": len(issues) == 0, "issues": issues, "risk_score": min(risk_score, 1.0)}

    def list_prompts(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("""
                SELECT prompt_id, MAX(version), description, performance_score, usage_count
                FROM prompts GROUP BY prompt_id ORDER BY prompt_id
            """).fetchall()
        return [{"prompt_id": row[0], "latest_version": row[1], "description": row[2],
                "performance_score": row[3], "usage_count": row[4]} for row in rows]

    def get_version_history(self, prompt_id: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("""
                SELECT version, description, performance_score, usage_count, created_at, created_by
                FROM prompts WHERE prompt_id = ? ORDER BY version DESC
            """, (prompt_id,)).fetchall()
        return [{"version": row[0], "description": row[1], "performance_score": row[2],
                "usage_count": row[3], "created_at": row[4], "created_by": row[5]} for row in rows]

    def _extract_variables(self, content: str) -> List[str]:
        return list(set(re.findall(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}', content)))


_registry = None

def get_prompt_registry() -> PromptRegistry:
    global _registry
    if _registry is None:
        _registry = PromptRegistry()
    return _registry
