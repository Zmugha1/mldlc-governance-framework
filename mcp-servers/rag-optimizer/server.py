#!/usr/bin/env python3
"""
RAG Optimizer MCP Server - Validates RAG implementations against best practices.
"""
import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

try:
    from fastmcp import FastMCP
    mcp = FastMCP("rag-optimizer")
except ImportError:
    mcp = None

_base = Path(__file__).resolve().parent.parent.parent
RULES_DIR = Path(os.getenv("RULES_DIR", str(_base / "court-of-rules" / "domain-rules" / "rag")))


class RAGRuleEngine:
    def __init__(self, rules_dir: Path):
        self.rules_dir = rules_dir
        self.rules: List[Dict] = []
        if rules_dir.exists():
            for f in rules_dir.glob("*.yaml"):
                try:
                    with open(f) as fp:
                        data = yaml.safe_load(fp)
                        if data and "rule" in data:
                            self.rules.append(data["rule"])
                except Exception:
                    pass

    def analyze_chunking(self, code: str) -> List[Dict]:
        findings = []
        if re.search(r'chunk_size\s*=\s*\d+[^,]*\n[^#]*text\.split\(\)', code):
            findings.append({"rule": "RAG-001", "issue": "Fixed-size chunking detected", "recommendation": "Use RecursiveCharacterTextSplitter", "severity": "high"})
        if "RecursiveCharacterTextSplitter" in code and "separators" in code:
            findings.append({"rule": "RAG-001", "issue": "Good: Structure-aware chunking", "status": "compliant"})
        return findings

    def analyze_search(self, code: str) -> List[Dict]:
        findings = []
        if re.search(r'collection\.query\([^)]*query_embeddings', code) and "bm25" not in code.lower():
            findings.append({"rule": "RAG-002", "issue": "Pure vector search detected", "recommendation": "Add BM25 hybrid search", "severity": "critical"})
        if "bm25" in code.lower():
            findings.append({"rule": "RAG-002", "issue": "Good: Hybrid search detected", "status": "compliant"})
        return findings

    def validate_rag_pipeline(self, code: str, zone: str = "yellow") -> Dict:
        all_f = self.analyze_chunking(code) + self.analyze_search(code)
        issues = [f for f in all_f if f.get("status") != "compliant"]
        critical = len([f for f in issues if f.get("severity") == "critical"])
        compliant = len([f for f in all_f if f.get("status") == "compliant"])
        score = (compliant / 2) * 100 if all_f else 0
        return {
            "findings": all_f,
            "issues_count": len(issues),
            "critical_count": critical,
            "compliance_score": round(score, 1),
            "passed": critical == 0 and score >= 75,
            "zone": zone,
            "timestamp": datetime.now().isoformat(),
        }


engine = RAGRuleEngine(RULES_DIR)

if mcp:
    @mcp.tool()
    def analyze_chunking(code: str) -> Dict:
        """Analyze chunking implementation."""
        findings = engine.analyze_chunking(code)
        return {"check": "chunking", "findings": findings, "compliant": not any(f.get("status") != "compliant" for f in findings)}

    @mcp.tool()
    def analyze_search(code: str) -> Dict:
        """Analyze search implementation."""
        findings = engine.analyze_search(code)
        return {"check": "search", "findings": findings, "compliant": not any(f.get("status") != "compliant" for f in findings)}

    @mcp.tool()
    def validate_rag_pipeline(code: str, zone: str = "yellow") -> Dict:
        """Validate RAG pipeline against best practices."""
        return engine.validate_rag_pipeline(code, zone)

    @mcp.tool()
    def get_rag_best_practices() -> Dict:
        """Get RAG best practices summary."""
        return {
            "practices": [
                {"id": "RAG-001", "name": "Structure-Aware Chunking", "impact": "10-20% better retrieval"},
                {"id": "RAG-002", "name": "Hybrid Search (vector+BM25)", "impact": "15-25% better recall"},
                {"id": "RAG-003", "name": "Reciprocal Rank Fusion", "impact": "Stable relevance"},
                {"id": "RAG-004", "name": "Cross-Encoder Reranking", "impact": "15-40% better precision"},
            ],
            "defaults": {"chunk_size": 512, "rrf_k": 60, "final_top_k": 8},
        }


if __name__ == "__main__":
    if mcp:
        mcp.run(transport="stdio")
    else:
        print("Install fastmcp: pip install fastmcp")
