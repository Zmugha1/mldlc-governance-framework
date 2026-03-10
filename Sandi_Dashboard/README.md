# ☕ Sandi's Coaching Intelligence Dashboard

A lightweight, professional coaching dashboard for franchise coach Sandy Stahl.

## 🎯 Overview

This is **Sandy's client-facing dashboard** - completely separate from the MLDLC developer framework. It provides:

- **4 Pages Maximum** - Clean, focused navigation
- **Card-based UI** - Beautiful client cards, not raw tables
- **DISC Integration** - Color-coded behavioral style guidance
- **8-Stage Pipeline** - Visual coaching funnel
- **I.L.W.E. Goals** - Income, Lifestyle, Wealth, Equity tracking

## 📁 Structure

```
Sandi_Dashboard/
├── app.py                      # Main entry + sidebar navigation
├── pages/
│   ├── 01_Dashboard.py         # Overview + KPIs
│   ├── 02_My_Clients.py       # Client cards with filters
│   ├── 03_Pipeline.py         # Funnel visualization
│   └── 04_Coaching_Helper.py  # DISC tips + I.L.W.E.
├── components/
│   ├── client_card.py         # Beautiful client cards
│   ├── disc_badge.py          # DISC style badges
│   ├── compartment_badge.py   # Stage badges
│   ├── kpi_card.py            # Metric cards
│   ├── pipeline_funnel.py     # Plotly funnel chart
│   └── sidebar.py             # Shared navigation
├── data/
│   ├── sample_clients.json    # 5 sample clients
│   └── disc_profiles.json    # Coaching tips by style
├── utils/
│   ├── database.py            # SQLite operations
│   └── styles.py              # CSS + theme
└── .streamlit/
    └── config.toml            # Theme configuration
```

## 🚀 Running the App

```bash
cd Sandi_Dashboard
pip install -r requirements.txt
streamlit run app.py
```

The app will start on port 8502.

## 🎨 Design Principles

1. **Warm & Professional** - Sandy's brand is approachable and trustworthy
2. **Card-based** - Every client is a visual card, never a table row
3. **Visual Pipeline** - 8-stage funnel with color coding
4. **DISC-aware** - Coaching tips tailored to behavioral styles
5. **Lightweight** - Fast loading, simple navigation

## 📊 The 8 Compartments

```
IC → C1 → C1.1 → C2 → C3 → C4 → C5 → CLOSED

IC    = Initial Contact (first meeting)
C1    = Education (learning about franchises)
C1.1  = Deep Education (narrowing down)
C2    = Validation (researching specific brands)
C3    = Decision (serious consideration)
C4    = Commitment (ready to move forward)
C5    = Launch (signed, starting up)
CLOSED = Completed (deal done or lost)
```

## 📝 Sample Clients

1. **Andrea Kelleher** - I-Style, C4, KitchenWise, health blocker
2. **John Martinez** - D-Style, C3, Lawn Doctor, ready to go
3. **Sarah Chen** - C-Style, C2, researching, needs data
4. **Mike Thompson** - S-Style, C1, slow decision, needs trust
5. **Lisa Wong** - I-Style, IC, just started, high enthusiasm

---

**For Sandy. By Sandy. About Sandy's clients.** ☕
