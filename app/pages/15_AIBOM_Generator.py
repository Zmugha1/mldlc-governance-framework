"""
AIBOM Generator Page
Generate AI Bill of Materials for compliance and client delivery
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import json
from src.governance.aibom_generator import get_aibom_generator
from src.mlops.model_registry import get_model_registry
from src.governance.risk_classifier import get_risk_classifier

st.set_page_config(page_title="AIBOM Generator", page_icon="📋", layout="wide")

st.title("📋 AI Bill of Materials Generator")
st.markdown("Generate comprehensive documentation for AI systems")

aibom_gen = get_aibom_generator()
model_registry = get_model_registry()
risk_classifier = get_risk_classifier()

st.sidebar.header("System Configuration")

models = model_registry.list_models()
model_names = [m["name"] for m in models] if models else ["No models registered"]

selected_model = st.sidebar.selectbox("Select AI System", options=model_names)

st.sidebar.subheader("Or Configure Manually")
system_name = st.sidebar.text_input("System Name", value=selected_model if models else "Acme Churn Predictor")
use_case = st.sidebar.text_area("Use Case Description", value="Predict customer churn for manufacturing clients")

data_types = st.sidebar.multiselect(
    "Data Types Used",
    options=["customer_data", "transaction_history", "support_tickets", "demographics", "behavioral"],
    default=["customer_data", "transaction_history"]
)

decision_autonomy = st.sidebar.selectbox(
    "Decision Autonomy",
    options=["human_in_loop", "assisted", "full"],
    index=0
)

st.header("Generate Documentation")

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("📊 Generate AIBOM", type="primary", use_container_width=True):
        with st.spinner("Generating AI Bill of Materials..."):
            model_info = model_registry.get_model(selected_model) if models and selected_model != "No models registered" else None

            config = {
                "description": use_case,
                "use_case": use_case,
                "data_types": data_types,
                "decision_autonomy": decision_autonomy,
                "version": model_info["version"] if model_info else "1.0.0",
                "metrics": model_info.get("metrics", {}) if model_info else {},
                "training_sources": ["acme_customers.csv", "acme_orders.csv"],
                "training_size": "15,000 records",
                "architecture": "Gradient Boosting Classifier"
            }

            aibom = aibom_gen.generate(
                system_name=system_name,
                model_registry=model_registry if models else None,
                risk_classifier=risk_classifier,
                config=config
            )

            st.session_state["current_aibom"] = aibom
            st.success("✅ AIBOM generated successfully!")

with col2:
    if st.button("📄 Export Markdown", use_container_width=True):
        if "current_aibom" in st.session_state:
            aibom = st.session_state["current_aibom"]
            out_name = aibom.system_name.replace(" ", "_").lower()
            output_path = f"data/aibom_{out_name}.md"
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            aibom_gen.export_markdown(aibom, output_path)
            st.success(f"✅ Exported to {output_path}")
            with open(output_path, "r") as f:
                st.download_button("⬇️ Download Markdown", f.read(), file_name=f"{aibom.system_name.replace(' ', '_')}_AIBOM.md", mime="text/markdown")
        else:
            st.warning("⚠️ Generate AIBOM first")

with col3:
    if st.button("📊 Export JSON", use_container_width=True):
        if "current_aibom" in st.session_state:
            aibom = st.session_state["current_aibom"]
            out_name = aibom.system_name.replace(" ", "_").lower()
            output_path = f"data/aibom_{out_name}.json"
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            aibom_gen.export_json(aibom, output_path)
            st.success(f"✅ Exported to {output_path}")
            with open(output_path, "r") as f:
                st.download_button("⬇️ Download JSON", f.read(), file_name=f"{aibom.system_name.replace(' ', '_')}_AIBOM.json", mime="application/json")
        else:
            st.warning("⚠️ Generate AIBOM first")

if "current_aibom" in st.session_state:
    aibom = st.session_state["current_aibom"]

    st.header("AIBOM Preview")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("System", aibom.system_name)
    with col2:
        st.metric("Version", aibom.version)
    with col3:
        st.metric("Risk Tier", aibom.risk_tier.upper())
    with col4:
        st.metric("Generated", aibom.generated_at[:10])

    tab1, tab2, tab3, tab4 = st.tabs(["📊 Model Info", "🔒 Compliance", "⚠️ Risks", "📋 Full Preview"])

    with tab1:
        st.subheader("Model Architecture")
        st.json(aibom.model_architecture)
        st.subheader("Performance Metrics")
        if aibom.performance_metrics:
            for metric, value in aibom.performance_metrics.items():
                st.metric(metric, f"{value:.2%}" if isinstance(value, float) else value)
        else:
            st.info("No performance metrics available")

    with tab2:
        st.subheader("Compliance Status")
        for standard, status in aibom.compliance_status.items():
            col1, col2 = st.columns([1, 3])
            with col1:
                st.write(f"**{standard.upper()}**")
            with col2:
                if status == "compliant":
                    st.success(status)
                elif status in ["partial", "assessment_pending"]:
                    st.warning(status)
                else:
                    st.error(status)

    with tab3:
        st.subheader("Known Limitations")
        for limitation in aibom.known_limitations:
            st.warning(limitation)
        st.subheader("Ethical Considerations")
        for consideration in aibom.ethical_considerations:
            st.info(consideration)

    with tab4:
        st.json({
            "system_name": aibom.system_name,
            "version": aibom.version,
            "generated_at": aibom.generated_at,
            "system_description": aibom.system_description,
            "use_case": aibom.use_case,
            "risk_tier": aibom.risk_tier,
            "model_architecture": aibom.model_architecture,
            "performance_metrics": aibom.performance_metrics,
            "compliance_status": aibom.compliance_status,
            "known_limitations": aibom.known_limitations,
            "ethical_considerations": aibom.ethical_considerations,
            "deployment_config": aibom.deployment_config,
            "monitoring_setup": aibom.monitoring_setup
        })

else:
    st.info("👆 Click 'Generate AIBOM' to create documentation")

with st.expander("ℹ️ What is an AIBOM?"):
    st.markdown("""
    **AI Bill of Materials (AIBOM)** is a comprehensive document that describes:

    - **Data lineage** - Where training data came from
    - **Model architecture** - How the AI system works
    - **Performance metrics** - How well it performs
    - **Dependencies** - Software and hardware requirements
    - **Compliance status** - Regulatory adherence
    - **Known limitations** - What the system can't do
    - **Ethical considerations** - Fairness, transparency, privacy

    AIBOMs are required for EU AI Act compliance, client procurement, and audit.
    """)
