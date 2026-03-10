"""Stage/compartment badges - each stage has its own color."""
import streamlit as st
from utils.styles import COMPARTMENTS


def render_compartment_badge(compartment: str):
    """Render a compartment stage badge."""
    color = COMPARTMENTS.get(compartment, "#718096")
    st.markdown(
        f'<span style="background: #F3F4F6; color: {color}; padding: 4px 12px; '
        f'border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid {color};">{compartment}</span>',
        unsafe_allow_html=True,
    )
