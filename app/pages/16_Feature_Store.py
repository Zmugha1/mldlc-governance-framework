"""
Feature Store UI
Browse, register, and manage ML features
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import pandas as pd
from src.mlops.feature_store import get_feature_store

st.set_page_config(page_title="Feature Store", page_icon="🏪", layout="wide")

st.title("🏪 Feature Store")
st.markdown("Centralized feature management for ML pipelines")

feature_store = get_feature_store()

st.sidebar.header("Actions")

action = st.sidebar.radio(
    "Select Action",
    options=["📋 Browse Features", "➕ Register Feature", "🔍 Feature Details", "📊 Statistics"]
)

if action == "📋 Browse Features":
    st.header("Registered Features")

    col1, col2 = st.columns(2)
    with col1:
        entity_filter = st.selectbox(
            "Filter by Entity Type",
            options=["All", "customer", "product", "transaction", "session"]
        )
    with col2:
        search_term = st.text_input("Search", placeholder="Feature name...")

    features = feature_store.list_features(
        entity_type=entity_filter if entity_filter != "All" else None
    )

    if features:
        df = pd.DataFrame(features)
        if search_term:
            df = df[df["name"].str.contains(search_term, case=False, na=False)]

        st.dataframe(
            df[["name", "feature_type", "entity_type", "version", "owner", "description"]],
            use_container_width=True,
            hide_index=True
        )

        st.subheader("Feature Details")
        for feature in features[:10]:
            with st.expander(f"🔹 {feature['name']} (v{feature['version']})"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Type:** {feature['feature_type']}")
                    st.write(f"**Entity:** {feature['entity_type']}")
                    st.write(f"**Owner:** {feature['owner']}")
                with col2:
                    st.write(f"**Description:** {feature['description']}")
                    if feature.get("dependencies"):
                        st.write(f"**Dependencies:** {', '.join(feature['dependencies'])}")
                    if feature.get("tags"):
                        st.write(f"**Tags:** {', '.join(feature['tags'])}")

                if st.button(f"View Lineage", key=f"lineage_{feature['name']}"):
                    lineage = feature_store.get_feature_lineage(feature["name"])
                    st.json(lineage)
    else:
        st.info("No features registered yet. Use 'Register Feature' to add features.")

elif action == "➕ Register Feature":
    st.header("Register New Feature")

    with st.form("register_feature"):
        name = st.text_input("Feature Name", placeholder="customer_ltv")
        description = st.text_area("Description", placeholder="Customer lifetime value")

        col1, col2 = st.columns(2)
        with col1:
            feature_type = st.selectbox(
                "Feature Type",
                options=["numeric", "categorical", "datetime", "boolean", "embedding"]
            )
        with col2:
            entity_type = st.selectbox(
                "Entity Type",
                options=["customer", "product", "transaction", "session", "user"]
            )

        transformation = st.text_area("Transformation (optional)", placeholder="SQL or Python code to compute feature")
        dependencies = st.text_input("Dependencies (comma-separated)", placeholder="feature1, feature2")
        owner = st.text_input("Owner", value="data-team")
        tags = st.text_input("Tags (comma-separated)", placeholder="revenue, prediction")

        submitted = st.form_submit_button("Register Feature", type="primary")

        if submitted and name:
            dep_list = [d.strip() for d in dependencies.split(",") if d.strip()]
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]

            version = feature_store.register_feature(
                name=name,
                description=description,
                feature_type=feature_type,
                entity_type=entity_type,
                transformation=transformation if transformation else None,
                dependencies=dep_list,
                owner=owner,
                tags=tag_list
            )
            st.success(f"✅ Feature '{name}' registered (version {version})")
        elif submitted:
            st.error("❌ Feature name is required")

elif action == "🔍 Feature Details":
    st.header("Feature Details")

    all_features = feature_store.list_features()
    feature_names = [f["name"] for f in all_features] if all_features else []

    if feature_names:
        selected_feature = st.selectbox("Select Feature", options=feature_names)

        if selected_feature:
            st.subheader("Sample Values")
            st.info("Feature values would be displayed here from the online store")

            st.subheader("Lineage")
            lineage = feature_store.get_feature_lineage(selected_feature)
            st.json(lineage)

            st.subheader("Statistics")
            stats = feature_store.get_feature_stats(selected_feature)
            st.json(stats)
    else:
        st.info("No features available. Register features first.")

elif action == "📊 Statistics":
    st.header("Feature Store Statistics")

    features = feature_store.list_features()

    if features:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Features", len(features))
        with col2:
            entity_types = set(f["entity_type"] for f in features)
            st.metric("Entity Types", len(entity_types))
        with col3:
            feature_types = set(f["feature_type"] for f in features)
            st.metric("Feature Types", len(feature_types))

        st.subheader("Features by Entity Type")
        entity_counts = {}
        for f in features:
            entity_counts[f["entity_type"]] = entity_counts.get(f["entity_type"], 0) + 1
        st.bar_chart(entity_counts)

        st.subheader("Features by Type")
        type_counts = {}
        for f in features:
            type_counts[f["feature_type"]] = type_counts.get(f["feature_type"], 0) + 1
        st.bar_chart(type_counts)
    else:
        st.info("No features registered yet.")

with st.expander("ℹ️ About Feature Store"):
    st.markdown("""
    **Feature Store** provides:
    - Centralized storage - All features in one place
    - Version control - Track feature changes over time
    - Online serving - Low-latency access for real-time inference
    - Offline serving - Batch access for training
    - Point-in-time correctness - Prevent data leakage
    - Lineage tracking - Know where features come from
    """)
