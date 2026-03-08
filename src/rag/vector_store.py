"""Vector store using ChromaDB."""
import os
from pathlib import Path
from typing import List, Dict
import chromadb


class VectorStore:
    def __init__(self, collection_name: str = "mldlc_knowledge", persist_dir: str = None):
        if persist_dir is None:
            base = Path(__file__).resolve().parent.parent.parent
            persist_dir = os.getenv("MLDLC_VECTOR_DB_PATH", str(base / "data" / "vector_db" / "chroma"))
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.collection = self.client.get_or_create_collection(name=collection_name, metadata={"hnsw:space": "cosine"})

    def add_chunks(self, chunks: List[Dict]) -> int:
        ids, documents, embeddings, metadatas = [], [], [], []
        for i, chunk in enumerate(chunks):
            ids.append(f"{chunk.get('source', 'unknown')}_{chunk.get('chunk_index', i)}")
            documents.append(chunk["content"])
            embeddings.append(chunk["embedding"])
            metadatas.append({k: str(v) for k, v in chunk.items() if k not in ["content", "embedding"]})
        self.collection.add(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
        return len(chunks)

    def search(self, query_embedding: List[float], n_results: int = 5) -> List[Dict]:
        results = self.collection.query(query_embeddings=[query_embedding], n_results=n_results, include=["documents", "metadatas", "distances"])
        return [{"content": results["documents"][0][i], "metadata": results["metadatas"][0][i], "score": 1 - results["distances"][0][i]} for i in range(len(results["documents"][0]))]

    def get_collection_stats(self) -> Dict:
        return {"document_count": self.collection.count(), "collection_name": self.collection.name}
