# MLDLC Governance Dashboard - Streamlit App

Mission Control dashboard for the MLDLC Governance Framework.

## Run Locally

```bash
cd C:\Users\zumah\mldlc-governance-framework
pip install -r app/requirements.txt
streamlit run app/app.py
```

## Deploy to Streamlit Cloud

1. Push to GitHub: `https://github.com/Zmugha1/mldlc-governance-framework`
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect GitHub, select `mldlc-governance-framework` repo
4. Set **Main file path** to: `app/app.py`
5. Click Deploy

## Pages

- **VTCO Navigator** - Vision, Thesis, Constraints, Outcomes
- **Zone Control** - Challenger / Contender / Champion
- **Stage Gates** - Gates 0-6 validation
- **Artifact Registry** - SHA-256 tracked outputs
- **Explainability** - Executive summary bundle
- **The Lab** - Challenger zone playground (Iris demo)

## Cloud Deployment Notes

Artifacts are stored in `st.session_state` (memory) for ephemeral Streamlit Cloud. No disk writes. For production, connect to S3/Cloud Storage.
