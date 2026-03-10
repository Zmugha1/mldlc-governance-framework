"""Beautiful client cards - no raw tables."""
import streamlit as st
from components.disc_badge import get_disc_colors
from utils.styles import CUSTOM_CSS


def render_client_card(client: dict):
    """Render a client card with avatar, badges, flags, actions."""
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

    colors = get_disc_colors()
    disc_color = colors.get(client.get("disc_style", "I").upper(), "#6B7280")
    border_color = "#EF4444" if client.get("red_flags") else "#10B981"

    red_tags = "".join(
        f'<span style="background: #FEE2E2; color: #991B1B; padding: 2px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">🚩 {f}</span>'
        for f in client.get("red_flags", [])[:2]
    )
    green_tags = "".join(
        f'<span style="background: #D1FAE5; color: #065F46; padding: 2px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">✅ {g}</span>'
        for g in client.get("green_flags", [])[:2]
    )

    st.markdown(
        f"""
        <div class="client-card" style="border-left: 4px solid {border_color};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: {disc_color}; 
                                    display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                            {client.get('name', '?')[0]}
                        </div>
                        <div>
                            <strong style="font-size: 16px;">{client.get('name', 'Unknown')}</strong><br>
                            <span style="background: {disc_color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{client.get('disc_style', '-')}</span>
                            <span style="background: #F3F4F6; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 4px;">{client.get('compartment', '-')}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 14px;">{'⭐' * client.get('interest', 0)}</div>
            </div>
            <div style="color: #6B7280; font-size: 13px; margin-bottom: 8px;">
                <strong>Best match:</strong> {client.get('best_match', '-')}
                {f' • <strong>Blocker:</strong> {client.get("blocker", "-")}' if client.get('blocker') else ''}
            </div>
            <div style="color: #6B7280; font-size: 12px; margin-bottom: 8px;">
                Last: {client.get('last_contact', '-')} • Next: {client.get('next_action', '-')}
            </div>
            <div style="margin-bottom: 8px;">{red_tags} {green_tags}</div>
            <div style="font-size: 12px; color: #4A5568; font-style: italic;">💡 {client.get('coaching_tip', '')}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.button("📞 Call", key=f"call-{client.get('id', '')}")
    with col2:
        st.button("📝 Note", key=f"note-{client.get('id', '')}")
    with col3:
        st.button("➡️ Move", key=f"move-{client.get('id', '')}")
