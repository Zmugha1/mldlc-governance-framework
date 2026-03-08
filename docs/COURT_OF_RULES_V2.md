# Court of Rules System for MLDLC (v2.0)

## Overview

Modular, extensible Court of Rules with RAG & GraphRAG best practices (2025/2026).

## Critical Gaps Filled

| Component | Old Practice | 2025/2026 Best Practice |
|-----------|--------------|------------------------| 
| Chunking | Fixed-size 500 tokens | Structure-aware (headers/paragraphs) |
| Search | Pure vector | Hybrid (vector + BM25 keyword) |
| Fusion | None | Reciprocal Rank Fusion (RRF) |
| Reranking | None | Cross-encoder reranker |
| GraphRAG Extraction | LLM-based ($$$) | spaCy dependency parsing ($) |
| Graph Traversal | 5 hops deep | 1 hop + vector |

## Directory Structure

```
court-of-rules/
├── README.md
├── RULE_INDEX.json
├── meta-rules/
├── domain-rules/
│   ├── rag/          # RAG-001 to RAG-007
│   ├── graphrag/     # GRAG-001 to GRAG-006
│   ├── security/
│   ├── data/
│   ├── models/
│   ├── production/
│   ├── testing/
│   └── llm/
├── zone-rules/
└── custom-rules/
```

## Boring Defaults

```python
RAG_DEFAULTS = {
    "chunk_size": 512,
    "chunk_overlap": 0.15,
    "vector_top_n": 100,
    "bm25_top_n": 100,
    "rrf_k": 60,
    "rerank_top_m": 150,
    "final_top_k": 8
}

GRAG_DEFAULTS = {
    "extraction": "spacy",
    "traversal_depth": 1,
    "community_algorithm": "leiden"
}
```

## Cost Comparison

| Approach | Cost per 1MB | Quality |
|----------|--------------|---------|
| Basic RAG | $2-5 | 60-70% |
| Hybrid + Reranking | $4-10 | 85-95% |
| LLM GraphRAG | $5-20 | 90-95% |
| spaCy GraphRAG | $0.05 | 94% of LLM |

See `court-of-rules/` for full rule definitions.
