# RAG Optimizer MCP Server

Validates RAG implementations against Court of Rules best practices (RAG-001 to RAG-007).

## Tools

- `analyze_chunking` - Check chunking implementation
- `analyze_search` - Check vector vs hybrid search
- `validate_rag_pipeline` - Full pipeline validation
- `get_rag_best_practices` - Best practices summary

## Run

```bash
pip install fastmcp pyyaml
python -m mcp_servers.rag_optimizer.server
```

Or add to Cursor MCP config.
