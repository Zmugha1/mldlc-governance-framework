"""
SandyStahl Bot - Polished Coaching Dashboard
Professional UX/UI for Sandy the coach.
"""
import streamlit as st
import json
from pathlib import Path
from datetime import datetime

st.set_page_config(
    page_title="SandyStahl Bot",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Sandy's brand colors & polished CSS
st.markdown("""
<style>
    .metric-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border-left: 4px solid #6B46C1;
    }
    .client-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border: 1px solid #E5E7EB;
    }
    .hot-prospect {
        border-left: 4px solid #F59E0B;
    }
    .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 16px;
    }
    .stMetric {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border-left: 4px solid #6B46C1;
    }
</style>
""", unsafe_allow_html=True)

st.sidebar.title("🤖 SandyStahl Bot")
st.sidebar.markdown("*Your Coaching Companion*")
st.sidebar.markdown("---")

page = st.sidebar.radio("Navigate", [
    "📊 Dashboard", "👥 Clients", "📋 Client Profile",
    "🎯 Pipeline", "💡 Coaching Helper", "📝 Log Call",
    "📊 Dashboard Monitor",
])

# Load sample data
data_path = Path(__file__).resolve().parent.parent / "data" / "clients.json"
if data_path.exists():
    with open(data_path) as f:
        data = json.load(f)
else:
    data = {"clients": []}

st.sidebar.metric("Active Clients", len(data["clients"]))
st.sidebar.markdown("---")

# === DASHBOARD ===
if page == "📊 Dashboard":
    st.title("Good Morning, Sandy! ☀️")
    st.caption(datetime.now().strftime("%A, %B %d, %Y"))

    # Top metrics row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Active Clients", str(len(data["clients"])), "+2 this week")
    with col2:
        hot = sum(1 for c in data["clients"] if c.get("interest", 0) >= 4)
        st.metric("Hot Prospects", str(hot), "🔥")
    with col3:
        st.metric("Calls Today", "2", "10:00 AM, 2:00 PM")
    with col4:
        st.metric("Pipeline Value", "$450K", "est. closes")

    st.markdown("---")

    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.markdown('<p class="section-title">📅 Today\'s Schedule</p>', unsafe_allow_html=True)
        calls = [
            {"time": "10:00 AM", "client": "Andrea Kelleher", "compartment": "C4", "topic": "Health check-in", "interest": 4, "urgent": True},
            {"time": "2:00 PM", "client": "Jim Smith", "compartment": "C3", "topic": "Franchisor intro", "interest": 5, "urgent": False},
        ]
        for call in calls:
            urgent_class = "hot-prospect" if call["urgent"] else ""
            st.markdown(f'''
            <div class="client-card {urgent_class}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>{call['time']}</strong> — {call['client']}<br>
                        <span style="color: #6B7280; font-size: 13px;">{call['compartment']} • {call['topic']}</span>
                    </div>
                    <div style="text-align: right;">{'⭐' * call['interest']}</div>
                </div>
            </div>
            ''', unsafe_allow_html=True)

        st.markdown('<p class="section-title">⚠️ Action Needed</p>', unsafe_allow_html=True)
        st.warning("3 clients haven't been contacted in 7+ days")
        st.info("Andrea Kelleher - Health follow-up overdue")

    with col_right:
        st.markdown('<p class="section-title">📊 Pipeline Overview</p>', unsafe_allow_html=True)
        stages = ["IC", "C1", "C2", "C3", "C4", "C5"]
        counts = [sum(1 for c in data.get("clients", []) if c.get("compartment") == s) for s in stages]
        colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"]
        max_c = max(counts) or 1
        pipeline_html = "<div style='background:white;padding:12px;border-radius:8px;'>"
        for i, (s, c) in enumerate(zip(stages, counts)):
            w = max((c / max_c) * 100, 5)
            pipeline_html += f"""<div style="margin:6px 0;"><div style="display:flex;justify-content:space-between;font-size:12px;"><span>{s}</span><span>{c}</span></div><div style="background:#E5E7EB;height:20px;border-radius:6px;overflow:hidden;"><div style="background:{colors[i]};width:{w}%;height:100%;border-radius:6px;display:flex;align-items:center;padding-left:8px;"><span style="color:white;font-weight:600;font-size:11px;">{c}</span></div></div></div>"""
        pipeline_html += "</div>"
        st.markdown(pipeline_html, unsafe_allow_html=True)

        st.markdown('<p class="section-title">🔥 Hot Prospects</p>', unsafe_allow_html=True)
        prospects = [
            {"name": "Jim Smith", "stage": "C3", "interest": 5, "note": "Ready to close"},
            {"name": "Lisa Wong", "stage": "C2", "interest": 4, "note": "Spouse meeting scheduled"},
        ]
        for p in prospects:
            st.markdown(f'''
            <div class="client-card hot-prospect">
                <div style="display: flex; justify-content: space-between;">
                    <div><strong>{p['name']}</strong> <span style="color: #6B7280;">({p['stage']})</span></div>
                    <div>{'⭐' * p['interest']}</div>
                </div>
                <div style="color: #6B7280; font-size: 13px; margin-top: 4px;">{p['note']}</div>
            </div>
            ''', unsafe_allow_html=True)

# === CLIENTS LIST ===
elif page == "👥 Clients":
    st.title("👥 Clients")

    filter_col1, filter_col2, filter_col3 = st.columns([1, 1, 2])
    with filter_col1:
        compartment_filter = st.selectbox("Compartment", ["All", "IC", "C1", "C2", "C3", "C4", "C5", "CLOSED"])
    with filter_col2:
        interest_filter = st.selectbox("Interest", ["All", "5", "4", "3", "2", "1"])
    with filter_col3:
        search = st.text_input("🔍 Search clients", placeholder="Type name...")

    st.markdown("---")

    for client in data.get("clients", []):
        if compartment_filter != "All" and client["compartment"] != compartment_filter:
            continue
        if interest_filter != "All" and str(client.get("interest", 0)) != interest_filter:
            continue
        if search and search.lower() not in client["name"].lower():
            continue

        border_color = "#10B981" if not client.get("red_flags") else "#EF4444"
        red_tags = "".join([f'<span style="background: #FEE2E2; color: #991B1B; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-right: 4px;">🚩 {flag}</span>' for flag in client.get("red_flags", [])[:1]])
        green_tags = "".join([f'<span style="background: #D1FAE5; color: #065F46; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-right: 4px;">✅ {flag}</span>' for flag in client.get("green_flags", [])[:1]])

        st.markdown(f'''
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid {border_color};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <h3 style="margin: 0;">{client['name']}</h3>
                        <span style="background: #F3F4F6; padding: 4px 12px; border-radius: 20px; font-size: 12px;">{client['compartment']}</span>
                        <span style="font-size: 18px;">{'⭐' * client.get('interest', 0)}</span>
                    </div>
                    <div style="color: #6B7280; margin-top: 8px; font-size: 14px;">
                        Last contact: {client.get('last_contact', '-')} • Next: {client.get('next_action', '-')}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
                <span style="background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-size: 12px;">DISC: {client.get('disc_style', '-')}</span>
                {red_tags}
                {green_tags}
            </div>
        </div>
        ''', unsafe_allow_html=True)

# === CLIENT PROFILE ===
elif page == "📋 Client Profile":
    st.title("📋 Client Profile")

    if not data["clients"]:
        st.info("No clients in data. Add data/clients.json")
    else:
        selected = st.selectbox("Select Client", [c["name"] for c in data["clients"]])
        client = next(c for c in data["clients"] if c["name"] == selected)

        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
        with col1:
            st.markdown(f"### {client['disc_style']}-Style • {client['compartment']} • {'⭐' * client['interest']}")
            st.markdown(f"Last contact: {client['last_contact']} • Next: {client['next_action']}")
        with col2:
            st.metric("Conversion", "40%", "Health blocker" if client.get("red_flags") else "")
        with col3:
            st.metric("Interest", f"{client['interest']}/5", "")
        with col4:
            st.button("📞 Log Call", type="primary")

        tab_overview, tab_disc, tab_ilwe, tab_history = st.tabs(["Overview", "DISC Profile", "I.L.W.E. Goals", "Call History"])

        with tab_overview:
            col_left, col_right = st.columns([1, 1])
            with col_left:
                if client.get("red_flags"):
                    st.markdown("### 🚩 Red Flags")
                    for flag in client["red_flags"]:
                        st.error(flag)
                if client.get("green_flags"):
                    st.markdown("### ✅ Green Flags")
                    for flag in client["green_flags"]:
                        st.success(flag)
            with col_right:
                st.markdown("### 📝 Notes")
                st.info(client.get("notes", ""))
                st.markdown("### 🎯 Recommended Actions")
                st.markdown("1. Check on health status first")
                st.markdown("2. Do NOT mention business unless she brings it up")
                st.markdown("3. Keep KitchenWise warm for when ready")

        with tab_disc:
            col_chart, col_tips = st.columns([1, 1])
            with col_chart:
                scores = client.get("disc_scores", {"D": 0, "I": 0, "S": 0, "C": 0})
                d, i, s, c = scores.get("D", 0), scores.get("I", 0), scores.get("S", 0), scores.get("C", 0)
                max_val = max(d, i, s, c) or 1
                st.markdown("**DISC Scores**")
                for label, val in [("D (Dominance)", d), ("I (Influence)", i), ("S (Steadiness)", s), ("C (Compliance)", c)]:
                    w = (val / max_val) * 100 if max_val else 0
                    w = max(w, 5)
                    st.markdown(f"""<div style="margin:8px 0;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>{label}</span><span>{val}</span></div><div style="background:#E5E7EB;height:24px;border-radius:6px;overflow:hidden;"><div style="background:#6B46C1;width:{w}%;height:100%;border-radius:6px;"></div></div></div>""", unsafe_allow_html=True)
            with col_tips:
                st.markdown(f"### 💡 Coaching Tips for {client['disc_style']}-Style")
                tips = {
                    "I": {"do": ["Be warm and friendly", "Use enthusiasm and stories", "Allow time for socializing", "Recognize and praise ideas"], "dont": ["Overwhelm with details", "Be critical or negative", "Rush the conversation"]},
                    "D": {"do": ["Get to the point quickly", "Focus on results", "Be confident"], "dont": ["Waste time on small talk", "Be vague", "Over-explain"]},
                    "S": {"do": ["Build rapport slowly", "Provide stability", "Give time to process"], "dont": ["Rush decisions", "Be pushy", "Change plans suddenly"]},
                    "C": {"do": ["Provide data and facts", "Be thorough", "Answer precisely"], "dont": ["Be casual with details", "Skip steps", "Make assumptions"]},
                }
                t = tips.get(client["disc_style"], tips["I"])
                st.markdown("**✅ DO:**")
                for item in t["do"]:
                    st.markdown(f"- {item}")
                st.markdown("**❌ DON'T:**")
                for item in t["dont"]:
                    st.markdown(f"- {item}")

        with tab_ilwe:
            for key, value in client.get("ilwe", {}).items():
                with st.expander(f"**{key.upper()}**", expanded=True):
                    st.markdown(value)

        with tab_history:
            calls = [
                {"date": "Jan 10, 2025", "compartment": "C4", "topic": "Health crisis", "notes": "Possible cancer, business on hold"},
                {"date": "Dec 20, 2024", "compartment": "C3/C4", "topic": "KitchenWise deep dive", "notes": "Spoke with Rochelle, $100K in 6-7 months"},
                {"date": "Dec 5, 2024", "compartment": "C4", "topic": "Follow-up", "notes": "Husband support growing"},
            ]
            for call in calls:
                st.markdown(f'''
                <div style="border-left: 3px solid #6B46C1; padding-left: 16px; margin-bottom: 16px;">
                    <strong>{call['date']}</strong> <span style="color: #6B7280;">({call['compartment']})</span><br>
                    {call['topic']}<br>
                    <span style="color: #6B7280; font-size: 13px;">{call['notes']}</span>
                </div>
                ''', unsafe_allow_html=True)

# === PIPELINE ===
elif page == "🎯 Pipeline":
    st.title("🎯 Pipeline Visualizer")

    stages = ["IC", "C1", "C2", "C3", "C4", "C5"]
    counts = [sum(1 for c in data.get("clients", []) if c.get("compartment") == s) for s in stages]
    colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"]
    max_c = max(counts) or 1
    for i, (s, c) in enumerate(zip(stages, counts)):
        w = max((c / max_c) * 100, 5)
        st.markdown(f"""<div style="margin:10px 0;"><div style="display:flex;justify-content:space-between;"><strong>{s}</strong><span>{c} clients</span></div><div style="background:#E5E7EB;height:28px;border-radius:8px;overflow:hidden;"><div style="background:{colors[i]};width:{w}%;height:100%;border-radius:8px;display:flex;align-items:center;padding-left:12px;"><span style="color:white;font-weight:600;">{c}</span></div></div></div>""", unsafe_allow_html=True)

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

# === DASHBOARD MONITOR ===
elif page == "📊 Dashboard Monitor":
    st.switch_page("pages/22_Dashboard_Monitor.py")

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
