/**
 * Motor da grade de carga (mudança `carga-por-espacos`, decisão D1).
 *
 * Funções puras: a mesma resposta precisa sair daqui e de `cursed_platform/domain/grade.py`.
 * Os casos de `fixtures/grade/casos.json` são executados pelas duas suítes.
 *
 * Coordenadas absolutas (D2): coluna e linha a partir de 0. Toda célula fora das colunas ou
 * linhas verdes é vermelha. Colocar um item só é permitido na área verde mais a linha vermelha
 * extra; itens que já estavam em linhas ou colunas "perdidas" (Força ou Tamanho reduzidos)
 * continuam onde estão, contando como sobrecarga.
 */

export type Tamanho = "minusculo" | "pequeno" | "medio" | "grande" | "enorme" | "colossal";

export type Subtipo =
  | "peitoral" | "capacete" | "luvas" | "botas"
  | "uma_mao" | "duas_maos" | "escudo"
  | "mochila" | "aljava"
  | "moedas" | "outro" | "criatura";

export type FonteAmpliacao = "mochila" | "magia" | "habilidade";

export interface Ampliacao {
  fonte: FonteAmpliacao;
  rotulo: string;
  linhas: number;
  colunas: number;
}

export interface ItemGrade {
  id: string;
  nome: string;
  subtipo: Subtipo;
  largura: number;
  altura: number;
  /** `null` quando o item está fora da grade (bandeja "Sem dimensão" ou chão). */
  coluna: number | null;
  linha: number | null;
  girado: boolean;
  equipado: boolean;
  /** Mãos ocupadas quando empunhado: definidas em itens do tipo Outros; em armas versáteis, a empunhadura atual. */
  maos?: 0 | 1 | 2;
  /** Arma de uma mão que pode ser empunhada com as duas. */
  versatil?: boolean;
  requisitoForca?: number;
  /** Mochila: quanto amplia a grade quando equipada. */
  ampliacao?: { linhas: number; colunas: number };
  /** Unidades na pilha (só exibição; o motor não usa). */
  quantidade?: number;
}

export interface RegrasGrade {
  linhasBase: number;
  colunasPorTamanho: Record<Tamanho, number>;
}

export interface ParametrosGrade {
  forca: number;
  tamanho: Tamanho;
  /** Ampliações vindas de magias e habilidades; a da mochila sai do item equipado. */
  ampliacoes?: Ampliacao[];
  /** Só para calibração no protótipo; sem isso valem os números da regra. */
  regras?: RegrasGrade;
}

/** Números aprovados na calibração de 2026-09-27 (docs/regras/calibracao-carga-em-grade.md). */
export const COLUNAS_POR_TAMANHO: Record<Tamanho, number> = {
  minusculo: 2, pequeno: 4, medio: 5, grande: 7, enorme: 9, colossal: 11,
};
export const LINHAS_BASE = 2;
export const LINHAS_VERMELHAS_EXTRAS = 1;

export const DIMENSAO_CRIATURA: Record<Exclude<Tamanho, "enorme" | "colossal">, { largura: number; altura: number }> = {
  minusculo: { largura: 2, altura: 3 },
  pequeno: { largura: 3, altura: 4 },
  medio: { largura: 4, altura: 5 },
  grande: { largura: 5, altura: 7 },
};

const PECAS_UNICAS: ReadonlySet<Subtipo> = new Set(["peitoral", "capacete", "luvas", "botas", "mochila", "aljava"]);

export const ROTULO_SUBTIPO: Record<Subtipo, string> = {
  peitoral: "peitoral", capacete: "capacete", luvas: "luvas", botas: "botas",
  uma_mao: "arma de uma mão", duas_maos: "arma de duas mãos", escudo: "escudo",
  mochila: "mochila", aljava: "aljava", moedas: "moedas", outro: "item", criatura: "criatura",
};

export interface Grade {
  colunasVerdes: number;
  linhasVerdes: number;
  /** Ampliações efetivamente aplicadas (uma por fonte). */
  ampliacoes: Ampliacao[];
}

