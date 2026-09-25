import streamlit as st
import base64
from core.state import get_ficha_draft, sync_draft_from_aliases

def render_retrato(top_level=False):
    draft = get_ficha_draft()
    imagem_base64 = draft.get("personagem", {}).get("imagem_base64") or st.session_state.get("imagem_base64")

    # Upload de nova imagem
    file = st.file_uploader(
        "📷 Enviar retrato do personagem",
        type=["png", "jpg", "jpeg", "webp"],
        key="upload_retrato"  # evita erro de ID duplicado
    )
    if file:
        imagem_bytes = file.read()
        imagem_base64 = base64.b64encode(imagem_bytes).decode("utf-8")
        st.session_state["imagem_base64"] = imagem_base64
        draft["personagem"]["imagem_base64"] = imagem_base64
        st.session_state["ficha_draft"] = draft
        sync_draft_from_aliases()

    # Mostrar imagem no topo (circular) ou como preview
    if imagem_base64:
        if top_level:
            st.markdown(
                f"""
                <div style='display: flex; justify-content: center; margin-bottom: 20px;'>
                    <img src="data:image/png;base64,{imagem_base64}" 
                        style="border-radius: 50%; width: 160px; height: 160px; object-fit: cover; border: 3px solid #555;" />
                </div>
                """,
                unsafe_allow_html=True
            )
        else:
            st.image(base64.b64decode(imagem_base64), width=220, caption="Retrato do personagem")

    return imagem_base64
