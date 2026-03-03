"""Drift Monitor Page - Model and data drift detection"""

import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Drift Monitor", page_icon="⚠️", layout="wide")

st.title("⚠️ Drift Monitor")
st.markdown("Model and data drift detection status")

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Models Monitored", "24", "Active")
with col2:
    st.metric("Drift Alerts", "2", "This week")
with col3:
    st.metric("PSI Threshold", "0.2", "Configurable")
with col4:
    st.metric("Last Check", "2 hours ago", "Healthy")

st.markdown("---")
st.subheader("Drift Status by Model")
drift_data = [
    {"Model": "Churn Predictor v1", "PSI Score": 0.08, "Status": "Healthy", "Last Check": "2h ago"},
    {"Model": "Demand Forecast", "PSI Score": 0.15, "Status": "Healthy", "Last Check": "1h ago"},
    {"Model": "Fraud Detector", "PSI Score": 0.25, "Status": "Alert", "Last Check": "30m ago"},
]
df = pd.DataFrame(drift_data)
st.dataframe(df, use_container_width=True, hide_index=True)

st.markdown("---")
st.subheader("PSI Distribution")
fig = px.bar(drift_data, x="Model", y="PSI Score", color="Status", color_discrete_map={"Healthy": "#2E7D4A", "Alert": "#8B2635"}, title="Population Stability Index by Model")
fig.add_hline(y=0.2, line_dash="dash", line_color="red", annotation_text="Threshold")
st.plotly_chart(fig, use_container_width=True)
