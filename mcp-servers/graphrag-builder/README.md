# GraphRAG Builder MCP Server

Builds and optimizes knowledge graphs for GraphRAG (GRAG-001 to GRAG-006).

## Tools

- `extract_entities_spacy` - Extract entities using spaCy (cost-efficient)
- `one_hop_traversal` - 1-hop graph traversal
- `get_graphrag_best_practices` - Best practices summary

## Run

```bash
pip install fastmcp spacy
python -m spacy download en_core_web_sm
python server.py
```
