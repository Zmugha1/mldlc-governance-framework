"""Page 5: Explainability Bundle Viewer."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.utils.session_store import get_artifacts_for_run

init_governance_session()

st.title("Explainability Bundle Viewer")
st.markdown("Model version, top features, thresholds, limitations.")

if not st.session_state.run_id:
    st.warning("Create a run first")
else:
    artifacts = get_artifacts_for_run(st.session_state.run_id)
    explain_artifacts = [a for a in artifacts if "explainability" in a.get("filename", "").lower()]
    if not explain_artifacts:
        st.info("No explainability bundle yet. Run The Lab and promote to generate one.")
        st.json({
            "model_version": "0.1.0",
            "top_global_drivers": ["petal_length", "sepal_width", "petal_width"],
            "key_thresholds": {"source": "policies/04_validation_controls/", "values": {}},
            "known_limitations": ["Iris dataset only"],
            "stability_band": "high",
            "confidence_tier": "A",
            "action_recommendations": ["Use for iris species classification"],
        })
    else:
        key = f"{st.session_state.run_id}:explainability_bundle.json"
        if key in st.session_state.get("artifacts", {}):
            content = st.session_state.artifacts[key].decode("utf-8")
            bundle = json.loads(content)
            st.subheader("Model Version")
            st.write(bundle.get("model_version", "N/A"))
            st.subheader("Top Global Drivers")
            if bundle.get("top_global_drivers"):
                st.bar_chart({f: 1 for f in bundle["top_global_drivers"]})
            st.subheader("Key Thresholds")
            st.table(bundle.get("key_thresholds", {}))
            st.subheader("Known Limitations")
            for lim in bundle.get("known_limitations", []):
                st.write(f"- {lim}")
            st.subheader("Stability Band")
            st.write(bundle.get("stability_band", "N/A"))
            st.subheader("Action Recommendations")
            for rec in bundle.get("action_recommendations", []):
                st.write(f"- {rec}")
            st.download_button("Download JSON", data=json.dumps(bundle, indent=2),
                file_name="explainability_bundle.json", mime="application/json")
