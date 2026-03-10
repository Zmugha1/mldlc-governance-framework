"""
SandyStahl Bot - Minimal Coaching Dashboard
Single-file Streamlit app for Sandy the coach.
"""
import streamlit as st
import json
from pathlib import Path

st.set_page_config(page_title="SandyStahl Bot", page_icon="🤖", layout="wide")

st.sidebar.title("🤖 SandyStahl Bot")

page = st.sidebar.radio("Go to:", [
    "📊 Dashboard", "👥 Clients", "📋 Client Profile",
    "🎯 Pipeline", "💡 Coaching Helper", "📝 Log Call"
])

# Load sample data
data_path = Path(__file__).resolve().parent.parent / "data" / "clients.json"
if data_path.exists():
    with open(data_path) as f:
        data = json.load(f)
else:
    data = {"clients": []}

st.sidebar.metric("Active Clients", len(data["clients"]))

# === DASHBOARD ===
if page == "📊 Dashboard":
    st.title("Good Morning, Sandy! ☀️")
    st.caption("Wednesday, March 12, 2025")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 📅 Today's Calls")
        st.markdown("**10:00 AM** - Andrea Kelleher (C4)")
        st.markdown("**2:00 PM** - Jim Smith (C3)")

    with col2:
        st.markdown("### 📊 Pipeline")
        st.markdown("IC: 1 | C1: 0 | C2: 1 | C3: 1 | C4: 1 | C5: 0")

    st.markdown("---")
    st.markdown("### 🔥 Hot Prospects")
    st.markdown("⭐⭐⭐⭐⭐ Jim Smith - Ready to close")
    st.markdown("⭐⭐⭐⭐ Lisa Wong - Spouse meeting")

# === CLIENTS LIST ===
elif page == "👥 Clients":
    st.title("👥 All Clients")

    for client in data["clients"]:
        with st.expander(f"{client['name']} - {client['compartment']}"):
            st.markdown(f"**Interest:** {'⭐' * client['interest']}")
            st.markdown(f"**Last Contact:** {client['last_contact']}")
            st.markdown(f"**Next:** {client['next_action']}")

# === CLIENT PROFILE ===
elif page == "📋 Client Profile":
    st.title("📋 Client Profile")

    if not data["clients"]:
        st.info("No clients in data. Add data/clients.json")
    else:
        selected = st.selectbox("Select Client", [c["name"] for c in data["clients"]])
        client = next(c for c in data["clients"] if c["name"] == selected)

        col1, col2, col3 = st.columns([2, 1, 1])
        col1.header(client["name"])
        col2.metric("Compartment", client["compartment"])
        col3.metric("Interest", "⭐" * client["interest"])

        tab1, tab2, tab3 = st.tabs(["Overview", "DISC", "I.L.W.E."])

        with tab1:
            st.markdown(f"**Last Contact:** {client['last_contact']}")
            st.markdown(f"**Next Action:** {client['next_action']}")
            st.markdown(f"**Notes:** {client['notes']}")

            if client.get("red_flags"):
                st.markdown("### 🚩 Red Flags")
                for flag in client["red_flags"]:
                    st.error(flag)

            if client.get("green_flags"):
                st.markdown("### ✅ Green Flags")
                for flag in client["green_flags"]:
                    st.success(flag)

        with tab2:
            st.markdown(f"### DISC: {client['disc_style']}-Style")
            scores = client["disc_scores"]
            st.markdown(f"D:{scores['D']} I:{scores['I']} S:{scores['S']} C:{scores['C']}")

            tips = {
                "I": ["Be warm", "Use enthusiasm", "Ask 'How do you feel?'"],
                "D": ["Get to point", "Focus on results", "Ask 'Timeline?'"],
                "S": ["Build rapport", "Provide stability", "Ask 'Concerns?'"],
                "C": ["Provide data", "Be thorough", "Ask 'Research?'"],
            }
            for tip in tips.get(client["disc_style"], []):
                st.markdown(f"✅ {tip}")

        with tab3:
            for key, value in client["ilwe"].items():
                with st.expander(key.upper()):
                    st.markdown(value)

# === PIPELINE ===
elif page == "🎯 Pipeline":
    st.title("🎯 Pipeline Visualizer")

    import plotly.graph_objects as go

    fig = go.Figure(
        go.Funnel(
            y=["IC", "C1", "C2", "C3", "C4", "C5"],
            x=[1, 0, 1, 1, 1, 0],
            marker={"color": ["#3498db", "#9b59b6", "#2ecc71", "#f39c12", "#e67e22", "#e74c3c"]},
        )
    )
    st.plotly_chart(fig, use_container_width=True)

# === COACHING HELPER ===
elif page == "💡 Coaching Helper":
    st.title("💡 Coaching Helper")

    if not data["clients"]:
        st.info("No clients in data. Add data/clients.json")
    else:
        selected = st.selectbox("Select Client", [c["name"] for c in data["clients"]])
        client = next(c for c in data["clients"] if c["name"] == selected)

        if st.button(f"How should I coach {client['name']}?"):
            st.markdown(f"### 💡 For {client['disc_style']}-Style:")

            guidance = {
                "I": "Be warm, use enthusiasm, ask 'How do you feel?'",
                "D": "Get to point, focus on results, ask 'Timeline?'",
                "S": "Build rapport slowly, provide stability",
                "C": "Provide data, be thorough, answer precisely",
            }
            st.markdown(guidance.get(client["disc_style"], ""))

            if client.get("red_flags"):
                st.markdown("**⚠️ Watch For:**")
                for flag in client["red_flags"]:
                    st.warning(flag)

# === LOG CALL ===
elif page == "📝 Log Call":
    st.title("📝 Log Call")

    client_names = [c["name"] for c in data["clients"]] if data["clients"] else ["(No clients)"]
    selected = st.selectbox("Client", client_names)

    with st.form("log"):
        st.date_input("Date")
        st.selectbox("Compartment", ["IC", "C1", "C2", "C3", "C4", "C5", "CLOSED"])
        st.slider("Interest", 1, 5, 3)
        st.text_area("Notes")
        if st.form_submit_button("Log Call"):
            st.success("Logged!")
