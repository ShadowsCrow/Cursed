import { useState } from "react";
import { Link } from "react-router";

import { ResumoVisual } from "./characters/sheet/resumo/ResumoVisual";
import { ARTE_DO_RESUMO, IMAGEM_PADRAO, type ModeloDoResumo, type SecaoDoResumo } from "./characters/sheet/resumo/modelo";
import { Glyph } from "../ui/Display";


/** Personagem fictício só para a prova visual: nenhum número aqui vem das regras. */
const COMPLETO: ModeloDoResumo = {
  nome: "Thalen Aerendir",
  classe: "Mago",
  arquetipo: "Mutante Arcano",
  raca: "Elfo",
  nivel: 3,
  corClasse: "#1f3566",
  imagem: { src: IMAGEM_PADRAO, origem: "ilustracao" },
  recursos: {
    pv: { valor: 22, atual: 14 },
    pp: { valor: 24, atual: 18 },
    defesa: { valor: 11 },
    armadura: { valor: 12 },
    rdb: { valor: 1 },
  },
  atributos: [
    { titulo: "Físicos", itens: [
      { nome: "Força", valor: 1, icone: "forca" }, { nome: "Destreza", valor: 2, icone: "destreza" }, { nome: "Vigor", valor: 1, icone: "vigor" },
    ] },
    { titulo: "Sociais", itens: [
      { nome: "Carisma", valor: 2, icone: "carisma" }, { nome: "Manipulação", valor: 1, icone: "manipulacao" }, { nome: "Propósito", valor: 2, icone: "proposito" },
    ] },
    { titulo: "Mentais", itens: [
      { nome: "Percepção", valor: 2, icone: "percepcao" }, { nome: "Inteligência", valor: 3, icone: "inteligencia" }, { nome: "Raciocínio", valor: 1, icone: "raciocinio" },
    ] },
  ],
  pericias: [
    { nome: "Arcanismo", valor: 3, icone: "arcanismo" },
    { nome: "Esquiva", valor: 2, icone: "talentos" },
    { nome: "Investigação", valor: 2, icone: "conhecimentos" },
    { nome: "Ocultismo", valor: 2, icone: "conhecimentos" },
    { nome: "Prontidão", valor: 1, icone: "percepcao" },
    { nome: "Furtividade", valor: 1, icone: "furtividade" },
  ],
  equipamentos: {
    visiveis: [
      { nome: "Cajado Arcano", quantidade: 1, tipo: "arma", descricao: "Madeira de freixo com um cristal preso por raízes." },
      { nome: "Grimório Pessoal", quantidade: 1, tipo: "outro", descricao: "Anotações cifradas de anos de estudo." },
      { nome: "Robe do Viajante", quantidade: 1, tipo: "armadura", descricao: "Tecido grosso bordado com runas de proteção." },
      { nome: "Bolsa de Aventureiro", quantidade: 1, tipo: "outro", descricao: "Corda, pederneira e rações para três dias." },
      { nome: "Poção de Cura", quantidade: 3, tipo: "outro", descricao: "Frascos lacrados com cera vermelha." },
    ],
    restantes: 1,
  },
  habilidades: {
    visiveis: [
      { nome: "Projétil Arcano", tipo: "magia", descricao: "Um dardo de energia que busca o alvo." },
      { nome: "Escudo Místico", tipo: "magia", descricao: "Uma barreira breve entre o mago e o golpe." },
      { nome: "Passo Etéreo", tipo: "magia", descricao: "Alguns metros atravessados num piscar." },
      { nome: "Saber Antigo", tipo: "habilidade", descricao: "Lembra o que os livros esqueceram." },
    ],
    restantes: 2,
  },
  historia:
    "Thalen nasceu numa casa de nome antigo, entre bibliotecas silenciosas e expectativas altas demais. Aprendeu cedo que o sobrenome abria portas, mas não respondia perguntas.\n\n"
    + "Depois da noite em que o selo da família rachou sozinho, deixou tudo para trás. Hoje segue sem destino fixo, atrás de ruínas, tomos proibidos e da origem do poder que corre no próprio sangue.",
};

const SEM_IMAGEM_E_HISTORIA: ModeloDoResumo = {
  ...COMPLETO,
  imagem: { src: IMAGEM_PADRAO, origem: "padrao" },
  historia: undefined,
};

const FICHA_VAZIA: ModeloDoResumo = {
  nome: "Sem nome",
  imagem: { src: IMAGEM_PADRAO, origem: "padrao" },
  recursos: {
    pv: { valor: null, motivo: "Classe não definida." },
    pp: { valor: null, motivo: "Classe não definida." },
    defesa: { valor: 0 },
    armadura: { valor: 0 },
    rdb: { valor: 0 },
  },
  atributos: COMPLETO.atributos.map((g) => ({ ...g, itens: g.itens.map((i) => ({ ...i, valor: 0 })) })),
  pericias: [],
  equipamentos: { visiveis: [], restantes: 0 },
  habilidades: { visiveis: [], restantes: 0 },
};

const ESTADOS = {
  completo: { rotulo: "Completo", modelo: COMPLETO, editar: true },
  parcial: { rotulo: "Sem ilustração e sem História", modelo: SEM_IMAGEM_E_HISTORIA, editar: true },
  leitura: { rotulo: "Só leitura", modelo: SEM_IMAGEM_E_HISTORIA, editar: false },
  vazio: { rotulo: "Ficha vazia", modelo: FICHA_VAZIA, editar: true },
} as const;

type Estado = keyof typeof ESTADOS;

/**
 * Prova visual do Resumo (tarefa 4A.1): a composição completa com dados fictícios, para comparar
 * com a imagem de referência antes de ligar a aba aos dados reais da ficha.
 */
export function ProvaDoResumo() {
  const [estado, setEstado] = useState<Estado>("completo");
  const [aviso, setAviso] = useState("");
  const atual = ESTADOS[estado];
  const abrir = (secao: SecaoDoResumo) => setAviso(`Na ficha, este atalho abre a aba “${secao}”.`);

  return (
    <div className="prova-resumo">
      <div className="demo-ribbon">
        <Glyph name="eye" size={15} /><span>Prova do Resumo com dados fictícios. Nada é salvo.</span>
        <Link to="/preview/tema">Prova do tema <Glyph name="arrow" size={14} /></Link>
      </div>
      <main id="main-content" className="prova-resumo__conteudo">
        <fieldset className="prova-resumo__estados">
          <legend>Estado de exemplo</legend>
          {(Object.keys(ESTADOS) as Estado[]).map((chave) => (
            <label key={chave}>
              <input type="radio" name="estado-resumo" value={chave} checked={estado === chave} onChange={() => { setEstado(chave); setAviso(""); }} />
              {ESTADOS[chave].rotulo}
            </label>
          ))}
        </fieldset>
        <p className="prova-resumo__aviso" role="status">{aviso}</p>
        <ResumoVisual
          modelo={atual.modelo}
          podeEditar={atual.editar}
          onAbrir={abrir}
          arte={ARTE_DO_RESUMO}
          acaoImagem={atual.editar
            ? <button type="button" className="button button--secondary" onClick={() => setAviso("Na ficha, este botão envia a ilustração.")}>
                {atual.modelo.imagem.origem === "ilustracao" ? "Trocar ilustração" : "Enviar ilustração"}
              </button>
            : undefined}
        />
      </main>
    </div>
  );
}
