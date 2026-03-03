"""Leadership Dashboard - Business impact metrics for executives"""

import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Leadership Dashboard", page_icon="📊", layout="wide")

st.title("📊 Leadership Dashboard")
st.markdown("Business value metrics and ROI tracking for executives")

business_metrics = [
    {"Metric": "ROI from ML Initiatives", "Target": "15%", "Current": "12%", "Trend": "↑", "Owner": "VP Data"},
    {"Metric": "Time to Production", "Target": "< 8 weeks", "Current": "10 weeks", "Trend": "↓", "Owner": "ML Lead"},
    {"Metric": "Model Adoption Rate", "Target": "85%", "Current": "78%", "Trend": "↑", "Owner": "Product"},
    {"Metric": "Compliance Score", "Target": "100%", "Current": "98%", "Trend": "↑", "Owner": "Compliance"},
    {"Metric": "Innovation Velocity", "Target": "4 models/quarter", "Current": "3", "Trend": "→", "Owner": "DS Lead"},
]

df = pd.DataFrame(business_metrics)

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Active Models", "24", "+3 this quarter")
with col2:
    st.metric("Compliance Rate", "98%", "2% above target")
with col3:
    st.metric("Avg Time to Prod", "10 weeks", "-2 weeks YoY")
with col4:
    st.metric("Governance Gates Passed", "156", "This month")

st.markdown("---")
st.subheader("Business Metrics Overview")
st.dataframe(df, use_container_width=True, hide_index=True)

st.markdown("---")
st.subheader("Risk & Compliance Status")
risk_status = {"Status": ["Compliant", "Under Review", "Action Required"], "Count": [22, 2, 0]}
fig = px.pie(values=risk_status["Count"], names=risk_status["Status"], title="Model Compliance Status", colors=["#2E7D4A", "#B8860B", "#8B2635"])
st.plotly_chart(fig, use_container_width=True)
