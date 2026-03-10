"""LLM Router Page - MoE-aware model selection"""

import sys
import os
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

st.set_page_config(page_title="LLM Router", page_icon="🧠", layout="wide")

st.title("LLM Router")
st.markdown("MoE-aware model selection for air-gapped environments")

# Check Ollama status
try:
    import requests
    r = requests.get("http://localhost:11434/api/tags", timeout=3)
    if r.status_code == 200:
        models = r.json().get("models", [])
        available = [m.get("name", "") for m in models]
        if available:
            st.success(f"✅ Ollama connected. {len(available)} models available.")
            st.caption(f"Models: {', '.join(available[:5])}{'...' if len(available) > 5 else ''}")
        else:
            st.warning("⚠️ Ollama connected but no models found.")
            st.code("ollama pull phi3:mini")
    else:
        st.warning("⚠️ Ollama returned unexpected status.")
except Exception as e:
    st.warning("⚠️ Cannot connect to Ollama. Local model selection may fail.")
    st.caption("Start with: `ollama serve` | Install: https://ollama.com/download")

# Check OpenAI API
has_openai = bool(os.getenv("OPENAI_API_KEY"))
if has_openai:
    st.success("✅ OpenAI API key configured")
else:
    st.info("ℹ️ OpenAI API key not set (local models only)")

st.markdown("---")

try:
    from src.llm.llm_router import get_router, HARDWARE_PROFILES, AVAILABLE_MODELS

    # Initialize session state for hardware profile
    if "hardware_profile" not in st.session_state:
        st.session_state.hardware_profile = "solo_practice"

    router = get_router()
    if hasattr(router, "set_hardware_profile"):
        router.set_hardware_profile(st.session_state.hardware_profile)
    info = router.get_router_info()

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        profile = st.selectbox(
            "Hardware Profile",
            options=list(HARDWARE_PROFILES.keys()),
            index=list(HARDWARE_PROFILES.keys()).index(st.session_state.hardware_profile)
            if st.session_state.hardware_profile in HARDWARE_PROFILES else 0,
            key="hw_profile_select"
        )
        st.session_state.hardware_profile = profile
        if hasattr(router, "set_hardware_profile"):
            router.set_hardware_profile(profile)
    with col2:
        st.metric("VRAM (GB)", info.get("system_vram_gb", 0))
    with col3:
        st.metric("Available Models", len(info.get("available_models", [])))
    with col4:
        st.metric("Profile", HARDWARE_PROFILES.get(profile, {}).get("name", profile))

    st.subheader("Hardware Deployment Profiles")
    with st.expander("View profiles"):
        for key, prof in HARDWARE_PROFILES.items():
            st.markdown(f"**{prof['name']}**")
            st.write(f"Hardware: {prof['hardware']} | VRAM: {prof['vram_gb']}GB")
            st.write(f"Models: {', '.join(prof['recommended_models'])}")
            st.divider()

    st.subheader("Model Configurations")
    # Use router.available_models, exclude embedding models from display
    def _is_embed(name: str) -> bool:
        return "embed" in name.lower()
    display_models = [n for n in info.get("available_models", []) if not _is_embed(n)]
    moe_models = [n for n in display_models if router.available_models.get(n) and getattr(router.available_models.get(n), "is_moe", False)]
    st.markdown(f"**MoE models:** {', '.join(moe_models) if moe_models else 'None'}")

    with st.expander("All models"):
        for name in display_models[:12]:
            config = router.available_models.get(name)
            if config:
                moe_tag = " (MoE)" if config.is_moe else ""
                st.write(f"- **{name}**{moe_tag}: {config.total_params} total, {config.active_params} active, {config.vram_gb}GB VRAM")

    st.subheader("Test Router")
    test_prompt = st.text_input("Enter prompt:", placeholder="e.g. Predict if Acme customer CUST-1001 will churn")

    if st.button("Select Model") and test_prompt:
        with st.spinner("Analyzing prompt and selecting model..."):
            try:
                selected_model = router.select_model(test_prompt)
                st.success(f"✅ Selected Model: `{selected_model}`")

                col1, col2 = st.columns(2)
                with col1:
                    st.info(f"**Hardware Profile:** {st.session_state.hardware_profile}")
                with col2:
                    st.info("**Estimated Cost:** Check Cost Tracker after test")

                if "selected_model" not in st.session_state:
                    st.session_state.selected_model = None
                st.session_state.selected_model = selected_model
                st.session_state.last_prompt = test_prompt

            except Exception as e:
                st.error(f"❌ Model selection failed: {e}")
                st.info("💡 Using fallback model: phi3:mini")
                st.code("""
# To fix:
1. Ensure Ollama is running: ollama serve
2. Check available models: ollama list
3. Pull a model: ollama pull phi3:mini
                """)

    st.markdown("---")
    st.subheader("Test with Selected Model")

    if st.session_state.get("selected_model") and st.session_state.get("last_prompt"):
        if st.button("🚀 Test with This Model"):
            with st.spinner("Generating response..."):
                try:
                    from src.llm.llm_service import get_llm_service
                    llm = get_llm_service()
                    response = llm.generate(
                        prompt=st.session_state.last_prompt,
                        model=st.session_state.selected_model,
                        user_id="test_user",
                        session_id="test_session"
                    )
                    st.markdown("### Response:")
                    st.markdown(response.get("content", "No response"))

                    cost = response.get("cost_usd", 0)
                    st.metric("Cost", f"${cost:.4f}")
                except Exception as e:
                    st.error(f"❌ Generation failed: {e}")
                    st.info("💡 Try a different model or check Ollama is running")
    else:
        st.caption("Select a model first")

except ImportError as e:
    st.warning("LLM router not available. Install: `pip install requests`")
    st.code("from src.llm.llm_router import get_router", language="python")
