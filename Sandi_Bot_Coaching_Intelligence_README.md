# ☕ Sandi Bot — Coaching Intelligence Dashboard

A professional coaching intelligence dashboard for franchise coach Sandy Stahl. Track clients, visualize pipelines, get DISC-based coaching guidance, and streamline follow-ups.

**Repository:** [github.com/Zmugha1/Sandi_Bot_Coaching_Intelligence](https://github.com/Zmugha1/Sandi_Bot_Coaching_Intelligence)

---

## 🎯 6-Module Experience

| Module | Description |
|--------|-------------|
| **📊 Executive Dashboard** | Daily overview, schedule, alerts, quick stats |
| **👥 Client Intelligence** | Deep profiles with DISC, I.L.W.E. goals, red flags |
| **📈 Pipeline Visualizer** | 8-stage funnel (IC → C1 → C2 → C3 → C4 → C5 → CLOSED) |
| **🎙️ Live Coaching Assistant** | Real-time call guidance |
| **📊 Post-Call Analysis** | CLEAR method scoring |
| **⚙️ Admin Streamliner** | Follow-ups, templates, quick logging |

---

## 🚀 Quick Start

### Deploy to Streamlit Cloud

1. Go to [share.streamlit.io](https://share.streamlit.io)
2. Click **Deploy an app**
3. Repository: `Zmugha1/Sandi_Bot_Coaching_Intelligence`
4. Branch: `main`
5. Main file path: `app/app.py`
6. Click **Deploy**

### Local Development

```bash
git clone https://github.com/Zmugha1/Sandi_Bot_Coaching_Intelligence.git
cd Sandi_Bot_Coaching_Intelligence
pip install -r requirements.txt
streamlit run app/app.py
```

App runs on: http://localhost:8501

---

## 📁 Structure

```
Sandi_Bot_Coaching_Intelligence/
├── app/
│   ├── app.py                  # Main entry
│   ├── pages/
│   │   ├── 00_How_to_Use.py    # Onboarding
│   │   ├── 01_Dashboard.py     # Executive Dashboard
│   │   ├── 02_Clients.py       # Client Intelligence
│   │   ├── 03_Pipeline.py      # Pipeline Visualizer
│   │   ├── 04_Live_Call.py     # Live Coaching Assistant
│   │   ├── 05_Analysis.py      # Post-Call Analysis
│   │   ├── 06_Admin.py         # Admin Streamliner
│   │   └── 99_Dev_Logs.py     # Dev logs (password-protected)
│   ├── components/
│   │   └── sidebar.py
│   ├── utils/
│   │   ├── database.py
│   │   ├── styles.py
│   │   └── logger.py
│   └── data/
│       └── clients.json
├── .streamlit/
│   └── config.toml
├── requirements.txt
└── README.md
```

---

## 🔐 Developer Logs

- Click **🔒 Dev Logs** in the sidebar
- Password: `sandydev2026`
- View activity, errors, and audit trail

---

## 📊 Features

- **DISC Integration** — Color-coded behavioral style guidance (D, I, S, C)
- **I.L.W.E. Goals** — Income, Lifestyle, Wealth, Equity tracking
- **8-Stage Pipeline** — IC → C1 → C1.1 → C2 → C3 → C4 → C5 → CLOSED
- **Card-based UI** — Client cards, not raw tables
- **SQLite** — Local data, activity logging, error tracking

---

## 📝 Sample Clients (Demo Data)

1. Andrea Bartlett — I-Style, C1, KitchenWise  
2. Mike Chen — D-Style, C3, Lawn Doctor  
3. Sarah Johnson — S-Style, C1, Lawn Doctor  
4. Tom Brown — C-Style, C4, PetWell Clinic  
5. Lisa Wong — I-Style, C2, KitchenWise  
6. Jim Smith — D-Style, C3, Lawn Doctor  
7. Emily Davis — S-Style, C2, KitchenWise  
8. Robert Wilson — C-Style, C1, PetWell Clinic  
9. Jennifer Lee — I-Style, IC, KitchenWise  
10. David Martinez — D-Style, C5, Lawn Doctor  

---

**For Sandy. Coaching intelligence. Ready to use.** ☕
