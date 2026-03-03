#!/usr/bin/env python
"""Emergency workaround: Run MCP server with explicit path setup."""
import sys
import os

# Add repo root to path so 'mcp' module can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.mcp_server import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
