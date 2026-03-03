# start.ps1 - MLDLC Governance Framework Launcher
$ErrorActionPreference = "Stop"

Write-Host "Starting MLDLC Governance Framework..." -ForegroundColor Green

# Kill existing processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*streamlit*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -like "*uvicorn*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Ensure we're in repo root
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

# Ensure mcp/__init__.py exists (fixes module import)
if (-not (Test-Path "mcp/__init__.py")) {
    Write-Host "Creating mcp/__init__.py..." -ForegroundColor Yellow
    Set-Content -Path "mcp/__init__.py" -Value '"""MLDLC MCP Server Package"""'
}

# Set PYTHONPATH so Python finds the mcp module
$env:PYTHONPATH = $RepoRoot
Write-Host "PYTHONPATH: $env:PYTHONPATH" -ForegroundColor Cyan

# Start MCP Server - use run_mcp.py for reliable import (or direct mcp_server.py)
Write-Host "Starting MCP Server on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot'; `$env:PYTHONPATH='$RepoRoot'; python run_mcp.py" -WindowStyle Normal

Start-Sleep -Seconds 3

# Test if MCP is running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "MCP Server is running!" -ForegroundColor Green
} catch {
    Write-Host "MCP Server may still be starting. If issues persist, run: python run_mcp.py" -ForegroundColor Yellow
}

# Start Streamlit
Write-Host "`nServices:" -ForegroundColor Green
Write-Host "  Streamlit:  http://localhost:8501" -ForegroundColor White
Write-Host "  MCP Server: http://localhost:8000" -ForegroundColor White
Write-Host "`nStarting Streamlit (Ctrl+C to stop)..." -ForegroundColor Yellow
streamlit run app/main.py --server.port 8501
