"""Text processing for RAG: chunking and cleaning."""
import re
from typing import List, Dict


class TextProcessor:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def clean_text(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"[^\w\s.,;:!?-]", "", text)
        return text.strip()

    def chunk_text(self, text: str, metadata: Dict = None) -> List[Dict]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk_words = words[i : i + self.chunk_size]
            chunk_data = {"content": " ".join(chunk_words), "chunk_index": len(chunks), "word_count": len(chunk_words)}
            if metadata:
                chunk_data.update(metadata)
            chunks.append(chunk_data)
        return chunks

    def process_document(self, document: Dict) -> List[Dict]:
        cleaned = self.clean_text(document["content"])
        metadata = {"source": document.get("source", "unknown"), "type": document.get("type", "unknown")}
        return self.chunk_text(cleaned, metadata)
