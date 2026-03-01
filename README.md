# MLDLC Governance Framework

**Governance-First ML Development** — A framework where Cursor physically cannot write code that bypasses your rules. Every artifact is traced, every threshold comes from policy, and every promotion requires passing stage gates.

## Quick Start

```bash
# Install dependencies
pip install -e .

# Run the Streamlit governance dashboard
streamlit run app/streamlit_app.py

# Run the Iris zone progression demo
python examples/iris_zone_demo.py
```

## Architecture

### Zoning & Stage Gates

| Zone | Gates | Environment |
|------|-------|-------------|
| **Challenger (Red)** | 0-2 | Local dev, no production data |
| **Contender (Yellow)** | 3-4 | Staging, full test coverage |
| **Champion (Green)** | 5-6 | Production, immutable, human-in-the-loop |

### The Seven Stage Gates

0. **Business Intent** — VTCO (Vision, Thesis, Constraints, Outcomes)
1. **Data Contract** — Schema, missingness, PII
2. **Feature Governance** — Dictionary, leakage detection
3. **Model Governance** — Allowed models, hyperparameters
4. **Validation Controls** — Baseline lift, 4/5ths rule, stability
5. **Deployment Controls** — Drift policy, rollback protocol
6. **Decision Traceability** — Artifacts hashed, explainability bundle

### Artifact Enforcement

**NO file writes except through `core.artifacts.write_artifact()`**

All outputs must be hashed (SHA-256), indexed in `artifacts_index.json`, and logged to `lineage.jsonl`.

## Directory Structure

```
policies/          # YAML law — read-only during runs
  00_business_intent/
  01_data_contracts/
  ...
core/              # Enforcement engine
  artifacts.py     # ONLY write path allowed
  gates.py         # Gate validation
  lineage.py       # Audit logging
agents/            # Orchestration
  router.py        # Cannot skip gates
  state.py         # Pydantic state
pipeline/steps/    # Gated step implementations
runs/<run_id>/     # Generated (gitignored)
  artifacts_index.json
  lineage.jsonl
  run_manifest.json
  explainability_bundle.json
```

## Streamlit Dashboard

5 pages:

1. **VTCO & Zone Control** — Initialize runs, set risk level
2. **Stage Gate Monitor** — Force gate checks, view status
3. **Artifact Registry** — Verify hashes, download explainability bundle
4. **The Lab (Challenger)** — Train models, promote to Contender
5. **Champion Deployment** — Read-only, drift monitoring, rollback

## Pre-commit Hooks

```bash
pip install pre-commit
pre-commit install
```

- `check_headers.py` — Ensures zone headers in governed code
- `check_thresholds.py` — Flags hardcoded thresholds

## MCP Server

`mcp/governance_server.py` exposes:

- `validate_code_compliance(code, zone)` — Detects banned patterns
- `check_gate_status(run_id, target_gate)` — Query lineage
- `generate_artifact_wrapper(filename, content_type)` — Code template
- `get_policy(policy_path)` — Load policy YAML

## Key Principles

- **Baseline lift not drift** — Primary success metric
- **4/5ths rule** — Fairness when domain requires
- **Policy-as-code** — Never hardcode thresholds
- **Human in the loop** — Default path for Champion promotions
