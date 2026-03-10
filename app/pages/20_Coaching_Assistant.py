"""Coaching Assistant - AI-powered coaching guidance."""
import streamlit as st

st.set_page_config(page_title="Coaching Assistant", layout="wide")

st.title("Coaching Assistant")

client = st.selectbox("Select Client", ["Andrea Kelleher", "Jim Smith", "Lisa Wong"])
question = st.text_input(
    "Ask a coaching question:",
    placeholder="e.g., How should I coach Andrea?",
)

if question:
    st.markdown("### Suggested Response")
    st.markdown("""
    Based on Andrea's DISC profile (I-Style) and current situation:

    1. **START WITH WARMTH** - She is people-oriented, begin with personal check-in
    2. **ACKNOWLEDGE HEALTH** - Do not ignore the elephant in the room
    3. **USE ENTHUSIASM** - "I know this is challenging, but your resilience..."
    4. **AVOID PRESSURE** - Do not push for decisions while health is uncertain
    5. **KEEP OPTIONS OPEN** - "When you are ready, KitchenWise is still there"
    """)
