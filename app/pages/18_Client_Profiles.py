"""Client Profiles - Full client information with DISC, I.L.W.E., flags."""
import streamlit as st

st.set_page_config(page_title="Client Profiles", layout="wide")

st.title("Client Profiles")

# Client selector
client_names = ["Andrea Kelleher", "Jim Smith", "Lisa Wong", "Tom Brown"]
selected_client = st.selectbox("Select Client", client_names)

if selected_client == "Andrea Kelleher":
    col1, col2, col3 = st.columns([2, 1, 1])
    col1.header("Andrea Kelleher")
    col2.metric("Compartment", "C4")
    col3.metric("Interest", "4/5")

    tab1, tab2, tab3, tab4 = st.tabs(["Overview", "DISC Profile", "I.L.W.E. Goals", "Call History"])

    with tab1:
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("### Overview")
            st.markdown("- Status: Active")
            st.markdown("- Last Contact: 5 days ago")
            st.markdown("- Next Action: Health check-in call")
            st.markdown("- Conversion Probability: 40%")

            st.markdown("### Red Flags")
            st.error("Health crisis (cancer concern)")
            st.warning("Timeline shifting")

            st.markdown("### Green Flags")
            st.success("Engaged and does research")
            st.success("Husband support growing")
            st.success("Excited about KitchenWise")

        with col2:
            st.markdown("### I.L.W.E. Goals")
            st.markdown("Income: $150K/year")
            st.markdown("Lifestyle: Work from home, golf trips")
            st.markdown("Wealth: Build legacy")
            st.markdown("Equity: Own something meaningful")

            st.markdown("### Next Steps")
            st.markdown("1. Check on health status")
            st.markdown("2. Do not push business decisions")
            st.markdown("3. Keep KitchenWise warm")
            st.markdown("4. Maintain relationship")

    with tab2:
        st.markdown("### DISC Profile: I-Style (Influence)")

        col1, col2 = st.columns(2)
        with col1:
            st.markdown("Natural Style")
            st.markdown("- D (Dominance): 63")
            st.markdown("- I (Influence): 75")
            st.markdown("- S (Steadiness): 25")
            st.markdown("- C (Compliance): 45")

        with col2:
            st.markdown("Coaching Tips")
            st.markdown("Be warm and friendly")
            st.markdown("Use enthusiasm")
            st.markdown("Allow time for socializing")
            st.markdown("Do not overwhelm with details")
            st.markdown("Do not be critical")

elif selected_client:
    st.info(f"Select **Andrea Kelleher** to see full profile. Other clients coming soon.")
