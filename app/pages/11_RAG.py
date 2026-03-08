"""RAG Page - Retrieval-Augmented Generation for MLDLC knowledge search"""

import sys
from pathlib import Path

# Ensure project root is in path
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

st.set_page_config(page_title="RAG Knowledge Search", page_icon="🔍", layout="wide")

st.title("🔍 RAG Knowledge Search")
st.markdown("Retrieval-Augmented Generation for MLDLC governance rules and documentation")

st.markdown("""
The **RAG (Retrieval-Augmented Generation)** system indexes your MLDLC rules, documentation, and tribal knowledge
into a vector database. Ask questions and get answers grounded in your indexed content.
""")

# Initialize session state
if "indexed" not in st.session_state:
    st.session_state.indexed = False

st.markdown("---")
st.subheader("📊 Index Status")

try:
    from src.rag.vector_store import VectorStore
    store = VectorStore()
    stats = store.get_collection_stats()
    st.success(f"**{stats['document_count']}** chunks indexed in `{stats['collection_name']}`")
except Exception as e:
    st.info("No index yet. Index documents below to get started.")

st.markdown("---")
st.subheader("📥 Index Documents")

with st.expander("Index MLDLC content for RAG search"):
    index_path = st.text_input("Path to index", value="./governance", help="Directory or file path (e.g. ./governance, ./docs)")
    if st.button("Index Documents", key="index_btn"):
        if not index_path:
            st.warning("Enter a path to index.")
        else:
            try:
                from src.rag.document_loader import DocumentLoader
                from src.rag.text_processor import TextProcessor
                from src.rag.embedding_service import EmbeddingService
                from src.rag.vector_store import VectorStore

                base = Path(__file__).resolve().parent.parent.parent
                full_path = (base / index_path.lstrip("./")).resolve()
                if not full_path.exists():
                    st.error(f"Path not found: {full_path}")
                else:
                    with st.spinner("Loading and indexing..."):
                        loader = DocumentLoader()
                        processor = TextProcessor()
                        embedder = EmbeddingService()
                        store = VectorStore()

                        if full_path.is_dir():
                            docs = loader.load_directory(str(full_path))
                        else:
                            docs = [loader.load_file(str(full_path))]

                        all_chunks = []
                        for doc in docs:
                            all_chunks.extend(processor.process_document(doc))

                        if not all_chunks:
                            st.warning("No documents found to index.")
                        else:
                            chunks = embedder.embed_chunks(all_chunks)
                            num = store.add_chunks(chunks)
                            st.success(f"Indexed **{num}** chunks from {len(docs)} document(s).")
                            st.rerun()
            except Exception as e:
                st.error(f"Indexing failed: {e}")
                if "OPENAI_API_KEY" in str(e) or "api_key" in str(e).lower():
                    st.info("Set OPENAI_API_KEY in your environment to use embeddings.")

st.markdown("---")
st.subheader("🔎 Search Knowledge")

query = st.text_input("Ask a question", placeholder="e.g. What does the risk matrix say about RED level?")
n_results = st.slider("Number of results", 1, 10, 5)

if st.button("Search", key="search_btn") and query:
    try:
        from src.rag.retriever import Retriever
        retriever = Retriever()
        results = retriever.retrieve(query, n_results)
        if not results:
            st.info("No results. Index documents first.")
        else:
            for i, r in enumerate(results, 1):
                with st.expander(f"**{i}. Score: {r['score']:.2f}** — {r['metadata'].get('source', 'unknown')}"):
                    st.write(r["content"])
    except Exception as e:
        st.error(f"Search failed: {e}")
        if "OPENAI_API_KEY" in str(e) or "api_key" in str(e).lower():
            st.info("Set OPENAI_API_KEY in your environment.")

st.markdown("---")
st.subheader("📖 How It Works")
st.markdown("""
1. **Index** – Load PDFs, Word docs, TXT, MD from a directory. Text is chunked and embedded via OpenAI.
2. **Store** – Embeddings are stored in ChromaDB (local vector DB).
3. **Search** – Your query is embedded and matched against stored chunks by similarity.
4. **Answer** – Use the retrieved context with an LLM to generate grounded answers.
""")
