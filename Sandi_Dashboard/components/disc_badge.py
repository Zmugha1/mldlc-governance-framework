"""DISC style badges - color-coded."""
import streamlit as st
import json
from pathlib import Path


def get_disc_colors():
    path = Path(__file__).resolve().parent.parent / "data" / "disc_profiles.json"
    if path.exists():
        with open(path) as f:
            profiles = json.load(f)
        return {k: v.get("color", "#6B7280") for k, v in profiles.items()}
    return {"D": "#C53030", "I": "#DD6B20", "S": "#38A169", "C": "#3182CE"}


def render_disc_badge(style: str):
    """Render a color-coded DISC badge."""
    colors = get_disc_colors()
    color = colors.get(style.upper(), "#6B7280")
    st.markdown(
        f'<span style="background: {color}; color: white; padding: 4px 12px; '
        f'border-radius: 20px; font-size: 12px; font-weight: 600;">{style}-Style</span>',
        unsafe_allow_html=True,
    )
