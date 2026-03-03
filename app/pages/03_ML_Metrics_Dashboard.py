"""ML Metrics Dashboard - Technical metrics with time, effort, and impact assessment"""

import streamlit as st
import pandas as pd
import plotly.express as px
from pathlib import Path

st.set_page_config(page_title="ML Metrics Dashboard", page_icon="📈", layout="wide")

st.title("📈 ML-Facing Metrics Dashboard")
st.markdown("Technical metrics for data scientists and ML engineers")

metrics_data = [
    {"Category": "Data Quality", "Key Metrics": "Completeness %, Uniqueness %, Validity score", "Time": "Low", "Effort": "Low", "Impact": "High", "Collection": "Real-time", "Method": "Automated pipeline validation"},
    {"Category": "Model Performance", "Key Metrics": "Accuracy, Precision, Recall, F1-Score, AUC-ROC", "Time": "Medium", "Effort": "Medium", "Impact": "Critical", "Collection": "Per training", "Method": "Evaluation job post-training"},
    {"Category": "Feature Engineering", "Key Metrics": "Feature importance, SHAP values, VIF scores", "Time": "High", "Effort": "High", "Impact": "High", "Collection": "Per iteration", "Method": "Analysis during development"},
    {"Category": "Training Efficiency", "Key Metrics": "Convergence epochs, Training time, GPU utilization", "Time": "Medium", "Effort": "Medium", "Impact": "Medium", "Collection": "Per training", "Method": "Resource monitoring"},
    {"Category": "Model Robustness", "Key Metrics": "Cross-validation variance, Adversarial accuracy", "Time": "High", "Effort": "High", "Impact": "High", "Collection": "Per validation", "Method": "Stress testing suite"},
    {"Category": "Fairness & Bias", "Key Metrics": "Demographic parity, Equalized odds, Disparate impact", "Time": "High", "Effort": "High", "Impact": "Critical", "Collection": "Weekly", "Method": "Fairness audit job"},
    {"Category": "Inference Performance", "Key Metrics": "Latency P50/P95/P99, Throughput QPS", "Time": "Low", "Effort": "Low", "Impact": "High", "Collection": "Continuous", "Method": "APM integration"},
    {"Category": "Drift Detection", "Key Metrics": "PSI score, KS statistic, Wasserstein distance", "Time": "Low", "Effort": "Low", "Impact": "Critical", "Collection": "Hourly", "Method": "Statistical batch job"},
]

df = pd.DataFrame(metrics_data)

st.sidebar.header("🔍 Filters")
impact_filter = st.sidebar.multiselect("Impact Level", options=["Critical", "High", "Medium", "Low"], default=["Critical", "High", "Medium", "Low"])
effort_filter = st.sidebar.multiselect("Effort Level", options=["High", "Medium", "Low"], default=["High", "Medium", "Low"])
filtered_df = df[df["Impact"].isin(impact_filter) & df["Effort"].isin(effort_filter)]

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Total Metrics", len(filtered_df))
with col2:
    critical_count = len(filtered_df[filtered_df["Impact"] == "Critical"])
    st.metric("Critical Impact", critical_count)
with col3:
    high_effort = len(filtered_df[filtered_df["Effort"] == "High"])
    st.metric("High Effort", high_effort)
with col4:
    automated = len(filtered_df[filtered_df["Collection"] == "Continuous"])
    st.metric("Auto-Collect", automated)

st.markdown("---")
st.subheader("Metrics Catalog")
st.dataframe(filtered_df, use_container_width=True, hide_index=True)

st.markdown("---")
st.subheader("Impact vs Effort Analysis")
fig = px.scatter(filtered_df, x="Effort", y="Impact", color="Category", hover_data=["Key Metrics"], title="Metric Categories by Impact and Effort", category_orders={"Effort": ["Low", "Medium", "High"], "Impact": ["Low", "Medium", "High", "Critical"]})
fig.update_layout(height=500)
st.plotly_chart(fig, use_container_width=True)

st.markdown("---")
st.subheader("Collection Frequency Distribution")
freq_counts = filtered_df["Collection"].value_counts()
fig2 = px.pie(values=freq_counts.values, names=freq_counts.index, title="How Often Metrics Are Collected", hole=0.4)
fig2.update_layout(height=400)
st.plotly_chart(fig2, use_container_width=True)
