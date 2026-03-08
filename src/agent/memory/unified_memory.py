"""Unified Memory Manager - STM + Episodic + Semantic"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from collections import deque
import json
import sqlite3
from pathlib import Path


class UnifiedMemoryManager:
    def __init__(self, capacity: int = 20):
        self.stm = deque(maxlen=capacity)
        self.db_path = Path("data/agent_memory.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY, content TEXT, memory_type TEXT,
                    timestamp TEXT, importance REAL, metadata TEXT
                )
            """)

    def remember(self, content: Any, memory_type: str = "short_term", importance: float = 0.5):
        memory_id = f"mem_{datetime.utcnow().timestamp()}"

        if memory_type == "short_term":
            self.stm.append({"id": memory_id, "content": content, "importance": importance})

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO memories (id, content, memory_type, timestamp, importance, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (memory_id, json.dumps(content), memory_type, datetime.utcnow().isoformat(),
                  importance, json.dumps({})))

        return memory_id

    def recall(self, query: str, k: int = 5) -> List[Dict]:
        results = []
        query_lower = query.lower()

        # Search STM
        for mem in self.stm:
            if query_lower in str(mem["content"]).lower():
                results.append(mem)

        # Search DB
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("SELECT * FROM memories ORDER BY timestamp DESC LIMIT 100").fetchall()

        for row in rows:
            if query_lower in str(row[1]).lower():
                results.append({"id": row[0], "content": json.loads(row[1]) if row[1] else {}})

        return results[:k]


_memory = None


def get_unified_memory():
    global _memory
    if _memory is None:
        _memory = UnifiedMemoryManager()
    return _memory
