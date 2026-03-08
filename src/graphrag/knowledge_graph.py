"""
Knowledge graph using NetworkX.
"""
import json
from typing import List, Dict, Optional
from pathlib import Path
import networkx as nx
from src.graphrag.entity_extractor import Entity, Relationship


class KnowledgeGraph:
    def __init__(self, name: str = "mldlc_knowledge"):
        self.name = name
        self.graph = nx.DiGraph()
        self.entity_index = {}

    def add_entity(self, entity: Entity) -> str:
        self.graph.add_node(
            entity.id, text=entity.text, label=entity.label,
            type=entity.type, source=entity.source, context=entity.context,
        )
        self.entity_index[entity.text.lower()] = entity.id
        return entity.id

    def add_relationship(self, rel: Relationship) -> bool:
        if rel.source_id in self.graph and rel.target_id in self.graph:
            self.graph.add_edge(
                rel.source_id, rel.target_id,
                relation_type=rel.relation_type, evidence=rel.evidence, confidence=rel.confidence,
            )
            return True
        return False

    def get_entity(self, entity_id: str) -> Optional[Dict]:
        if entity_id in self.graph:
            return {"id": entity_id, **dict(self.graph.nodes[entity_id])}
        return None

    def find_entity_by_text(self, text: str) -> Optional[str]:
        return self.entity_index.get(text.lower())

    def get_neighbors(self, entity_id: str, relation_type: Optional[str] = None) -> List[Dict]:
        neighbors = []
        for nid in self.graph.successors(entity_id):
            ed = self.graph.edges[entity_id, nid]
            if relation_type is None or ed.get("relation_type") == relation_type:
                n = self.get_entity(nid)
                if n:
                    n["relationship"] = {**ed, "from_id": entity_id}
                    neighbors.append(n)
        return neighbors

    def traverse(self, start_id: str, max_depth: int = 3) -> List[List[Dict]]:
        paths, visited = [], set()

        def dfs(cid: str, path: List[Dict], depth: int):
            if depth > max_depth or cid in visited:
                return
            visited.add(cid)
            ent = self.get_entity(cid)
            if ent:
                path.append(ent)
                if depth > 0:
                    paths.append(path.copy())
                for nid in self.graph.successors(cid):
                    dfs(nid, path, depth + 1)
                path.pop()
            visited.discard(cid)

        dfs(start_id, [], 0)
        return paths

    def find_connection(self, a: str, b: str, max_depth: int = 5) -> Optional[List[Dict]]:
        a = self.find_entity_by_text(a) if a not in self.graph else a
        b = self.find_entity_by_text(b) if b not in self.graph else b
        if not a or not b:
            return None
        try:
            path = nx.shortest_path(self.graph, a, b)
            return [self.get_entity(eid) for eid in path]
        except nx.NetworkXNoPath:
            return None

    def get_stats(self) -> Dict:
        types = {self.graph.nodes[n].get("type") for n in self.graph.nodes() if self.graph.nodes[n].get("type")}
        rels = {d.get("relation_type") for _, _, d in self.graph.edges(data=True) if d.get("relation_type")}
        return {
            "entity_count": self.graph.number_of_nodes(),
            "relationship_count": self.graph.number_of_edges(),
            "entity_types": list(types),
            "relation_types": list(rels),
        }

    def save(self, filepath: str):
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        data = {
            "name": self.name,
            "nodes": [{"id": n, **self.graph.nodes[n]} for n in self.graph.nodes()],
            "edges": [{"source": u, "target": v, **d} for u, v, d in self.graph.edges(data=True)],
            "entity_index": self.entity_index,
        }
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

    def load(self, filepath: str):
        with open(filepath) as f:
            data = json.load(f)
        self.name = data.get("name", "mldlc_knowledge")
        self.entity_index = data.get("entity_index", {})
        self.graph = nx.DiGraph()
        for node in data.get("nodes", []):
            nid = node.pop("id")
            self.graph.add_node(nid, **node)
        for edge in data.get("edges", []):
            u, v = edge.pop("source"), edge.pop("target")
            self.graph.add_edge(u, v, **edge)