/** Uma ampliação por fonte: se houver duas da mesma fonte, vale a maior. */
export function calcularGrade(parametros: ParametrosGrade, itens: readonly ItemGrade[] = []): Grade {
  const candidatas: Ampliacao[] = [...(parametros.ampliacoes ?? [])];
  for (const item of itens) {
    if (item.subtipo === "mochila" && item.equipado && item.ampliacao) {
      candidatas.push({ fonte: "mochila", rotulo: item.nome, ...item.ampliacao });
    }
  }
  const porFonte = new Map<FonteAmpliacao, Ampliacao>();
  for (const ampliacao of candidatas) {
    const atual = porFonte.get(ampliacao.fonte);
    if (!atual || ampliacao.linhas + ampliacao.colunas > atual.linhas + atual.colunas) {
      porFonte.set(ampliacao.fonte, ampliacao);
    }
  }
  const aplicadas = [...porFonte.values()];
  const forca = Math.max(0, Math.floor(parametros.forca));
  return {
    colunasVerdes: (parametros.regras?.colunasPorTamanho ?? COLUNAS_POR_TAMANHO)[parametros.tamanho]
      + aplicadas.reduce((s, a) => s + a.colunas, 0),
    linhasVerdes: (parametros.regras?.linhasBase ?? LINHAS_BASE) + forca + aplicadas.reduce((s, a) => s + a.linhas, 0),
    ampliacoes: aplicadas,
  };
}

export function dimensoes(item: Pick<ItemGrade, "largura" | "altura" | "girado">): { largura: number; altura: number } {
  return item.girado ? { largura: item.altura, altura: item.largura } : { largura: item.largura, altura: item.altura };
}

export function naGrade(item: ItemGrade): item is ItemGrade & { coluna: number; linha: number } {
  return item.coluna !== null && item.linha !== null;
}

export function celulasDe(item: ItemGrade): Array<[number, number]> {
  if (!naGrade(item)) return [];
  const { largura, altura } = dimensoes(item);
  const celulas: Array<[number, number]> = [];
  for (let l = item.linha; l < item.linha + altura; l += 1) {
    for (let c = item.coluna; c < item.coluna + largura; c += 1) celulas.push([c, l]);
  }
  return celulas;
}

export function ehVermelha(grade: Grade, coluna: number, linha: number): boolean {
  return coluna >= grade.colunasVerdes || linha >= grade.linhasVerdes;
}

/** Área exibida: verde + linha vermelha extra, estendida até cobrir itens em linhas ou colunas perdidas. */
export function limitesFisicos(grade: Grade, itens: readonly ItemGrade[]): { colunas: number; linhas: number } {
  let colunas = grade.colunasVerdes;
  let linhas = grade.linhasVerdes + LINHAS_VERMELHAS_EXTRAS;
  for (const item of itens) {
    if (!naGrade(item)) continue;
    const { largura, altura } = dimensoes(item);
    colunas = Math.max(colunas, item.coluna + largura);
    linhas = Math.max(linhas, item.linha + altura);
  }
  return { colunas, linhas };
}

export type MotivoPosicao = "fora_da_grade" | "sobreposicao";

export interface ResultadoPosicao {
  ok: boolean;
  motivo?: MotivoPosicao;
  /** Ids dos itens que ocupam as células pedidas. */
  conflitos?: string[];
}

/** Colocar ou mover um item só é permitido na área verde mais a linha vermelha extra. */
export function validarPosicao(
  grade: Grade, itens: readonly ItemGrade[], item: ItemGrade, coluna: number, linha: number, girado: boolean,
): ResultadoPosicao {
  const { largura, altura } = dimensoes({ ...item, girado });
  const limiteLinhas = grade.linhasVerdes + LINHAS_VERMELHAS_EXTRAS;
  if (coluna < 0 || linha < 0 || coluna + largura > grade.colunasVerdes || linha + altura > limiteLinhas) {
    return { ok: false, motivo: "fora_da_grade" };
  }
  const pedidas = new Set<string>();
  for (let l = linha; l < linha + altura; l += 1) for (let c = coluna; c < coluna + largura; c += 1) pedidas.add(`${c},${l}`);
  const conflitos = itens
    .filter((outro) => outro.id !== item.id && celulasDe(outro).some(([c, l]) => pedidas.has(`${c},${l}`)))
    .map((outro) => outro.id);
  return conflitos.length > 0 ? { ok: false, motivo: "sobreposicao", conflitos } : { ok: true };
}

