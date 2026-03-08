"""
GraphRAG retriever - vector search + graph traversal.
"""
import re
from typing import List, Dict, Optional
from src.rag.retriever import Retriever
from src.graphrag.knowledge_graph import KnowledgeGraph


class GraphRetriever:
    def __init__(self, vector_retriever: Retriever, knowledge_graph: KnowledgeGraph):
        self.vector_retriever = vector_retriever
        self.knowledge_graph = knowledge_graph

    def retrieve(self, query: str, n_results: int = 5, graph_depth: int = 2, use_graph: bool = True) -> Dict:
        vector_results = []
        try:
            vector_results = self.vector_retriever.retrieve(query, n_results)
        except Exception:
            pass

        query_entities = re.findall(r"\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*\b", query)
        query_entities.extend(re.findall(r'"([^"]*)"', query))
        query_entities = list(set(query_entities))

        graph_context = []
        if use_graph and query_entities:
            for et in query_entities:
                eid = self.knowledge_graph.find_entity_by_text(et)
                if eid:
                    graph_context.extend(self.knowledge_graph.traverse(eid, max_depth=graph_depth))

        parts = []
        if vector_results:
            parts.append("## Relevant Documents:\n")
            for i, r in enumerate(vector_results, 1):
                src = r.get("metadata", {}).get("source", "unknown")
                parts.append(f"[{i}] {src}\n{(r.get('content') or '')[:500]}\n")
        if graph_context:
            parts.append("\n## Related Entities:\n")
            for path in graph_context[:3]:
                if len(path) > 1:
                    parts.append("- " + " → ".join(f"{e.get('text','?')} ({e.get('type','?')})" for e in path) + "\n")

        return {
            "vector_results": vector_results,
            "graph_context": graph_context,
            "query_entities": query_entities,
            "combined_context": "\n".join(parts) if parts else "No context found.",
        }

    def find_connections(self, entity_a: str, entity_b: str, max_depth: int = 5) -> Optional[Dict]:
        path = self.knowledge_graph.find_connection(entity_a, entity_b, max_depth)
        if path:
            return {
                "found": True,
                "path_length": len(path) - 1,
                "path": [{"name": e.get("text"), "type": e.get("type")} for e in path],
            }
        return {"found": False, "message": f"No connection between {entity_a} and {entity_b}"}
