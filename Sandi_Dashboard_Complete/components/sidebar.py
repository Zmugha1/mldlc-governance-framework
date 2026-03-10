"""Shared sidebar navigation."""
import streamlit as st


def render_sidebar():
    st.sidebar.title("☕ Sandy's Dashboard")
    st.sidebar.markdown("*Complete 6-Module Experience*")
    st.sidebar.markdown("---")

    st.sidebar.page_link("pages/01_Dashboard.py", label="📊 Executive Dashboard")
    st.sidebar.page_link("pages/02_Clients.py", label="👥 Client Intelligence")
    st.sidebar.page_link("pages/03_Pipeline.py", label="📈 Pipeline Visualizer")
    st.sidebar.page_link("pages/04_Live_Call.py", label="🎙️ Live Coaching Assistant")
    st.sidebar.page_link("pages/05_Analysis.py", label="📊 Post-Call Analysis")
    st.sidebar.page_link("pages/06_Admin.py", label="⚙️ Admin Streamliner")

    try:
        from utils.database import get_all_clients
        clients = get_all_clients()
        st.sidebar.metric("Active Clients", len(clients))
    except Exception:
        st.sidebar.metric("Active Clients", "—")

    st.sidebar.markdown("---")
    if st.sidebar.button("🔒 Dev Logs", key="dev_logs"):
        st.switch_page("pages/99_Dev_Logs.py")
    st.sidebar.caption("For Sandy. Complete experience. ☕")
