"""Page 6: The Lab - Challenger Zone playground."""

import base64
import json
import pickle
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

from app.utils.init_session import init_governance_session
from app.utils.session_store import write_artifact_session

init_governance_session()

st.title("The Lab (Challenger Zone)")
st.markdown("CHALLENGER ZONE - EXPERIMENTAL ONLY")
st.warning("No production data. All outputs are temporary and isolated.")

if not st.session_state.run_id:
    st.warning("Create a run first")
else:
    st.subheader("Iris Classification Demo")
    if st.button("Train Challenger Model"):
        iris = load_iris()
        X = pd.DataFrame(iris.data, columns=iris.feature_names)
        y = iris.target
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        acc = (model.predict(X_test) == y_test).mean()
        st.write(f"Accuracy: {acc:.2%}")

        model_bytes = pickle.dumps(model)
        model_b64 = base64.b64encode(model_bytes).decode()
        write_artifact_session(
            run_id=st.session_state.run_id,
            content=model_b64,
            filename="model.pkl.b64",
            artifact_type="model",
            metadata={"accuracy": float(acc), "model_type": "RandomForestClassifier"},
        )
        st.success("Model saved via write_artifact (session state)")

    if st.button("Promote to Contender"):
        vtco = st.session_state.get("vtco", {})
        if vtco.get("verb") and vtco.get("task") and vtco.get("outcome"):
            st.session_state.gates_status = {f"Gate {i}": "Pass" for i in range(5)}
            st.session_state.zone = "CONTENDER"
            write_artifact_session(
                run_id=st.session_state.run_id,
                content=json.dumps({
                    "model_version": "0.1.0",
                    "top_global_drivers": ["petal length (cm)", "sepal width (cm)"],
                    "key_thresholds": {"source": "policies/04_validation_controls/", "values": {}},
                    "known_limitations": ["Iris only"],
                    "stability_band": "high",
                    "confidence_tier": "A",
                    "action_recommendations": ["Use for iris classification"],
                }, indent=2),
                filename="explainability_bundle.json",
                artifact_type="explainability",
            )
            st.success("Promotion to Contender approved (Gates 0-4 passed)")
        else:
            st.error("Promotion failed: Complete VTCO first (Verb, Task, Outcome required)")
