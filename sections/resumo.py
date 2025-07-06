import streamlit as st
from utils import persist_data as pd

def render_resumo(personagem, personalidade, atributos, pericias=None):
    if st.button("Salvar Ficha"):
        st.success("🎉 Ficha salva com sucesso!")
        st.write("## 📄 Resumo da Ficha")
        
        st.markdown("### 🧍 Informações Básicas")
        st.write(f"- Nome: {personagem['nome']}")
        st.write(f"- Classe: {personagem['classe']}")
        st.write(f"- Arquetipo: {personagem['arquetipo']}")
        st.write(f"- Idade: {personagem['idade']}")
        st.write(f"- Sexo: {personagem['sexo']}")
        st.write(f"- Raça: {personagem['raca']}")
        st.write(f"- Alinhamento: {personagem.get('alinhamento', personalidade['alinhamento'])}")

        st.markdown("### 🧠 Personalidade")
        st.write(f"- Pecado Capital: {personalidade['pecado']} {personalidade['emoji_pecado']}")
        st.write(f"- Coisa Favorita: {personalidade['coisa_favorita']}")
        st.write(f"- Odeia: {personalidade['odeia']}")
        st.write(f"- Vive para: {personalidade['vivo_para']}")

        st.markdown("### 🛡️ Atributos")
        for nome in atributos["valores"]:
            valor = atributos["valores"].get(nome, 10)
            ajuste = atributos["ajustes"].get(nome, 0)
            base = (valor - 10) // 2
            total = base + ajuste
            st.write(f"- {nome}: {valor} (Base: {base:+}, Ajuste: {ajuste:+}, Total: {total:+})")

        if pericias:
            st.markdown("### 📘 Perícias")
            for nome in pericias["valores"]:
                valor = pericias["valores"].get(nome, 0)
                ajuste = pericias["ajustes"].get(nome, 0)
                total = pericias["totais"].get(nome, valor + ajuste)
                st.write(f"- {nome}: {valor} (Ajuste: {ajuste:+}, Total: {total:+})")
            
        try:
            nome_arquivo = pd.salvar_ficha_json(personagem, personalidade, atributos, pericias)
            st.write(f"📂 Ficha salva como: **{nome_arquivo}** na pasta `/fichas`")
        except Exception as e:
            st.error("❌ Erro ao salvar a ficha.")
            st.text(str(e))
