"""Stage gate timeline visualization."""

import streamlit as st


def gate_timeline(gates_status: dict[str, str]) -> None:
    """Render vertical timeline of gate statuses."""
    colors = {"Pass": "#28a745", "Fail": "#dc3545", "Pending": "#6c757d"}
    for i in range(7):
        status = gates_status.get(f"Gate {i}", "Pending")
        color = colors.get(status, "#6c757d")
        st.markdown(
            f'<div style="border-left:4px solid {color};padding-left:12px;margin:8px 0">'
            f'<strong>Gate {i}</strong>: {status}</div>',
            unsafe_allow_html=True,
        )
