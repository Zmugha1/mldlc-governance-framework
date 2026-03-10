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
    "IC": "#5DADE2",
    "C1": "#F8C471",
    "C1.1": "#EB984E",
    "C2": "#48C9B0",
    "C3": "#AF7AC5",
    "C4": "#EC7063",
    "C5": "#52BE80",
    "CLOSED": "#85929E",
}

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
