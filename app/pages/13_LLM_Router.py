"""LLM Router Page - MoE-aware model selection"""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

st.set_page_config(page_title="LLM Router", page_icon="🧠", layout="wide")

st.title("LLM Router")
st.markdown("MoE-aware model selection for air-gapped environments")

st.markdown("""
**Mixture of Experts (MoE)** models decouple model size from compute cost.
`qwen3.5:35b-a3b` has 35B params but only 3B active per token = LLM intelligence at SLM cost.
""")

try:
    from src.llm.llm_router import get_router, HARDWARE_PROFILES, AVAILABLE_MODELS

    router = get_router()
    info = router.get_router_info()

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Hardware Profile", info.get("hardware_profile", "unknown"))
    with col2:
        st.metric("VRAM (GB)", info.get("system_vram_gb", 0))
    with col3:
        st.metric("Available Models", len(info.get("available_models", [])))

    st.subheader("Hardware Deployment Profiles")
    with st.expander("View profiles"):
        for key, profile in HARDWARE_PROFILES.items():
            st.markdown(f"**{profile['name']}**")
            st.write(f"Hardware: {profile['hardware']} | VRAM: {profile['vram_gb']}GB")
            st.write(f"Models: {', '.join(profile['recommended_models'])}")
            st.divider()

    st.subheader("Model Configurations")
    moe_models = [n for n, c in AVAILABLE_MODELS.items() if c.is_moe]
    st.markdown(f"**MoE models:** {', '.join(moe_models) if moe_models else 'None'}")

    with st.expander("All models"):
        for name, config in list(AVAILABLE_MODELS.items())[:12]:
            moe_tag = " (MoE)" if config.is_moe else ""
            st.write(f"- **{name}**{moe_tag}: {config.total_params} total, {config.active_params} active, {config.vram_gb}GB VRAM")

    st.subheader("Test Router")
    test_prompt = st.text_input("Enter prompt:", placeholder="e.g. Review this HIPAA compliance clause")
    if st.button("Select Model") and test_prompt:
        model = router.select_model(test_prompt)
        st.success(f"Selected: **{model}**")

except ImportError as e:
    st.warning("LLM router not available. Install: `pip install requests`")
    st.code("from src.llm.llm_router import get_router", language="python")
