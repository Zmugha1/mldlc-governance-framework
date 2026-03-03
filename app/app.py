"""
MLDLC Governance Framework - Streamlit Cloud entry point.
Streamlit Cloud is configured to use app/app.py as the main module.
Runs main.py directly to avoid package import issues on Streamlit Cloud.
"""
import runpy
from pathlib import Path

# Execute main.py from same directory - avoids ModuleNotFoundError on Streamlit Cloud
runpy.run_path(str(Path(__file__).resolve().parent / "main.py"), run_name="__main__")
