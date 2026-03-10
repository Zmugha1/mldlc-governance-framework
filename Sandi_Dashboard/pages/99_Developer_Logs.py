"""Developer Logs - password protected. Tabs: Activity, Queries, Errors, Metrics, Debug."""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st
from utils.logger import (
    get_recent_activities,
    get_recent_errors,
    get_recent_queries,
    get_activity_summary,
    clear_logs,
)

DEV_PASSWORD = "sandydev2026"

st.set_page_config(page_title="Developer Logs", layout="wide")

# Password check
if "dev_logs_authenticated" not in st.session_state:
    st.session_state.dev_logs_authenticated = False

if not st.session_state.dev_logs_authenticated:
    st.title("🔒 Developer Logs")
    pwd = st.text_input("Enter password", type="password")

    if st.button("Unlock"):
        if pwd == DEV_PASSWORD:
            st.session_state.dev_logs_authenticated = True
            st.rerun()
        else:
            st.error("Incorrect password")

    if st.button("← Back"):
        st.switch_page("pages/01_Dashboard.py")
    st.stop()

# Authenticated - show logs
from components.sidebar import render_sidebar
render_sidebar()

st.title("🔒 Developer Logs")
if st.button("← Back to Dashboard"):
    st.session_state.dev_logs_authenticated = False
    st.switch_page("pages/01_Dashboard.py")

tab1, tab2, tab3, tab4, tab5 = st.tabs(["Activity", "Queries", "Errors", "Metrics", "Debug"])

with tab1:
    st.subheader("Activity Log")
    if st.button("🗑️ Clear Activity Log", key="clear_activity"):
        clear_logs("activity")
        st.success("Cleared")
        st.rerun()

    activities = get_recent_activities(limit=100)
    if activities:
        for ts, action, client_id, details, page in activities:
            st.markdown(f"**{ts}** | `{action}` | Client: {client_id or '-'} | Page: {page or '-'}")
            if details:
                st.caption(details)
    else:
        st.info("No activity logged yet")

with tab2:
    st.subheader("Query Log")
    if st.button("🗑️ Clear Query Log", key="clear_query"):
        clear_logs("query")
        st.success("Cleared")
        st.rerun()

    queries = get_recent_queries(limit=100)
    if queries:
        for ts, query, exec_ms, rows, page in queries:
            st.markdown(f"**{ts}** | {exec_ms:.2f}ms | {rows} rows | Page: {page}")
            st.code(query[:200] + ("..." if len(query) > 200 else ""), language="sql")
    else:
        st.info("No queries logged yet")

with tab3:
    st.subheader("Error Log")
    if st.button("🗑️ Clear Error Log", key="clear_error"):
        clear_logs("error")
        st.success("Cleared")
        st.rerun()

    errors = get_recent_errors(limit=50)
    if errors:
        for ts, err_type, err_msg, page, stack in errors:
            with st.expander(f"{ts} | {err_type} | {err_msg[:50]}..."):
                st.error(err_msg)
                st.code(stack or "", language="text")
    else:
        st.info("No errors logged yet")

with tab4:
    st.subheader("Metrics")
    summary = get_activity_summary(days=7)
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Activities (7d)", summary["total_activities"])
    with col2:
        st.metric("Total Errors (7d)", summary["total_errors"])
    with col3:
        st.metric("Pages", len(summary["activities_by_page"]))

    st.markdown("**Activities by Page**")
    for page, count in summary["activities_by_page"].items():
        st.markdown(f"- {page or 'Unknown'}: {count}")

with tab5:
    st.subheader("Debug")
    st.markdown("**Session State Keys**")
    st.json(list(st.session_state.keys()))

    st.markdown("**Clear All Logs**")
    if st.button("🗑️ Clear ALL Logs", key="clear_all"):
        clear_logs("all")
        st.success("All logs cleared")
        st.rerun()
