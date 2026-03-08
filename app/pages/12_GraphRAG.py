"""GraphRAG Page - Knowledge graph + vector search for relationship queries"""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

st.set_page_config(page_title="GraphRAG", page_icon="🕸️", layout="wide")

st.title("🕸️ GraphRAG Knowledge Graph")
st.markdown("Relationship-based search: find connections between entities, not just similar text.")

st.markdown("""
**GraphRAG** combines vector search (RAG) with a knowledge graph. It extracts entities (people, orgs, locations)
and relationships from documents, then lets you query by connections: *"Who reports to X?"*, *"What depends on Y?"*
""")

# Paths
base = Path(__file__).resolve().parent.parent.parent
kg_path = base / "data" / "knowledge_graph" / "graph.json"
kg_path.parent.mkdir(parents=True, exist_ok=True)

st.markdown("---")
st.subheader("📊 Graph Status")

try:
    from src.graphrag.knowledge_graph import KnowledgeGraph
    kg = KnowledgeGraph()
    if kg_path.exists():
        kg.load(str(kg_path))
    stats = kg.get_stats()
    st.success(f"**{stats['entity_count']}** entities, **{stats['relationship_count']}** relationships")
    if stats.get("entity_types"):
        st.caption(f"Types: {', '.join(stats['entity_types'])}")
except Exception as e:
    st.info("No graph yet. Index documents below.")

st.markdown("---")
st.subheader("📥 Index Documents with Graph")

with st.expander("Extract entities and relationships from documents"):
    index_path = st.text_input("Path to index", value="./governance", key="gr_index_path")
    if st.button("Index with Graph", key="gr_index_btn"):
        if not index_path:
            st.warning("Enter a path.")
        else:
            try:
                from src.rag.document_loader import DocumentLoader
                from src.rag.text_processor import TextProcessor
                from src.rag.embedding_service import EmbeddingService
                from src.rag.vector_store import VectorStore
                from src.graphrag.entity_extractor import EntityExtractor
                from src.graphrag.knowledge_graph import KnowledgeGraph

                full = (base / index_path.lstrip("./")).resolve()
                if not full.exists():
                    st.error(f"Path not found: {full}")
                else:
                    with st.spinner("Loading, extracting entities, embedding..."):
                        loader = DocumentLoader()
                        processor = TextProcessor()
                        extractor = EntityExtractor()
                        kg = KnowledgeGraph()

                        if full.is_dir():
                            docs = loader.load_directory(str(full))
                        else:
                            docs = [loader.load_file(str(full))]

                        ent_count, rel_count = 0, 0
                        for doc in docs:
                            entities, rels = extractor.process_document(doc)
                            for e in entities:
                                kg.add_entity(e)
                                ent_count += 1
                            for r in rels:
                                if kg.add_relationship(r):
                                    rel_count += 1

                        kg.save(str(kg_path))

                        # Also index for vector search
                        try:
                            embedder = EmbeddingService()
                            store = VectorStore(collection_name="mldlc_graphrag")
                            all_chunks = []
                            for doc in docs:
                                all_chunks.extend(processor.process_document(doc))
                            chunks = embedder.embed_chunks(all_chunks)
                            store.add_chunks(chunks)
                        except Exception:
                            pass

                        st.success(f"Indexed **{ent_count}** entities, **{rel_count}** relationships.")
                        st.rerun()
            except Exception as e:
                st.error(str(e))

st.markdown("---")
st.subheader("🔎 Search with Graph")

tab1, tab2, tab3 = st.tabs(["Hybrid Search", "Entity Connections", "Find Path Between"])

with tab1:
    q = st.text_input("Query", placeholder="e.g. Which customers are connected to Acme?", key="gr_q")
    if st.button("Search", key="gr_search") and q:
        try:
            from src.rag.retriever import Retriever
            from src.rag.vector_store import VectorStore
            from src.rag.embedding_service import EmbeddingService
            from src.graphrag.knowledge_graph import KnowledgeGraph
            from src.graphrag.graph_retriever import GraphRetriever

            kg = KnowledgeGraph()
            if kg_path.exists():
                kg.load(str(kg_path))
            vr = Retriever(VectorStore(collection_name="mldlc_graphrag"), EmbeddingService())
            gr = GraphRetriever(vr, kg)
            out = gr.retrieve(q, n_results=5, graph_depth=2)
            st.write("**Combined context:**")
            st.text(out["combined_context"])
            if out.get("query_entities"):
                st.caption(f"Entities in query: {out['query_entities']}")
        except Exception as e:
            st.error(str(e))

with tab2:
    ent_name = st.text_input("Entity name", placeholder="e.g. Acme Corp", key="gr_ent")
    if st.button("Get Connections", key="gr_conn") and ent_name:
        try:
            from src.graphrag.knowledge_graph import KnowledgeGraph
            kg = KnowledgeGraph()
            if kg_path.exists():
                kg.load(str(kg_path))
            eid = kg.find_entity_by_text(ent_name)
            if not eid:
                st.warning(f"Entity '{ent_name}' not found.")
            else:
                neighbors = kg.get_neighbors(eid)
                paths = kg.traverse(eid, max_depth=2)
                st.write(f"**Direct connections:** {len(neighbors)}")
                for n in neighbors[:10]:
                    st.write(f"- {n.get('text')} ({n.get('type')}) — {n.get('relationship',{}).get('relation_type','related')}")
                st.write(f"**Paths found:** {len(paths)}")
                for p in paths[:5]:
                    if len(p) > 1:
                        st.write(" → ".join(e.get("text", "?") for e in p))
        except Exception as e:
            st.error(str(e))

with tab3:
    c1, c2 = st.columns(2)
    with c1:
        ea = st.text_input("Entity A", key="gr_ea")
    with c2:
        eb = st.text_input("Entity B", key="gr_eb")
    if st.button("Find Path", key="gr_path") and ea and eb:
        try:
            from src.graphrag.knowledge_graph import KnowledgeGraph
            kg = KnowledgeGraph()
            if kg_path.exists():
                kg.load(str(kg_path))
            path = kg.find_connection(ea, eb, max_depth=5)
            if path:
                st.success("Path found:")
                st.write(" → ".join(e.get("text", "?") for e in path))
            else:
                st.info("No path found.")
        except Exception as e:
            st.error(str(e))

st.markdown("---")
st.subheader("📖 RAG vs GraphRAG")
st.markdown("""
| Use RAG for | Use GraphRAG for |
|-------------|-----------------|
| Simple fact lookup | Finding relationships |
| Document search | Multi-hop questions |
| "What does X say?" | "Who is connected to X?" |
| | "What depends on Y?" |
""")
