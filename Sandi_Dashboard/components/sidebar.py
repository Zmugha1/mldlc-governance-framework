"""Shared sidebar navigation for all pages."""
import streamlit as st


def render_sidebar():
    """Render Sandi's sidebar - 4 client pages + Dev Logs."""
    st.sidebar.title("☕ Sandi's Dashboard")
    st.sidebar.markdown("*Your Coaching Companion*")
    st.sidebar.markdown("---")

    st.sidebar.page_link("pages/01_Dashboard.py", label="📊 Dashboard")
    st.sidebar.page_link("pages/02_My_Clients.py", label="👥 My Clients")
    st.sidebar.page_link("pages/03_Pipeline.py", label="📈 Pipeline")
    st.sidebar.page_link("pages/04_Coaching_Helper.py", label="💡 Coaching Helper")

    try:
        from utils.database import get_all_clients
        clients = get_all_clients()
        st.sidebar.metric("Active Clients", len(clients))
    except Exception:
        st.sidebar.metric("Active Clients", "—")

    st.sidebar.markdown("---")
    if st.sidebar.button("🔒 Dev", key="dev_logs_btn"):
        st.switch_page("pages/99_Developer_Logs.py")
    st.sidebar.caption("For Sandy. By Sandy. About Sandy's clients. ☕")
