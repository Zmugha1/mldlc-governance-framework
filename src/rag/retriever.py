"""Retriever for RAG queries."""
from typing import List, Dict
from src.rag.embedding_service import EmbeddingService
from src.rag.vector_store import VectorStore


class Retriever:
    def __init__(self, vector_store: VectorStore = None, embedding_service: EmbeddingService = None):
        self.vector_store = vector_store or VectorStore()
        self.embedding_service = embedding_service or EmbeddingService()

    def retrieve(self, query: str, n_results: int = 5) -> List[Dict]:
        query_embedding = self.embedding_service.create_embedding(query)
        return self.vector_store.search(query_embedding, n_results)
