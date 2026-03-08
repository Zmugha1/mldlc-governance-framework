"""
Monitoring Dashboard for MLDLC Framework
Displays cost metrics, audit status, and HITL queue
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

st.set_page_config(page_title="Monitoring Dashboard", page_icon="📊", layout="wide")

st.title("📊 MLDLC Monitoring Dashboard")

# Tabs for different monitoring areas
tab1, tab2, tab3 = st.tabs(["💰 Cost Tracking", "📋 Audit Trail", "👤 HITL Queue"])

with tab1:
    st.header("Cost Tracking")

    try:
        from src.monitoring.cost_tracker import get_cost_tracker
        cost_tracker = get_cost_tracker()

        # Summary metrics
        col1, col2, col3, col4 = st.columns(4)

        daily_summary = cost_tracker.get_cost_summary(period="daily")
        weekly_summary = cost_tracker.get_cost_summary(period="weekly")

        with col1:
            st.metric("Today's Cost", f"${daily_summary['total_cost_usd']:.4f}")
        with col2:
            st.metric("Weekly Cost", f"${weekly_summary['total_cost_usd']:.4f}")
        with col3:
            st.metric("Today's Requests", daily_summary['request_count'])
        with col4:
            st.metric("Avg Cost/Request", f"${daily_summary['average_cost_per_request']:.6f}")

        # Cost by model
        st.subheader("Cost by Model")
        if daily_summary['by_model']:
            model_df = pd.DataFrame([
                {"Model": k, "Cost ($)": v['cost'], "Tokens": v['tokens']}
                for k, v in daily_summary['by_model'].items()
            ])
            st.bar_chart(model_df.set_index('Model')['Cost ($)'])
        else:
            st.info("No cost data yet. Usage will appear after LLM calls.")

        # Anomaly detection
        st.subheader("Cost Anomalies")
        anomalies = cost_tracker.detect_anomalies()
        if anomalies:
            for anomaly in anomalies:
                severity_color = "🔴" if anomaly['severity'] == 'high' else "🟡"
                st.warning(f"{severity_color} Anomaly at {anomaly['hour']}: "
                          f"${anomaly['cost']:.4f} (deviation: {anomaly['deviation']}σ)")
        else:
            st.success("No cost anomalies detected in the last 24 hours")
    except Exception as e:
        st.error(f"Could not load cost tracker: {e}")

with tab2:
    st.header("Audit Trail Status")

    try:
        from src.governance.audit_logger import get_audit_logger
        audit = get_audit_logger()

        # Integrity check
        integrity = audit.verify_integrity()

        col1, col2 = st.columns(2)
        with col1:
            st.metric("Total Audit Events", integrity['total_events'])
        with col2:
            if integrity['integrity_intact']:
                st.success("✅ Integrity Verified")
            else:
                st.error(f"❌ {len(integrity['violations'])} Violations Detected")

        # Export option
        st.subheader("Export for Compliance")
        col_a, col_b = st.columns(2)
        with col_a:
            start_date = st.date_input("Start Date", datetime.utcnow().date() - timedelta(days=7))
        with col_b:
            end_date = st.date_input("End Date", datetime.utcnow().date())
        data = audit.export_for_compliance(
            start_date.isoformat(), end_date.isoformat(), format="json"
        )
        st.download_button("Download JSON Export", data, file_name="audit_export.json", mime="application/json")

        st.info("Audit trail is active and logging all LLM calls")
    except Exception as e:
        st.error(f"Could not load audit logger: {e}")

with tab3:
    st.header("Human-in-the-Loop Queue")

    try:
        from src.governance.hitl_framework import get_hitl_framework
        hitl = get_hitl_framework()

        # Metrics
        metrics = hitl.get_escalation_rate()

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Pending Reviews", metrics['pending'])
        with col2:
            st.metric("Total Escalations (24h)", metrics['total_escalations'])
        with col3:
            st.metric("Approval Rate", f"{metrics['approval_rate']*100:.1f}%")

        # Pending reviews
        st.subheader("Pending Reviews")
        pending = hitl.get_pending_reviews(limit=10)

        if pending:
            for review in pending:
                with st.expander(f"Review {review['escalation_id']} - Risk: {review['risk_score']:.2f}"):
                    st.write(f"**Confidence:** {review['confidence_score']:.2f}")
                    st.write(f"**Reason:** {review['reason']}")
                    st.write(f"**AI Decision:** {review['ai_decision']}")

                    col_a, col_r, col_o = st.columns(3)
                    with col_a:
                        if st.button("✅ Approve", key=f"app_{review['escalation_id']}"):
                            hitl.submit_review(review['escalation_id'], "reviewer_1", "approved")
                            st.rerun()
                    with col_r:
                        if st.button("❌ Reject", key=f"rej_{review['escalation_id']}"):
                            hitl.submit_review(review['escalation_id'], "reviewer_1", "rejected")
                            st.rerun()
                    with col_o:
                        if st.button("📝 Override", key=f"ovr_{review['escalation_id']}"):
                            st.session_state[f"override_{review['escalation_id']}"] = True

                    if st.session_state.get(f"override_{review['escalation_id']}"):
                        new_decision = st.text_area("New Decision", key=f"new_{review['escalation_id']}")
                        if st.button("Submit Override", key=f"sub_{review['escalation_id']}"):
                            hitl.submit_review(
                                review['escalation_id'], "reviewer_1", "overridden",
                                notes="Manual override", override_decision={"content": new_decision}
                            )
                            st.rerun()
        else:
            st.success("No pending reviews! 🎉")

        # Recommendation
        st.info(f"**Recommendation:** {metrics['recommendation']}")
    except Exception as e:
        st.error(f"Could not load HITL framework: {e}")
