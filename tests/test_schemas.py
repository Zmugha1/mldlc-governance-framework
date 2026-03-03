"""Test JSON schema validation"""

import json
import pytest
from pathlib import Path

SCHEMAS_DIR = Path(__file__).parent.parent / "schemas"

def test_problem_charter_schema_exists():
    assert (SCHEMAS_DIR / "problem_charter_v1.schema.json").exists()

def test_model_card_schema_exists():
    assert (SCHEMAS_DIR / "model_card_v1.schema.json").exists()

def test_problem_charter_validation():
    import jsonschema
    with open(SCHEMAS_DIR / "problem_charter_v1.schema.json") as f:
        schema = json.load(f)
    valid_charter = {
        "charter_id": "CHARTER-CHA-240301",
        "version": "1.0",
        "created_at": "2024-03-01T00:00:00Z",
        "problem_statement": {"title": "Test Problem", "description": "A" * 50, "business_impact": "High"},
        "success_criteria": {"kpis": [], "targets": {}},
        "stakeholders": [{"name": "John", "role": "PM", "approval_authority": "approve"}]
    }
    jsonschema.validate(instance=valid_charter, schema=schema)
