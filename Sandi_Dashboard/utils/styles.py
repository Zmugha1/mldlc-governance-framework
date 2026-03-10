"""CSS + theme for Sandi Dashboard - Warm color palette."""

# Brand colors
PRIMARY = "#2E5C8A"      # Deep teal
SECONDARY = "#D4A574"    # Warm sand
DISC_D = "#C53030"       # Red - Dominance
DISC_I = "#DD6B20"       # Orange - Influence
DISC_S = "#38A169"       # Green - Steadiness
DISC_C = "#3182CE"       # Blue - Compliance

COMPARTMENTS = {
    "IC": "#718096",
    "C1": "#4299E1",
    "C1.1": "#63B3ED",
    "C2": "#48BB78",
    "C3": "#ECC94B",
    "C4": "#ED8936",
    "C5": "#ED64A6",
    "CLOSED": "#38A169",
}

CUSTOM_CSS = """
<style>
    .kpi-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        border-left: 4px solid #2E5C8A;
    }
    .client-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        border: 1px solid #E2E8F0;
    }
    .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #4A5568;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
    }
</style>
"""
