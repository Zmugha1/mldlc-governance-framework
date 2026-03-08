#!/usr/bin/env python3
"""
GraphRAG Builder MCP Server - Builds and optimizes knowledge graphs.
"""
import os
from pathlib import Path
from typing import Dict, List, Any

try:
    from fastmcp import FastMCP
    mcp = FastMCP("graphrag-builder")
except ImportError:
    mcp = None


if mcp:
    @mcp.tool()
    def extract_entities_spacy(text: str, model: str = "en_core_web_sm") -> Dict[str, Any]:
        """Extract entities using spaCy (cost-efficient)."""
        try:
            import spacy
            nlp = spacy.load(model)
            doc = nlp(text[:50000])
            entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
            return {
                "method": "spacy",
                "entities": entities,
                "entity_count": len(entities),
                "cost_estimate": "~$0.001 (spaCy is free)",
            }
        except ImportError:
            return {"error": "spacy not installed", "install": "pip install spacy && python -m spacy download en_core_web_sm"}
        except OSError:
            return {"error": f"Model {model} not found", "install": f"python -m spacy download {model}"}

    @mcp.tool()
    def one_hop_traversal(entity: str, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform 1-hop traversal from an entity."""
        neighbors = []
        for rel in graph_data.get("relationships", []):
            s, o = rel.get("subject", ""), rel.get("object", "")
            if s and o:
                if s.lower() == entity.lower():
                    neighbors.append({"entity": o, "relationship": rel.get("predicate", ""), "direction": "outgoing"})
                elif o.lower() == entity.lower():
                    neighbors.append({"entity": s, "relationship": rel.get("predicate", ""), "direction": "incoming"})
        return {"entity": entity, "neighbor_count": len(neighbors), "neighbors": neighbors}

    @mcp.tool()
    def get_graphrag_best_practices() -> Dict[str, Any]:
        """Get GraphRAG best practices summary."""
        return {
            "practices": [
                {"id": "GRAG-001", "name": "spaCy Entity Extraction", "cost": "100x cheaper than LLM"},
                {"id": "GRAG-002", "name": "Relationship Mapping", "tools": ["Neo4j", "NetworkX"]},
                {"id": "GRAG-003", "name": "One-Hop Traversal", "performance": "10x faster than deep"},
                {"id": "GRAG-004", "name": "Community Detection", "algorithm": "Leiden"},
                {"id": "GRAG-005", "name": "Hybrid Retrieval", "methods": ["global", "local", "drift"]},
                {"id": "GRAG-006", "name": "Incremental Indexing", "benefits": ["Faster updates", "No downtime"]},
            ],
            "cost_comparison": {"llm": "$5-20/1MB", "spacy": "$0.05/1MB", "savings": "100x"},
        }


if __name__ == "__main__":
    if mcp:
        mcp.run(transport="stdio")
    else:
        print("Install fastmcp: pip install fastmcp")
