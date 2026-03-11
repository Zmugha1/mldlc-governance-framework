"""Colors, CSS, themes for Sandy's Complete Dashboard."""

COLORS = {
    "primary": "#2E5C8A",
    "secondary": "#D4A574",
    "accent": "#E8B86D",
    "success": "#4A9B5C",
    "warning": "#D4944A",
    "danger": "#C45B4A",
    "background": "#FAF8F5",
    "card": "#FFFFFF",
}

DISC_COLORS = {
    "D": "#E74C3C",
    "I": "#F39C12",
    "S": "#27AE60",
    "C": "#3498DB",
}

COMPARTMENT_COLORS = {
    "IC": {"bar": "#5DADE2", "bg": "#EBF5FB", "border": "#5DADE2"},
    "C1": {"bar": "#F8C471", "bg": "#FEF9E7", "border": "#F8C471"},
    "C1.1": {"bar": "#EB984E", "bg": "#FEF5E7", "border": "#EB984E"},
    "C2": {"bar": "#48C9B0", "bg": "#E8F8F5", "border": "#48C9B0"},
    "C3": {"bar": "#AF7AC5", "bg": "#F5EEF8", "border": "#AF7AC5"},
    "C4": {"bar": "#EC7063", "bg": "#FDEDEC", "border": "#EC7063"},
    "C5": {"bar": "#52BE80", "bg": "#E8F8F5", "border": "#52BE80"},
    "CLOSED": {"bar": "#85929E", "bg": "#F4F6F6", "border": "#85929E"},
}

COMPARTMENT_NAMES = {
    "IC": {"short": "Discovery", "full": "Discovery - First Meeting", "desc": "Getting to know each other"},
    "C1": {"short": "Learning", "full": "Learning - Education Phase", "desc": "Learning about franchises"},
    "C1.1": {"short": "Exploring", "full": "Exploring - Narrowing Options", "desc": "Exploring specific options"},
    "C2": {"short": "Researching", "full": "Researching - Brand Validation", "desc": "Researching brands"},
    "C3": {"short": "Deciding", "full": "Deciding - Serious Consideration", "desc": "Close to decision"},
    "C4": {"short": "Committing", "full": "Committing - Ready to Sign", "desc": "Ready to commit"},
    "C5": {"short": "Launching", "full": "Launching - In Training", "desc": "Signed, starting up"},
    "CLOSED": {"short": "Complete", "full": "Complete - Deal Done", "desc": "Finished or disqualified"},
}


def get_compartment_name(code, full=False):
    """Get friendly name for compartment code."""
    key = "full" if full else "short"
    return COMPARTMENT_NAMES.get(code, {}).get(key, code or "Unknown")


def get_compartment_desc(code):
    """Get description for compartment code."""
    return COMPARTMENT_NAMES.get(code, {}).get("desc", "")


def apply_custom_styles():
    """Apply custom CSS to the app."""
    import streamlit as st
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

CUSTOM_CSS = """
<style>
    .metric-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #2E5C8A; }
    .client-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
    .ilwe-card { background: linear-gradient(135deg, #27AE60 0%, #2ECC71 100%); color: white; border-radius: 12px; padding: 20px; }
    .flags-card { background: linear-gradient(135deg, #E74C3C 0%, #EC7063 100%); color: white; border-radius: 12px; padding: 20px; }
    .nextsteps-card { background: linear-gradient(135deg, #3498DB 0%, #5DADE2 100%); color: white; border-radius: 12px; padding: 20px; }
    .section-title { font-size: 14px; font-weight: 600; color: #4A5568; text-transform: uppercase; margin-bottom: 12px; }
</style>
"""
