"""Sandy's navigation sidebar - coaching tools only."""

import streamlit as st


def render_sidebar():
    """Render Sandy's coaching dashboard navigation."""
    st.sidebar.title("SandyStahl Bot")
    st.sidebar.markdown("*Coaching Intelligence Dashboard*")
    st.sidebar.markdown("---")

    st.sidebar.page_link("pages/01_Dashboard.py", label="📊 Dashboard")
    st.sidebar.page_link("pages/02_Clients.py", label="👤 Clients")
    st.sidebar.page_link("pages/03_Client_Profile.py", label="📋 Client Profile")
    st.sidebar.page_link("pages/04_Pipeline.py", label="📈 Pipeline")
    st.sidebar.page_link("pages/05_Coaching_Helper.py", label="💬 Coaching Helper")
    st.sidebar.page_link("pages/06_Log_Call.py", label="📞 Log Call")
