import type { CartaPersonagemResumo } from "../cards/types";

/*
 * Cartas da referência da aba Cartas (redesenhar-aba-cartas, D11): as dez habilidades da imagem do usuário,
 * aprendidas e concedidas pela classe do Lion, sem custos definidos, com os mesmos textos (os que a imagem
 * corta com reticências foram completados). Mais duas armas e uma magia da raça, para os filtros.
 */

const CLASSE = "classe:Especialista de Combate";

const HABILIDADES: [string, string][] = [
  ["Segundo round", "Uma vez a cada 2 turnos durante seu turno, você pode fazer uma ação extra ativa sem atacar."],
  ["Combinação tática", "Dá um ataque extra dependendo de ações de aliados próximos em combate. Estratégia em grupo faz a diferença no campo."],
  ["Digno de atenção", "Concentrar seus ataques em um alvo faz com que ele se torne mais suscetível aos seus próximos golpes e aos dos aliados."],
  ["Postura defensiva", "Adota uma postura resistente, reduzindo o dano recebido até o início do seu próximo turno."],
  ["Canalização arcana", "Concentra energia mágica para fortalecer sua próxima ação. A magia envolve seus sentidos, ampliando sua percepção por um instante."],
  ["Passo veloz", "Move-se rapidamente pelo campo de batalha, ignorando terrenos difíceis até o final do turno."],
  ["Tiro preciso", "Seus ataques à distância ignoram parte da cobertura e recebem um bônus contra alvos distraídos."],
  ["Uso de item", "Permite usar um item como ação bônus. Você pode manipular poções e outros itens com rapidez, mesmo sob pressão."],
  ["Presença marcante", "Sua presença impõe respeito. Inimigos que o atacarem sofrem uma penalidade em testes de moral enquanto você estiver de pé."],
  ["Curso do tempo", "Aprendeu a controlar brevemente o ritmo da batalha, ganhando vantagem em iniciativas."],
];

const CUSTOS_INDEFINIDOS = { custo_aprendizado: null, potencia_uso: null, custo_uso: null };

function carta(indice: number, parcial: Omit<Partial<CartaPersonagemResumo>, "carta"> & {
  tipo: CartaPersonagemResumo["tipo"]; conteudo: Record<string, unknown>;
}): CartaPersonagemResumo {
  const { conteudo, ...resto } = parcial;
  const id = `carta-ref-${indice}`;
  return {
    id, personagem_id: "lion", estado: "aprendida", origem: "concessao", excecao_aprendizado: false,
    adquirida_em: new Date(Date.UTC(2026, 8, 1, 12, indice)).toISOString(), concedida_por: null,
    carta: { versao_id: `v-${id}`, definicao_id: `d-${id}`, numero: 1, tipo: resto.tipo, conteudo: { tipo: resto.tipo, ...conteudo } },
    ...resto,
  };
}

/** As dez habilidades da imagem, na ordem em que aparecem nela. */
export const CARTAS_DA_REFERENCIA: CartaPersonagemResumo[] = HABILIDADES.map(([titulo, texto], indice) =>
  carta(indice, { tipo: "habilidade", concedida_por: CLASSE, conteudo: { titulo, texto, ...CUSTOS_INDEFINIDOS } }));

/** Cartas a mais, fora da imagem, para os filtros de origem e de tipo. */
export const CARTAS_PARA_FILTROS: CartaPersonagemResumo[] = [
  carta(10, { tipo: "magia", concedida_por: "raca:Elfo", conteudo: {
    titulo: "Luz das estrelas", texto: "Uma centelha élfica ilumina a área e revela o que está escondido.", escola: "perceptiva",
    ...CUSTOS_INDEFINIDOS, potencia_uso: 2, custo_uso: 1 } }),
  carta(11, { tipo: "item", estado: "no_inventario", conteudo: {
    titulo: "Espada longa", texto: "Lâmina reta de aço, equilibrada para golpes amplos.", item_tipo: "arma",
    formato: { subtipo: "uma_mao", largura: 1, altura: 3 } } }),
  carta(12, { tipo: "item", estado: "no_inventario", origem: "oferta", conteudo: {
    titulo: "Arco curto", texto: "Arco leve de teixo, fácil de carregar nas viagens.", item_tipo: "arma",
    formato: { subtipo: "duas_maos", largura: 1, altura: 3 } } }),
];

/** Visão do jogador: sem os custos reservados ao Narrador, como o servidor manda. */
const RESERVADOS = new Set(["custo_aprendizado", "descansos_minimos", "custo_legado"]);

export function semCustosReservados(cartas: CartaPersonagemResumo[]): CartaPersonagemResumo[] {
  return cartas.map((c) => ({
    ...c, carta: { ...c.carta, conteudo: Object.fromEntries(Object.entries(c.carta.conteudo).filter(([chave]) => !RESERVADOS.has(chave))) },
  }));
}
