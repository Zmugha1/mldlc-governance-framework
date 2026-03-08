"""
Document loader for RAG system.
Supports PDFs, Word docs, text files, and web pages.
"""
from pathlib import Path
from typing import List, Dict

from pypdf import PdfReader
import docx2txt
import requests
from bs4 import BeautifulSoup


class DocumentLoader:
    """Load documents from various sources."""

    def __init__(self):
        self.supported_extensions = [".pdf", ".docx", ".txt", ".md"]

    def load_pdf(self, file_path: str) -> Dict:
        """Load text from PDF file."""
        text = ""
        with open(file_path, "rb") as f:
            reader = PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return {"source": file_path, "content": text, "type": "pdf", "pages": len(reader.pages)}

    def load_docx(self, file_path: str) -> Dict:
        """Load text from Word document."""
        text = docx2txt.process(file_path)
        return {"source": file_path, "content": text, "type": "docx"}

    def load_txt(self, file_path: str) -> Dict:
        """Load text from text file."""
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        return {"source": file_path, "content": text, "type": "txt"}

    def load_webpage(self, url: str) -> Dict:
        """Load text from web page."""
        response = requests.get(url, timeout=30)
        soup = BeautifulSoup(response.content, "html.parser")
        for script in soup(["script", "style"]):
            script.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return {"source": url, "content": text, "type": "webpage", "title": soup.title.string if soup.title else "Unknown"}

    def load_directory(self, directory: str) -> List[Dict]:
        """Load all supported documents from a directory."""
        documents = []
        dir_path = Path(directory)
        for file_path in dir_path.rglob("*"):
            if file_path.suffix.lower() in self.supported_extensions:
                try:
                    if file_path.suffix.lower() == ".pdf":
                        documents.append(self.load_pdf(str(file_path)))
                    elif file_path.suffix.lower() == ".docx":
                        documents.append(self.load_docx(str(file_path)))
                    elif file_path.suffix.lower() in [".txt", ".md"]:
                        documents.append(self.load_txt(str(file_path)))
                except Exception as e:
                    print(f"Error loading {file_path}: {e}")
        return documents

    def load_file(self, file_path: str) -> Dict:
        """Load a single file based on extension."""
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            return self.load_pdf(file_path)
        elif ext == ".docx":
            return self.load_docx(file_path)
        elif ext in [".txt", ".md"]:
            return self.load_txt(file_path)
        raise ValueError(f"Unsupported file type: {ext}")
