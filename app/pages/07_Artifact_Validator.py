"""Artifact Validator Page - Validate artifacts against JSON schemas"""

import streamlit as st
import json
from pathlib import Path

st.set_page_config(page_title="Artifact Validator", page_icon="✅", layout="wide")

st.title("✅ Artifact Validator")
st.markdown("Validate MLDLC artifacts against JSON schemas")

schemas_dir = Path(__file__).parent.parent.parent / "schemas"
schema_files = list(schemas_dir.glob("*.json")) if schemas_dir.exists() else []
schema_options = [f.name for f in schema_files] if schema_files else ["No schemas found"]

st.sidebar.header("Schema Selection")
selected_schema = st.sidebar.selectbox("Select Schema", options=schema_options, index=0)

st.subheader("Input Artifact JSON")
artifact_input = st.text_area("Paste artifact JSON below:", height=300, placeholder='{"charter_id": "CHARTER-CHA-240301", ...}')

if st.button("Validate"):
    if not artifact_input.strip():
        st.error("Please provide artifact JSON to validate.")
    elif selected_schema == "No schemas found":
        st.warning("No schemas available for validation.")
    else:
        try:
            artifact_data = json.loads(artifact_input)
            schema_path = schemas_dir / selected_schema
            if schema_path.exists():
                with open(schema_path) as f:
                    schema = json.load(f)
                try:
                    import jsonschema
                    jsonschema.validate(instance=artifact_data, schema=schema)
                    st.success("✅ Artifact is valid against the schema!")
                except jsonschema.ValidationError as e:
                    st.error(f"❌ Validation failed: {e.message}")
                    st.json({"path": list(e.path), "validator": e.validator})
            else:
                st.warning("Schema file not found. Validation skipped.")
        except json.JSONDecodeError as e:
            st.error(f"Invalid JSON: {e}")
