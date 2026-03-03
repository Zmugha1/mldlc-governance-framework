"""
MLDLC Governance Framework - Streamlit Cloud entry point.
Streamlit Cloud is configured to use app/app.py as the main module.
This file delegates to app/main.py.
"""
from app.main import main

if __name__ == "__main__":
    main()