/** Primeira posição livre em ordem de leitura, tentando a orientação original e depois girada. */
export function encontrarEspaco(
  grade: Grade, itens: readonly ItemGrade[], item: ItemGrade, { permitirVermelho = true } = {},
): { coluna: number; linha: number; girado: boolean } | null {
  const limiteLinhas = grade.linhasVerdes + (permitirVermelho ? LINHAS_VERMELHAS_EXTRAS : 0);
  const orientacoes = item.largura === item.altura ? [item.girado] : [item.girado, !item.girado];
  for (let linha = 0; linha < limiteLinhas; linha += 1) {
    for (let coluna = 0; coluna < grade.colunasVerdes; coluna += 1) {
      for (const girado of orientacoes) {
        const { altura } = dimensoes({ ...item, girado });
        if (linha + altura > limiteLinhas) continue;
        if (validarPosicao(grade, itens, item, coluna, linha, girado).ok) return { coluna, linha, girado };
      }
    }
  }
  return null;
}

/**
 * Onde o item cabe depois de girado: no mesmo lugar; senão, nas posições em que o item girado se sobrepõe ao espaço
 * que já ocupava, da mais próxima para a mais distante; senão, no lugar livre mais próximo. Evita entrar na área
 * vermelha, a menos que o item já esteja nela ou não haja outra opção. Só a interface usa: o servidor valida o resultado.
 */
export function lugarParaGirar(
  grade: Grade, itens: readonly ItemGrade[], item: ItemGrade,
): { coluna: number; linha: number; girado: boolean } | null {
  if (!naGrade(item)) return null;
  const girado = !item.girado;
  const atual = dimensoes(item);
  const nova = dimensoes({ ...item, girado });
  const limiteLinhas = grade.linhasVerdes + LINHAS_VERMELHAS_EXTRAS;
  const jaNoVermelho = celulasDe(item).some(([c, l]) => ehVermelha(grade, c, l));
  const candidatos: Array<{ coluna: number; linha: number; ordem: number[] }> = [];
  for (let linha = 0; linha + nova.altura <= limiteLinhas; linha += 1) {
    for (let coluna = 0; coluna + nova.largura <= grade.colunasVerdes; coluna += 1) {
      if (!validarPosicao(grade, itens, item, coluna, linha, girado).ok) continue;
      let vermelhas = 0;
      for (let l = linha; l < linha + nova.altura; l += 1) {
        for (let c = coluna; c < coluna + nova.largura; c += 1) if (ehVermelha(grade, c, l)) vermelhas += 1;
      }
      const sobrepoe = coluna < item.coluna + atual.largura && coluna + nova.largura > item.coluna
        && linha < item.linha + atual.altura && linha + nova.altura > item.linha;
      const mesmoLugar = coluna === item.coluna && linha === item.linha;
      candidatos.push({ coluna, linha, ordem: [
        !jaNoVermelho && vermelhas > 0 ? 1 : 0, mesmoLugar ? 0 : 1, sobrepoe ? 0 : 1,
        Math.abs(coluna - item.coluna) + Math.abs(linha - item.linha), linha, coluna,
      ] });
    }
  }
  candidatos.sort((a, b) => {
    for (let i = 0; i < a.ordem.length; i += 1) {
      const diferenca = (a.ordem[i] ?? 0) - (b.ordem[i] ?? 0);
      if (diferenca !== 0) return diferenca;
    }
    return 0;
  });
  const melhor = candidatos[0];
  return melhor ? { coluna: melhor.coluna, linha: melhor.linha, girado } : null;
}

export function maosDoItem(item: ItemGrade): number {
  switch (item.subtipo) {
    case "uma_mao":
      // Arma versátil empunhada com as duas mãos ocupa as duas.
      return item.maos === 2 ? 2 : 1;
    case "escudo":
      return 1;
    case "duas_maos":
      return 2;
    case "outro":
      return item.maos ?? 0;
    default:
      return 0;
  }
}

export function maosOcupadas(itens: readonly ItemGrade[]): number {
  return itens.filter((i) => i.equipado).reduce((soma, i) => soma + maosDoItem(i), 0);
}

export type MotivoEquipar = "peca_repetida" | "maos_insuficientes" | "requisito_forca" | "nao_equipavel" | "fora_da_grade";

export interface ResultadoEquipar {
  ok: boolean;
  motivo?: MotivoEquipar;
  mensagem?: string;
}

const NAO_EQUIPAVEIS: ReadonlySet<Subtipo> = new Set(["moedas", "criatura"]);

