"""Zone status badge component."""

import streamlit as st


def zone_badge(zone: str) -> None:
    """Render zone badge with color coding."""
    colors = {
        "CHALLENGER": ("#dc3545", "Challenger"),
        "CONTENDER": ("#fd7e14", "Contender"),
        "CHAMPION": ("#28a745", "Champion"),
    }
    hex_color, label = colors.get(zone.upper(), ("#6c757d", zone))
    st.markdown(
        f'<span style="background-color:{hex_color};color:white;padding:4px 12px;'
        f'border-radius:4px;font-weight:bold">{label}</span>',
        unsafe_allow_html=True,
    )
