/** Rolador de dados da aba Dados da Sala (melhorias-da-sala, item 1). Só sorteia; não interpreta resultados. */

export const TIPOS_DE_DADO = [4, 6, 8, 10, 12, 20, 100] as const;
export type Faces = (typeof TIPOS_DE_DADO)[number];

export const MAXIMO_POR_DADO = 99;
export const LIMITE_DO_MODIFICADOR = 99;

/** Quantos dados de cada tipo e o modificador. */
export interface Montagem {
  dados: Partial<Record<Faces, number>>;
  modificador: number;
}

/** Parcela somada da ficha (item 8): Atributo ou Perícia, com o total que o servidor calcula. */
export interface TermoDaFicha { chave: string; rotulo: string; valor: number }

/** Por qual ficha se rola (item 8): `null` = sem ficha; Atributo e Perícia pelas chaves dos valores derivados. */
export interface EscolhaDaFicha { personagemId: string | null; atributo: string | null; pericia: string | null }

export const SEM_FICHA: EscolhaDaFicha = { personagemId: null, atributo: null, pericia: null };

/** Crítico ou falha crítica num d20 (gamificacao-da-sala); `indice` é a posição no grupo de d20. */
export interface MarcaDoDado { faces: Faces; indice: number; tipo: "critico" | "falha_critica" }

export interface Rolagem {
  id: number;
  expressao: string;
  /** Valores sorteados por tipo de dado, na ordem de `TIPOS_DE_DADO`. */
  grupos: { faces: Faces; valores: number[] }[];
  modificador: number;
  total: number;
  montagem: Montagem;
  /** Nome de quem rolou, nas rolagens de outras pessoas da mesa (item 3). */
  autor?: string;
  /** Rolagem oculta do Narrador: só ele a vê (item 5). */
  oculta?: boolean;
  /** Rolagem pela ficha (item 8): as parcelas somadas e a escolha, para "Rolar de novo". */
  termos?: TermoDaFicha[];
  ficha?: EscolhaDaFicha;
  /** Nome do personagem da ficha, quando quem vê o conhece. */
  personagem?: string;
  /** Marcas de crítico do servidor; só vêm com o destaque de críticos ligado pelo Narrador. */
  marcas?: MarcaDoDado[];
  /** Rolagem de iniciativa do modo turno (modo-de-turno), marcada no histórico. */
  finalidade?: "iniciativa";
}

/** Junta várias rolagens de d20 numa só para animar de uma vez (iniciativa de vários NPCs), com as marcas no lugar. */
export function juntarParaAnimar(rolagens: readonly Pick<Rolagem, "grupos" | "marcas">[]): Pick<Rolagem, "grupos" | "marcas"> {
  const grupos: Rolagem["grupos"] = [];
  const marcas: MarcaDoDado[] = [];
  for (const rolagem of rolagens) {
    for (const grupo of rolagem.grupos) {
      let destino = grupos.find((g) => g.faces === grupo.faces);
      if (!destino) {
        destino = { faces: grupo.faces, valores: [] };
        grupos.push(destino);
      }
      const inicio = destino.valores.length;
      destino.valores.push(...grupo.valores);
      for (const marca of rolagem.marcas ?? []) {
        if (marca.faces === grupo.faces) marcas.push({ ...marca, indice: marca.indice + inicio });
      }
    }
  }
  return { grupos, ...(marcas.length > 0 ? { marcas } : {}) };
}

export function marcaDoDado(rolagem: Pick<Rolagem, "marcas">, faces: Faces, indice: number): MarcaDoDado["tipo"] | null {
  return rolagem.marcas?.find((marca) => marca.faces === faces && marca.indice === indice)?.tipo ?? null;
}

/** A marca mais forte da rolagem, para a faixa e o anúncio: crítico vence falha crítica. */
export function destaqueDaRolagem(rolagem: Pick<Rolagem, "marcas">): MarcaDoDado["tipo"] | null {
  const tipos = (rolagem.marcas ?? []).map((marca) => marca.tipo);
  return tipos.includes("critico") ? "critico" : tipos.includes("falha_critica") ? "falha_critica" : null;
}

