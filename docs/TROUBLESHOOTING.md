# MLDLC Governance Framework - Troubleshooting Guide

## Issue 1: Port 8501 Already in Use

**Symptom:** `OSError: [Errno 98] Address already in use` or similar when starting Streamlit.

**Fix:**
```powershell
# Kill existing Streamlit processes
Get-Process | Where-Object {$_.ProcessName -like "*streamlit*"} | Stop-Process -Force

# Or use a different port
streamlit run app/main.py --server.port 8502
```

## Issue 2: MCP Server Module Import Error

**Symptom:** `ModuleNotFoundError: No module named 'mcp'` when running uvicorn.

**Root cause:** Missing `mcp/__init__.py` or wrong working directory.

**Fix 1 - Ensure `mcp/__init__.py` exists:**
```powershell
# Create if missing
New-Item -Path "mcp/__init__.py" -ItemType File -Force
```

**Fix 2 - Use run_mcp.py (recommended):**
```powershell
cd c:\Users\zumah\mldlc-governance-framework
python run_mcp.py
```

**Fix 3 - Run with PYTHONPATH:**
```powershell
cd c:\Users\zumah\mldlc-governance-framework
$env:PYTHONPATH = (Get-Location).Path
uvicorn mcp.mcp_server:app --reload --port 8000
```

**Fix 4 - Run mcp_server.py directly:**
```powershell
cd c:\Users\zumah\mldlc-governance-framework
python mcp/mcp_server.py
```

**Verify structure:**
```powershell
dir mcp\__init__.py
dir mcp\mcp_server.py
```

## Issue 3: CORS/XSRF Warning

**Symptom:** Browser console shows CORS or XSRF protection warnings.

**Fix:** Already configured in `.streamlit/config.toml`:
```toml
[server]
enableCORS = true
enableXsrfProtection = false
```

## Quick Start Script

Use `start.ps1` in the repo root to launch both services:
```powershell
.\start.ps1
```

This will:
1. Kill any existing Streamlit/uvicorn processes
2. Start MCP Server in a new window (port 8000)
3. Start Streamlit (port 8501)

## Alternative: Run on Different Ports

If ports conflict with other apps:
```powershell
# Streamlit on 8502
streamlit run app/main.py --server.port 8502

# MCP Server on 8001
uvicorn mcp.mcp_server:app --reload --port 8001
```

## Dependencies Not Found

```powershell
pip install -r requirements.txt
# Or for development
pip install -e .
```

## Most Likely Causes (MCP Import)

| Issue | Fix |
|-------|-----|
| Missing `mcp/__init__.py` | `New-Item mcp/__init__.py -ItemType File -Force` |
| Wrong directory | `cd` to folder containing `mcp/` |
| PYTHONPATH not set | `$env:PYTHONPATH = (Get-Location).Path` |
| Use emergency workaround | `python run_mcp.py` |

## Diagnostic Commands

```powershell
cd c:\Users\zumah\mldlc-governance-framework

# Test 1: Python path
python -c "import sys; print('sys.path:', sys.path[:3])"

# Test 2: Import mcp module
python -c "import mcp; print('mcp found at:', mcp.__file__)"

# Test 3: Import mcp_server
python -c "from mcp.mcp_server import app; print('OK')"
```
