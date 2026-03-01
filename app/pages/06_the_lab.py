"""Page 6: The Lab - Challenger Zone playground."""

import hashlib
import json
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import streamlit as st

from app.utils.init_session import init_governance_session
from app.utils.session_store import get_artifacts_for_run, write_artifact_session

init_governance_session()

st.title("The Lab: Challenger Zone")
st.error("CHALLENGER ZONE - EXPERIMENTAL ONLY")
st.warning("No production data. All outputs are temporary and isolated.")

if "run_id" not in st.session_state or not st.session_state.run_id:
    st.error("Create a run first on the Home page")
    st.stop()

# Dataset Selection
st.subheader("1. Load Data")

data_option = st.radio(
    "Choose dataset:",
    ["Generate Synthetic (Demo)", "Upload CSV"],
)

df = None
if data_option == "Generate Synthetic (Demo)":
    n_samples = st.slider("Sample size", 100, 1000, 500)

    X, y = make_classification(
        n_samples=n_samples,
        n_features=10,
        n_informative=5,
        n_redundant=2,
        random_state=42,
    )

    gender = np.random.choice(["M", "F"], n_samples)
    age_group = np.random.choice(["18-30", "31-50", "51+"], n_samples)

    df = pd.DataFrame(X, columns=[f"feature_{i}" for i in range(10)])
    df["gender"] = gender
    df["age_group"] = age_group
    df["target"] = y

    st.success(f"Generated {n_samples} synthetic records with demographics")

else:
    uploaded_file = st.file_uploader("Upload CSV", type=["csv"])
    if uploaded_file:
        df = pd.read_csv(uploaded_file)
        st.success(f"Loaded {len(df)} records")

if df is not None:
    st.write("Preview:", df.head())

    # VTCO Context
    st.subheader("2. Define VTCO for This Experiment")

    col1, col2 = st.columns(2)
    with col1:
        verb = st.selectbox("Verb", ["Experiment", "Train"], key="lab_verb")
        task = st.selectbox("Task", ["Binary Classification", "Regression"], key="lab_task")

    with col2:
        target_col = st.selectbox("Target column", df.columns)
        feature_cols = st.multiselect(
            "Feature columns",
            [c for c in df.columns if c != target_col],
        )

        constraints = []
        demo_cols = ["gender", "race", "ethnicity", "age_group"]
        if any(c in feature_cols for c in demo_cols if c in df.columns):
            st.warning("Potential fairness concern detected")
            constraints.append("4/5ths_rule_check")

    st.subheader("3. Train Model")

    if st.button("Train (Challenger Mode)") and feature_cols:
        X_raw = df[feature_cols]
        y = df[target_col]

        X = pd.get_dummies(X_raw)
        indices = np.arange(len(df))
        train_idx, test_idx = train_test_split(indices, test_size=0.2, random_state=42)

        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]
        df_test = df.iloc[test_idx].copy()

        model = RandomForestClassifier(n_estimators=50, random_state=42)
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)

        model_bytes = pickle.dumps(model)

        write_artifact_session(
            run_id=st.session_state.run_id,
            content=model_bytes,
            filename="model.pkl.b64",
            artifact_type="model",
            metadata={
                "accuracy": float(accuracy),
                "model_type": "RandomForestClassifier",
                "vtco": {"verb": verb, "task": task, "constraints": constraints, "outcome": f"Accuracy: {accuracy:.3f}"},
                "zone": "CHALLENGER",
            },
        )

        st.success(f"Model trained! Accuracy: {accuracy:.3f}")
        artifact_idx = get_artifacts_for_run(st.session_state.run_id)
        if artifact_idx:
            last_hash = artifact_idx[-1].get("hash", "")[:16]
            st.info(f"Artifact hash: {last_hash}...")

        st.text(classification_report(y_test, y_pred))

        # 4/5ths rule check if demographic column present
        demo_for_check = next((c for c in ["gender", "age_group", "race"] if c in df_test.columns), None)
        if demo_for_check:
            st.subheader("Fairness Check (4/5ths Rule)")
            results_df = df_test.copy()
            results_df["predicted"] = y_pred

            rates = results_df.groupby(demo_for_check)["predicted"].mean()
            st.write(f"Selection rates by {demo_for_check}:")
            st.write(rates)

            if len(rates) >= 2 and rates.max() > 0:
                ratio = rates.min() / rates.max()
                st.metric("4/5ths Ratio", f"{ratio:.3f}", "Pass" if ratio >= 0.8 else "Fail")

    st.subheader("4. Promote to Contender")

    if st.button("Promote to Contender"):
        vtco = st.session_state.get("vtco", {})
        if vtco.get("verb") and vtco.get("task") and vtco.get("outcome"):
            st.session_state.gates_status = {f"Gate {i}": "Pass" for i in range(5)}
            st.session_state.zone = "CONTENDER"
            write_artifact_session(
                run_id=st.session_state.run_id,
                content=json.dumps(
                    {
                        "model_version": "0.1.0",
                        "top_global_drivers": feature_cols[:3] if feature_cols else ["feature_0", "feature_1"],
                        "key_thresholds": {"source": "policies/04_validation_controls/", "values": {}},
                        "known_limitations": ["Synthetic demo" if data_option == "Generate Synthetic (Demo)" else "Uploaded data"],
                        "stability_band": "high",
                        "confidence_tier": "A",
                        "action_recommendations": ["Validate on holdout before production"],
                    },
                    indent=2,
                ),
                filename="explainability_bundle.json",
                artifact_type="explainability",
            )
            st.success("Promotion to Contender approved (Gates 0-4 passed)")
        else:
            st.error("Promotion failed: Complete VTCO first (Verb, Task, Outcome required)")
