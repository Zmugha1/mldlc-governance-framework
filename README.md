# MLDLC Governance Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Machine Learning Development Lifecycle Governance Framework**
> 
> Transparent | Explainable | Auditable | Traceable

## Overview

The MLDLC Governance Framework establishes a comprehensive, transparent, and auditable system for managing the entire lifecycle of machine learning initiatives. Built on the VTCO (Verb-Task-Constraint-Outcome) methodology with RED/YELLOW/GREEN risk matrix classification.

## Quick Start

### Deploy to Streamlit Cloud

1. Fork this repository
2. Connect to [Streamlit Cloud](https://share.streamlit.io)
3. Deploy with main file: `app/main.py`

### Local Development

```bash
# Clone repository
git clone https://github.com/Zmugha1/mldlc-governance-framework.git
cd mldlc-governance-framework

# Install dependencies
pip install -r requirements.txt

# Run Streamlit app
streamlit run app/main.py

# Run MCP Server (separate terminal)
uvicorn mcp.mcp_server:app --reload --port 8000
```

## Repository Structure

```
mldlc-governance-framework/
├── app/                    # Streamlit application
├── schemas/                # JSON schemas for artifacts
├── process/                # VTCO process definitions
├── governance/              # Risk matrix and workflows
├── metrics/                # Metric configurations
├── taxonomy/               # Knowledge graph taxonomy
├── mcp/                    # Model Context Protocol server
└── tests/                  # Test suite
```

## Framework Components

### 1. VTCO Process Mapping
- 36 MLDLC steps across 6 phases
- Verb-Task-Constraint-Outcome definitions
- Complete validation criteria and artifacts

### 2. Risk Matrix
- **RED**: Human-Only (strategic decisions)
- **YELLOW**: Human-AI Augmented
- **GREEN**: Fully Automated

### 3. MCP Server
- Context retrieval and lineage traversal
- Confidence scoring with source attribution
- Anti-hallucination guardrails

### 4. Knowledge Graph
- Entity-relationship model for MLDLC concepts
- Lineage tracking from source to output

## Interactive Dashboards

| Dashboard | Description |
|-----------|-------------|
| VTCO Process Map | Explore all 36 MLDLC steps |
| Risk Matrix | Visualize risk distribution |
| ML Metrics | Technical metrics catalog |
| Leadership Dashboard | Business impact metrics |
| Knowledge Graph | Interactive entity exploration |
| MCP Server | API documentation |
| Artifact Validator | Schema validation |
| Lineage Tracker | Trace artifact lineage |
| Drift Monitor | Drift detection status |

## Troubleshooting

- **Port 8501 in use?** Run `streamlit run app/main.py --server.port 8502`
- **MCP import error?** Run from repo root: `$env:PYTHONPATH=$PWD; uvicorn mcp.mcp_server:app --port 8000`
- **Quick start:** Run `.\start.ps1` to launch both services

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more.

## License

MIT License - see [LICENSE](LICENSE) file.