export function validarEquipar(itens: readonly ItemGrade[], item: ItemGrade, forca: number): ResultadoEquipar {
  if (NAO_EQUIPAVEIS.has(item.subtipo) || (item.subtipo === "outro" && maosDoItem(item) === 0)) {
    return { ok: false, motivo: "nao_equipavel", mensagem: `${item.nome} não pode ser equipado.` };
  }
  // Só o que está na grade é levado; a mochila equipada é a exceção, porque não ocupa célula.
  if (item.subtipo !== "mochila" && !naGrade(item)) {
    return { ok: false, motivo: "fora_da_grade", mensagem: `${item.nome} precisa estar na grade para ser levado e equipado.` };
  }
  const outros = itens.filter((i) => i.id !== item.id && i.equipado);
  if (PECAS_UNICAS.has(item.subtipo)) {
    const repetida = outros.find((i) => i.subtipo === item.subtipo);
    if (repetida) {
      return {
        ok: false, motivo: "peca_repetida",
        mensagem: `Só um item de ${ROTULO_SUBTIPO[item.subtipo]} fica equipado por vez: ${repetida.nome} já está. Desequipe antes.`,
      };
    }
  }
  const maos = maosOcupadas(outros) + maosDoItem(item);
  if (maos > 2) {
    return { ok: false, motivo: "maos_insuficientes", mensagem: `${item.nome} precisa de mãos livres. Solte algo antes.` };
  }
  if (item.requisitoForca !== undefined && forca < item.requisitoForca) {
    return {
      ok: false, motivo: "requisito_forca",
      mensagem: `${item.nome} exige Força ${item.requisitoForca}.`,
    };
  }
  return { ok: true };
}

export interface Avaliacao {
  sobrecarga: boolean;
  /** Itens com ao menos uma célula vermelha. */
  itensEmSobrecarga: string[];
  /** Pares de itens sobrepostos (arrumação inválida). */
  sobreposicoes: Array<[string, string]>;
  maosOcupadas: number;
  celulasOcupadas: number;
  celulasVerdes: number;
}

export function avaliar(grade: Grade, itens: readonly ItemGrade[]): Avaliacao {
  const dono = new Map<string, string>();
  const sobreposicoes: Array<[string, string]> = [];
  const itensEmSobrecarga: string[] = [];
  let celulasOcupadas = 0;
  for (const item of itens) {
    let vermelho = false;
    for (const [c, l] of celulasDe(item)) {
      celulasOcupadas += 1;
      const chave = `${c},${l}`;
      const anterior = dono.get(chave);
      if (anterior !== undefined && !sobreposicoes.some(([a, b]) => a === anterior && b === item.id)) {
        sobreposicoes.push([anterior, item.id]);
      }
      dono.set(chave, item.id);
      if (ehVermelha(grade, c, l)) vermelho = true;
    }
    if (vermelho) itensEmSobrecarga.push(item.id);
  }
  return {
    sobrecarga: itensEmSobrecarga.length > 0,
    itensEmSobrecarga,
    sobreposicoes,
    maosOcupadas: maosOcupadas(itens),
    celulasOcupadas,
    celulasVerdes: grade.colunasVerdes * grade.linhasVerdes,
  };
}

export const TIPOS_MOEDA = ["cobre", "prata", "ouro"] as const;
export type TipoMoeda = (typeof TIPOS_MOEDA)[number];
export type Bolsa = Record<TipoMoeda, number>;

/** Divide as moedas em pilhas mistas de até `porPilha`, na ordem cobre, prata, ouro. */
export function distribuirMoedas(bolsa: Bolsa, porPilha: number): Bolsa[] {
  if (!Number.isInteger(porPilha) || porPilha < 1) throw new Error("Moedas por pilha deve ser um inteiro positivo.");
  const pilhas: Bolsa[] = [];
  let atual: Bolsa = { cobre: 0, prata: 0, ouro: 0 };
  let ocupadas = 0;
  for (const tipo of TIPOS_MOEDA) {
    let restante = Math.max(0, Math.floor(bolsa[tipo]));
    while (restante > 0) {
      const cabe = Math.min(restante, porPilha - ocupadas);
      atual[tipo] += cabe;
      ocupadas += cabe;
      restante -= cabe;
      if (ocupadas === porPilha) {
        pilhas.push(atual);
        atual = { cobre: 0, prata: 0, ouro: 0 };
        ocupadas = 0;
      }
    }
  }
  if (ocupadas > 0) pilhas.push(atual);
  return pilhas;
}
