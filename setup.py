from setuptools import setup, find_packages

setup(
    name="mldlc-governance-framework",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "streamlit>=1.28.0",
        "pandas>=2.0.0",
        "pydantic>=2.0.0",
        "plotly>=5.15.0",
        "networkx>=3.1",
        "jsonschema>=4.19.0",
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
    ],
)