export const NOME_DA_MARCA: Record<MarcaDoDado["tipo"], string> = { critico: "Crítico", falha_critica: "Falha crítica" };

/** Fonte de inteiros sem sinal de 32 bits; injetável para os testes. */
export type FonteAleatoria = () => number;

export const MONTAGEM_VAZIA: Montagem = { dados: {}, modificador: 0 };

export const fonteCriptografica: FonteAleatoria = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

const INTERVALO = 2 ** 32;

/**
 * Sorteia uma face de 1 a `faces`, todas igualmente prováveis.
 * Amostragem por rejeição: descarta os valores acima do maior múltiplo de `faces`, que dariam viés ao resto da divisão.
 */
export function sortearFace(faces: number, fonte: FonteAleatoria = fonteCriptografica): number {
  const limite = INTERVALO - (INTERVALO % faces);
  for (;;) {
    const valor = fonte();
    if (valor < limite) return (valor % faces) + 1;
  }
}

export function quantidadeDeDados(montagem: Montagem): number {
  return TIPOS_DE_DADO.reduce((soma, faces) => soma + (montagem.dados[faces] ?? 0), 0);
}

const sinal = (valor: number) => (valor >= 0 ? `+${valor}` : `−${-valor}`);

/**
 * Expressão como `2d6 + 1d20 + 3`, com as parcelas da ficha antes do modificador (`1d20 + Destreza (+4) + 1`),
 * igual à do servidor; o sinal de menos é o tipográfico (−). Vazia quando não há dados.
 */
export function descreverMontagem(montagem: Montagem, termos: readonly Pick<TermoDaFicha, "rotulo" | "valor">[] = []): string {
  const partes = [
    ...TIPOS_DE_DADO.filter((faces) => (montagem.dados[faces] ?? 0) > 0).map((faces) => `${montagem.dados[faces]}d${faces}`),
  ];
  if (partes.length > 0) partes.push(...termos.map((termo) => `${termo.rotulo} (${sinal(termo.valor)})`));
  if (partes.length === 0) return "";
  const { modificador } = montagem;
  const sufixo = modificador > 0 ? ` + ${modificador}` : modificador < 0 ? ` − ${-modificador}` : "";
  return partes.join(" + ") + sufixo;
}

export function acrescentarDado(montagem: Montagem, faces: Faces): Montagem {
  const atual = montagem.dados[faces] ?? 0;
  if (atual >= MAXIMO_POR_DADO) return montagem;
  return { ...montagem, dados: { ...montagem.dados, [faces]: atual + 1 } };
}

/** Tira um dado daquele tipo (botão direito no dado, item 10); sem nenhum, não muda. */
export function removerDado(montagem: Montagem, faces: Faces): Montagem {
  const atual = montagem.dados[faces] ?? 0;
  if (atual <= 0) return montagem;
  const dados = { ...montagem.dados };
  if (atual === 1) delete dados[faces];
  else dados[faces] = atual - 1;
  return { ...montagem, dados };
}

export function ajustarModificador(montagem: Montagem, passo: number): Montagem {
  const modificador = Math.max(-LIMITE_DO_MODIFICADOR, Math.min(LIMITE_DO_MODIFICADOR, montagem.modificador + passo));
  return modificador === montagem.modificador ? montagem : { ...montagem, modificador };
}

export function rolar(montagem: Montagem, id: number, fonte: FonteAleatoria = fonteCriptografica): Rolagem {
  const grupos = TIPOS_DE_DADO.filter((faces) => (montagem.dados[faces] ?? 0) > 0).map((faces) => ({
    faces,
    valores: Array.from({ length: montagem.dados[faces]! }, () => sortearFace(faces, fonte)),
  }));
  const soma = grupos.reduce((total, grupo) => total + grupo.valores.reduce((a, b) => a + b, 0), 0);
  return {
    id, expressao: descreverMontagem(montagem), grupos, modificador: montagem.modificador,
    total: soma + montagem.modificador, montagem,
  };
}
