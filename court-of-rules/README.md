# Court of Rules - MLDLC Governance (v2.0)

Modular, extensible rule system for MLDLC with RAG & GraphRAG best practices (2025/2026).

## Structure

- **meta-rules/** - Rules about rules (format, versioning, priority, hierarchy)
- **domain-rules/** - Domain-specific rules (security, data, models, production, testing, rag, graphrag, llm)
- **zone-rules/** - Zone-based enforcement (green, yellow, red)
- **custom-rules/** - User's custom rules (gitignored)

## RAG Best Practices (RAG-001 to RAG-007)

- Structure-aware chunking
- Hybrid search (vector + BM25)
- Reciprocal Rank Fusion (RRF)
- Cross-encoder reranking
- Embedding metadata
- Evaluation metrics
- Cost optimization

## GraphRAG Best Practices (GRAG-001 to GRAG-006)

- spaCy entity extraction (not LLM)
- Relationship mapping
- One-hop traversal
- Community detection
- Hybrid retrieval
- Incremental indexing

## Usage

Rules are loaded dynamically by MCP servers. Edit rule files and restart MCP to apply changes.
