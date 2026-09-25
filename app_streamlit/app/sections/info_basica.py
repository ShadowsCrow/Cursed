import streamlit as st

def render_info_basica(dados_classes, dados_racas):

    if "info_basica_expandida" not in st.session_state:
        st.session_state["info_basica_expandida"] = True

    personagem = st.session_state.get("personagem", {})

    with st.expander("📘 Informações Básicas", expanded=st.session_state["info_basica_expandida"]):
        # ----- Classe / Arquétipo -----
        nomes_classes = [c["nome"] for c in dados_classes]
        classe_default = personagem.get("classe", nomes_classes[0] if nomes_classes else "")
        classe_escolhida = st.selectbox(
            "Classe:",
            nomes_classes,
            index=nomes_classes.index(classe_default) if classe_default in nomes_classes else 0
        )

        classe_dados = next((c for c in dados_classes if c["nome"] == classe_escolhida), None)
        cor_classe = classe_dados.get("cor", "#333") if classe_dados else "#333"

        st.markdown(f"<h2 style='color:{cor_classe};'>🧭 Classe: {classe_escolhida}</h2>", unsafe_allow_html=True)

        nomes_arquetipos = [a["nome"] for a in classe_dados["arquetipos"]] if classe_dados else []
        arquetipo_default = personagem.get("arquetipo", nomes_arquetipos[0] if nomes_arquetipos else "")
        arquetipo_escolhido = st.selectbox(
            "Arquetipo:",
            nomes_arquetipos,
            index=nomes_arquetipos.index(arquetipo_default) if arquetipo_default in nomes_arquetipos else 0
        )

        # Obter dados do arquétipo
        arquetipo_dados = next((a for a in classe_dados["arquetipos"] if a["nome"] == arquetipo_escolhido), None) if classe_dados else None

        # Mostrar conceito do arquétipo
        if arquetipo_dados and arquetipo_dados.get("conceito"):
            st.markdown(
                f"""
                <div style='
                    background-color:#f9f9f9;
                    padding:10px;
                    border-left:4px solid {cor_classe};
                    margin-top:-10px;
                    margin-bottom:10px;
                    color: #000;
                '>
                    <strong>Conceito:</strong> {arquetipo_dados['conceito']}
                </div>
                """,
                unsafe_allow_html=True
            )

        # ----- Campos básicos -----
        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
        with col1:
            nome = st.text_input("Nome:", value=personagem.get("nome", ""))
        with col2:
            idade = st.number_input("Idade:", min_value=0, step=1, value=personagem.get("idade", 0))
        with col3:
            sexo = st.selectbox(
                "Sexo:",
                ["", "Masculino", "Feminino", "Outro"],
                index=["", "Masculino", "Feminino", "Outro"].index(personagem.get("sexo", ""))
            )
        with col4:
            # ---- Raça como selectbox (com fallback) ----
            nomes_racas = [r.get("nome", "") for r in (dados_racas or []) if isinstance(r, dict) and r.get("nome")]
            raca_default = personagem.get("raca", "")
            opcoes_raca = list(nomes_racas)

            # Se a ficha trouxe uma raça que não está na lista, mantém como primeira opção
            if raca_default and raca_default not in opcoes_raca:
                opcoes_raca = [raca_default] + opcoes_raca

            if opcoes_raca:
                raca = st.selectbox(
                    "Raça:",
                    options=opcoes_raca,
                    index=opcoes_raca.index(raca_default) if raca_default in opcoes_raca else 0
                )
            else:
                # Fallback se não houver arquivo/lista de raças
                raca = st.text_input("Raça:", value=raca_default)

    return {
        "nome": nome,
        "idade": idade,
        "sexo": sexo,
        "raca": raca,
        "classe": classe_escolhida,
        "classe_dados": classe_dados,
        "arquetipo": arquetipo_escolhido,
        "arquetipo_dados": arquetipo_dados,
        "cor_classe": cor_classe
    }
