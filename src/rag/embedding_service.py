"""Embedding service for RAG using OpenAI."""
import os
from typing import List, Dict
from openai import OpenAI


class EmbeddingService:
    def __init__(self, model: str = "text-embedding-3-small"):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model

    def create_embedding(self, text: str) -> List[float]:
        response = self.client.embeddings.create(model=self.model, input=text)
        return response.data[0].embedding

    def create_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        response = self.client.embeddings.create(model=self.model, input=texts)
        return [item.embedding for item in response.data]

    def embed_chunks(self, chunks: List[Dict]) -> List[Dict]:
        texts = [chunk["content"] for chunk in chunks]
        embeddings = self.create_embeddings_batch(texts)
        for chunk, embedding in zip(chunks, embeddings):
            chunk["embedding"] = embedding
        return chunks
