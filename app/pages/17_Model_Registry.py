"""
Model Registry UI
Manage model versions, stages, and A/B tests
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import pandas as pd
import json
from src.mlops.model_registry import get_model_registry, ModelStage

st.set_page_config(page_title="Model Registry", page_icon="🤖", layout="wide")

st.title("🤖 Model Registry")
st.markdown("Manage ML model lifecycle: versioning, staging, and A/B testing")

model_registry = get_model_registry()

st.sidebar.header("Actions")

action = st.sidebar.radio(
    "Select Action",
    options=["📋 Browse Models", "➕ Register Model", "🔄 Stage Transition", "🧪 A/B Testing", "📊 Compare Models"]
)

if action == "📋 Browse Models":
    st.header("Registered Models")

    stage_filter = st.selectbox(
        "Filter by Stage",
        options=["All", "development", "staging", "production", "archived"]
    )

    stage = None if stage_filter == "All" else ModelStage(stage_filter)
    models = model_registry.list_models(stage=stage)

    if models:
        df = pd.DataFrame(models)
        st.dataframe(df[["name", "version", "stage", "created_at"]], use_container_width=True, hide_index=True)

        st.subheader("Model Details")
        for model in models[:10]:
            stage_emoji = {"development": "🔧", "staging": "🧪", "production": "✅", "archived": "📦"}.get(model["stage"], "❓")
            with st.expander(f"{stage_emoji} {model['name']} (v{model['version']}) - {model['stage']}"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Created:** {model['created_at']}")
                    if model.get("metrics"):
                        st.write("**Metrics:**")
                        for metric, value in model["metrics"].items():
                            st.write(f"  - {metric}: {value}")
                with col2:
                    if st.button("View Details", key=f"view_{model['name']}_{model['version']}"):
                        full_model = model_registry.get_model(model["name"], model["version"])
                        st.json(full_model)
    else:
        st.info("No models registered yet. Use 'Register Model' to add models.")

elif action == "➕ Register Model":
    st.header("Register New Model")

    with st.form("register_model"):
        name = st.text_input("Model Name", placeholder="churn-predictor")
        version = st.text_input("Version", placeholder="1.0.0")
        description = st.text_area("Description", placeholder="Customer churn prediction model")

        st.subheader("Performance Metrics")
        metric_names = st.text_input("Metric Names (comma-separated)", placeholder="accuracy, precision, recall")
        metric_values = st.text_input("Metric Values (comma-separated)", placeholder="0.85, 0.82, 0.78")

        st.subheader("Model Parameters")
        params = st.text_area("Parameters (JSON)", placeholder='{"algorithm": "xgboost", "n_estimators": 100}')

        artifacts = st.text_input("Artifacts (comma-separated)", placeholder="model.pkl, config.yaml")
        created_by = st.text_input("Created By", value="data-scientist")

        submitted = st.form_submit_button("Register Model", type="primary")

        if submitted and name and version:
            metrics = {}
            if metric_names and metric_values:
                names = [n.strip() for n in metric_names.split(",")]
                values = [float(v.strip()) for v in metric_values.split(",")]
                metrics = dict(zip(names, values))

            parameters = {}
            if params:
                try:
                    parameters = json.loads(params)
                except json.JSONDecodeError:
                    st.error("Invalid JSON in parameters")
                    st.stop()

            artifact_list = [a.strip() for a in artifacts.split(",") if a.strip()]

            success = model_registry.register_model(
                name=name,
                version=version,
                metrics=metrics,
                parameters=parameters,
                artifacts=artifact_list,
                created_by=created_by,
                description=description
            )
            if success:
                st.success(f"✅ Model '{name}' v{version} registered")
            else:
                st.error("❌ Failed to register model")
        elif submitted:
            st.error("❌ Model name and version are required")

elif action == "🔄 Stage Transition":
    st.header("Transition Model Stage")

    all_models = model_registry.list_models()

    if all_models:
        model_options = [f"{m['name']} (v{m['version']}) - {m['stage']}" for m in all_models]
        selected = st.selectbox("Select Model", options=model_options)

        if selected:
            name = selected.split(" (v")[0]
            version = selected.split("(v")[1].split(")")[0]

            model = model_registry.get_model(name, version)
            current_stage = model["stage"] if model else "unknown"

            st.write(f"**Current Stage:** {current_stage}")

            new_stage = st.selectbox("Transition To", options=["staging", "production", "archived"])
            reason = st.text_area("Reason for Transition", placeholder="Model passed validation tests")
            transitioned_by = st.text_input("Transitioned By", value="ml-engineer")

            if st.button("Transition Stage", type="primary"):
                success = model_registry.transition_stage(
                    name=name,
                    version=version,
                    to_stage=ModelStage(new_stage),
                    transitioned_by=transitioned_by,
                    reason=reason
                )
                if success:
                    st.success(f"✅ Model transitioned to {new_stage}")
                else:
                    st.error("❌ Failed to transition stage")
    else:
        st.info("No models available. Register models first.")

elif action == "🧪 A/B Testing":
    st.header("A/B Testing")

    tab1, tab2 = st.tabs(["Create Test", "View Tests"])

    with tab1:
        st.subheader("Create New A/B Test")

        prod_models = model_registry.list_models(stage=ModelStage.PRODUCTION)

        if len(prod_models) >= 2:
            test_name = st.text_input("Test Name", placeholder="churn-model-v1-vs-v2")

            model_options = [f"{m['name']} (v{m['version']})" for m in prod_models]
            col1, col2 = st.columns(2)
            with col1:
                model_a = st.selectbox("Model A (Control)", options=model_options)
            with col2:
                model_b = st.selectbox("Model B (Treatment)", options=model_options)

            traffic_split = st.slider("Traffic Split (Model A %)", 0, 100, 50)

            if st.button("Create A/B Test", type="primary") and test_name and model_a != model_b:
                name_a, version_a = model_a.replace(")", "").split(" (v")
                name_b, version_b = model_b.replace(")", "").split(" (v")

                success = model_registry.create_ab_test(
                    test_name=test_name,
                    model_a_name=name_a,
                    model_a_version=version_a,
                    model_b_name=name_b,
                    model_b_version=version_b,
                    traffic_split=traffic_split / 100
                )
                if success:
                    st.success(f"✅ A/B test '{test_name}' created")
                else:
                    st.error("❌ Failed to create test")
            elif model_a == model_b:
                st.warning("Select different models for A and B")
        else:
            st.warning("Need at least 2 production models for A/B testing")

    with tab2:
        st.subheader("Active Tests")
        st.info("A/B test management interface would show running tests here")

        st.subheader("Test Assignment Demo")
        test_id = st.text_input("Test ID", placeholder="ab_churn-model-v1-vs-v2_12345")
        user_id = st.text_input("User ID", placeholder="user_123")

        if st.button("Get Assignment"):
            if test_id and user_id:
                assignment = model_registry.get_ab_test_assignment(test_id, user_id)
                if assignment:
                    st.write(f"**Variant:** {assignment['variant']}")
                    st.write(f"**Model:** {assignment['model_name']} v{assignment['model_version']}")
                else:
                    st.warning("Test not found or not running")

elif action == "📊 Compare Models":
    st.header("Compare Models")

    all_models = model_registry.list_models()

    if len(all_models) >= 2:
        model_options = [f"{m['name']} (v{m['version']})" for m in all_models]

        col1, col2 = st.columns(2)
        with col1:
            model_a = st.selectbox("Model A", options=model_options, key="compare_a")
        with col2:
            model_b = st.selectbox("Model B", options=model_options, key="compare_b")

        if st.button("Compare", type="primary"):
            name_a, version_a = model_a.replace(")", "").split(" (v")
            name_b, version_b = model_b.replace(")", "").split(" (v")

            comparison = model_registry.compare_models(name_a, version_a, name_b, version_b)

            if "error" not in comparison:
                st.subheader("Comparison Results")

                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Model A:** {name_a} v{version_a}")
                    st.json(comparison["model_a"]["metrics"])
                with col2:
                    st.write(f"**Model B:** {name_b} v{version_b}")
                    st.json(comparison["model_b"]["metrics"])

                st.subheader("Differences")
                for metric, diff in comparison["differences"].items():
                    delta = diff["percent_diff"]
                    if delta > 0:
                        st.success(f"**{metric}:** +{delta:.1f}% (B is better)")
                    elif delta < 0:
                        st.error(f"**{metric}:** {delta:.1f}% (A is better)")
                    else:
                        st.info(f"**{metric}:** No difference")
            else:
                st.error(comparison["error"])
    else:
        st.info("Need at least 2 models to compare")

with st.expander("ℹ️ About Model Registry"):
    st.markdown("""
    **Model Registry** provides:
    - Version control - Track model iterations
    - Stage management - Development → Staging → Production
    - Performance tracking - Monitor metrics over time
    - A/B testing - Compare model variants
    - Lineage - Track model origins and dependencies

    **Best Practices:** Always version models, test in staging before production, use A/B testing for major changes.
    """)
