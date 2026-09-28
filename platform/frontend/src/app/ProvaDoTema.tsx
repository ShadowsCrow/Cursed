import { Link } from "react-router";

import { CabecalhoIlustrado, IlustracaoDeEtapa } from "../ui/Arte";
import { Glyph } from "../ui/Display";
import { EmblemaSimples, Marca, Moldura, Pergaminho, Selo, TituloOrnado } from "../ui/Tema";

const PALETA: { grupo: string; tokens: string[] }[] = [
  { grupo: "Noite", tokens: ["--noite-950", "--noite-900", "--noite-800", "--noite-700", "--noite-600", "--noite-500"] },
  { grupo: "Ouro envelhecido", tokens: ["--ouro-100", "--ouro-200", "--ouro-300", "--ouro-500", "--ouro-700", "--ouro-900"] },
  { grupo: "Sangue", tokens: ["--sangue-300", "--sangue-500", "--sangue-600", "--sangue-900"] },
  { grupo: "Pergaminho e tinta", tokens: ["--pergaminho-50", "--pergaminho-100", "--pergaminho-200", "--pergaminho-300", "--tinta-600", "--tinta-900"] },
];

/**
 * Prova do tema (tarefa 3.10): tokens, moldura, pergaminho, título ornado, botões, selos e
 * emblema lado a lado, para comparar com a imagem de referência antes de reestilizar as telas.
 */
export function ProvaDoTema() {
  return (
    <div className="prova-tema">
      <div className="demo-ribbon"><Glyph name="eye" size={15} /><span>Prova do tema com dados fictícios. Nada é salvo.</span><Link to="/preview/componentes">Catálogo de componentes <Glyph name="arrow" size={14} /></Link></div>
      <main id="main-content" className="prova-tema__conteudo">
        <CabecalhoIlustrado>
          <TituloOrnado nivel={1} sobretitulo="Prova do tema">Criar personagem</TituloOrnado>
          <p>Noite, dourado envelhecido e pergaminho: a identidade da primeira fatia da nova estética.</p>
        </CabecalhoIlustrado>

        <section className="prova-tema__grade" aria-label="Moldura noturna e pergaminho">
          <Moldura as="aside" className="prova-tema__barra" aria-label="Moldura noturna">
            <Marca />
            <TituloOrnado nivel={3} sobretitulo="Campanha atual">O Véu de Aram</TituloOrnado>
            <ol className="prova-tema__etapas">
              <li>Conceito</li><li>Identidade</li><li aria-current="step">Raça</li><li>Classe e arquétipo</li>
            </ol>
            <div className="tag-row"><Selo>Narrador</Selo><Selo tom="sangue">Ativo</Selo><Selo tom="noite">Rascunho</Selo></div>
            <div className="prova-tema__botoes">
              <button type="button" className="button button--primary">Ação principal</button>
              <button type="button" className="button button--secondary">Secundária</button>
              <button type="button" className="button button--ghost">Discreta</button>
              <button type="button" className="button button--primary" disabled>Desabilitada</button>
            </div>
          </Moldura>

          <Moldura variante="pergaminho" className="prova-tema__folha">
            <IlustracaoDeEtapa etapa="raca">
              <span className="titulo-ornado__sobretitulo prova-tema__sobre-arte">Etapa 3 de 8</span>
            </IlustracaoDeEtapa>
            <Pergaminho className="prova-tema__pergaminho">
              <TituloOrnado nivel={2}>Raça</TituloOrnado>
              <p>A raça define o Tamanho e o Deslocamento do personagem, além das habilidades raciais concluídas.</p>
              <label>Nome do personagem<input defaultValue="Lia Andarilha" /></label>
              <label>Idade<input defaultValue="-3" aria-invalid="true" aria-describedby="prova-erro" /></label>
              <p id="prova-erro" className="campo-erro">Erro: a idade não pode ser negativa.</p>
              <div className="tag-row"><Selo>Médio</Selo><Selo tom="sangue">Placeholder oculto</Selo></div>
              <div className="prova-tema__botoes">
                <button type="button" className="button button--primary">Avançar</button>
                <button type="button" className="button button--ghost">Voltar</button>
                <button type="button" className="button button--primary" disabled>Concluir</button>
              </div>
              <div className="prova-tema__emblemas">
                <img src="/arte/emblema-cursed-256.webp" width={96} height={96} alt="Emblema detalhado sobre pergaminho" />
                <EmblemaSimples tamanho={32} /><EmblemaSimples tamanho={16} />
              </div>
            </Pergaminho>
          </Moldura>
        </section>

        <section className="prova-tema__paleta" aria-label="Paleta">
          <TituloOrnado nivel={2} sobretitulo="Tokens">Paleta</TituloOrnado>
          {PALETA.map(({ grupo, tokens }) => (
            <div key={grupo}>
              <h3>{grupo}</h3>
              <ul className="prova-tema__amostras">
                {tokens.map((token) => (
                  <li key={token}><span className="prova-tema__cor" style={{ background: `var(${token})` }} aria-hidden="true" /><code>{token}</code></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="prova-tema__emblemas">
            <img src="/arte/emblema-cursed-256.webp" width={96} height={96} alt="Emblema detalhado sobre a noite" />
            <EmblemaSimples tamanho={32} /><EmblemaSimples tamanho={16} />
          </div>
        </section>
      </main>
    </div>
  );
}
