/**
 * Seletores do Resumo da ficha (aba-resumo-da-ficha, design D3): escolhem e ordenam valores que a
 * ficha guarda ou que o servidor calcula. Nenhum cálculo de regra acontece aqui.
 */
import type { CartaPersonagemResumo } from "../../../cards/types";
import { asNumber, asRecord, asString, type FichaContrato, type ItemInventarioResumo, type ValorDerivadoResumo } from "../../types";
import { exibir } from "../../creation/modelo";
import { chaveDerivada } from "../sheetCatalog";
import {
  IMAGEM_PADRAO,
  type GrupoDeAtributos, type HabilidadeDoResumo, type ItemDoResumo, type LinhaDoResumo, type ListaLimitada,
  type ModeloDoResumo, type RecursoDoResumo, type ValorDoResumo,
} from "./modelo";
import type { NomeIconeFicha } from "./ornamentos";

export const PERICIAS_NO_RESUMO = 6;
export const ITENS_NO_RESUMO = 5;
export const HABILIDADES_NO_RESUMO = 4;

type Grupos = { titulo: string; nomes: string[] }[];
type Icones = Record<string, string> | undefined;

const ICONES_CONHECIDOS: ReadonlySet<string> = new Set<NomeIconeFicha>([
  "forca", "destreza", "vigor", "carisma", "manipulacao", "proposito", "percepcao", "inteligencia", "raciocinio",
  "talentos", "tecnicas", "conhecimentos", "arcanismo", "furtividade", "sobrevivencia", "alvo", "lingua",
]);

/** Ícone do JSON pelo nome; sem ícone próprio (ou desconhecido), o do grupo; senão, nenhum. */
function icone(icones: Icones, nome: string, grupo: string): NomeIconeFicha | undefined {
  for (const candidato of [icones?.[nome], icones?.[grupo]]) {
    if (candidato && ICONES_CONHECIDOS.has(candidato)) return candidato as NomeIconeFicha;
  }
  return undefined;
}

function valorDe(valores: ValorDerivadoResumo[], chave: string): ValorDoResumo {
  const valor = valores.find((v) => v.chave === chave);
  if (!valor) return { valor: null };
  return valor.total === null ? { valor: null, motivo: valor.motivo ?? undefined } : { valor: valor.total };
}

function rotuloDe(valores: ValorDerivadoResumo[], chave: string, nome: string): string {
  // Grafia de exibição (ex.: "Proposito" gravado na ficha aparece como "Propósito").
  return exibir(valores.find((v) => v.chave === chave)?.rotulo || nome);
}

export function atributosAgrupados(valores: ValorDerivadoResumo[], grupos: Grupos, icones?: Icones): GrupoDeAtributos[] {
  return grupos.map((grupo) => ({
    titulo: grupo.titulo,
    itens: grupo.nomes.map((nome) => {
      const chave = chaveDerivada("atributo", nome);
      return { nome: rotuloDe(valores, chave, nome), ...valorDe(valores, chave), icone: icone(icones, nome, grupo.titulo) };
    }),
  }));
}

/**
 * As `limite` perícias de maior valor total, sem as de valor 0 ou sem valor; no empate, a ordem
 * do livro (grupos e nomes na ordem de `grupos`).
 */
export function periciasEmDestaque(valores: ValorDerivadoResumo[], grupos: Grupos, limite = PERICIAS_NO_RESUMO, icones?: Icones): LinhaDoResumo[] {
  const ordenadas = grupos.flatMap((grupo) => grupo.nomes.map((nome) => ({ nome, grupo: grupo.titulo })))
    .map(({ nome, grupo }, posicao) => {
      const chave = chaveDerivada("pericia", nome);
      return { posicao, linha: { nome: rotuloDe(valores, chave, nome), ...valorDe(valores, chave), icone: icone(icones, nome, grupo) } };
    })
    .filter(({ linha }) => linha.valor !== null && linha.valor > 0)
    .sort((a, b) => (b.linha.valor ?? 0) - (a.linha.valor ?? 0) || a.posicao - b.posicao);
  return ordenadas.slice(0, limite).map(({ linha }) => linha);
}

function limitar<T>(lista: T[], limite: number): ListaLimitada<T> {
  return { visiveis: lista.slice(0, limite), restantes: Math.max(0, lista.length - limite) };
}

export interface ItemComArte extends ItemDoResumo {
  /** Arte ou ícone de grade guardado no item, para quem monta a tela resolver. */
  caminhoArte?: string;
}

/** Só os itens equipados, na ordem do inventário. */
export function itensEquipados(inventario: ItemInventarioResumo[], limite = ITENS_NO_RESUMO): ListaLimitada<ItemComArte> {
  const equipados = inventario.filter((item) => item.equipado).map((item): ItemComArte => {
    const dados = asRecord(item.dados);
    const cargas = item.cargas_maximas !== null && item.cargas_maximas !== undefined
      ? `Cargas: ${item.cargas_atuais ?? 0}/${item.cargas_maximas}` : undefined;
    return {
      nome: item.nome, quantidade: item.quantidade, tipo: item.tipo,
      descricao: asString(dados.descricao) ?? cargas,
      caminhoArte: asString(dados.imagem_ativo) ?? asString(dados.icone_grade),
    };
  });
  return limitar(equipados, limite);
}

export interface HabilidadeComArte extends HabilidadeDoResumo {
  caminhoArte?: string;
}

/** Cartas de habilidade e magia já aprendidas, na ordem em que foram adquiridas. */
export function habilidadesAprendidas(cartas: CartaPersonagemResumo[], limite = HABILIDADES_NO_RESUMO): ListaLimitada<HabilidadeComArte> {
  const aprendidas = cartas
    .filter((c) => (c.tipo === "habilidade" || c.tipo === "magia") && c.estado === "aprendida")
    .sort((a, b) => a.adquirida_em.localeCompare(b.adquirida_em))
    .map((c): HabilidadeComArte => {
      const conteudo = asRecord(c.carta.conteudo);
      const ativos = [...(Array.isArray(conteudo.ativos) ? conteudo.ativos : []), ...(Array.isArray(conteudo.ativos_privados) ? conteudo.ativos_privados : [])];
      return {
        nome: asString(conteudo.titulo) ?? "Sem título",
        tipo: c.tipo as "habilidade" | "magia",
        descricao: asString(conteudo.resumo) ?? asString(conteudo.texto),
        caminhoArte: ativos.find((a): a is string => typeof a === "string"),
      };
    });
  return limitar(aprendidas, limite);
}

/** Ilustração do Resumo; sem ela, o retrato; sem os dois, a arte padrão. */
export function imagemCentral(ilustracao?: string, retrato?: string): ModeloDoResumo["imagem"] {
  if (ilustracao) return { src: ilustracao, origem: "ilustracao" };
  if (retrato) return { src: retrato, origem: "retrato" };
  return { src: IMAGEM_PADRAO, origem: "padrao" };
}

/** PV ou PP: máximo calculado pelo servidor e atual registrado na ficha. */
export function recurso(ficha: FichaContrato, valores: ValorDerivadoResumo[], nome: "pv" | "pp"): RecursoDoResumo {
  const atual = asNumber(asRecord(asRecord(asRecord(ficha).recursos)[nome]).atual);
  return { ...valorDe(valores, `recurso:${nome}_maximo`), ...(atual === undefined ? {} : { atual }) };
}

export function recursosDoResumo(ficha: FichaContrato, valores: ValorDerivadoResumo[]): ModeloDoResumo["recursos"] {
  return {
    pv: recurso(ficha, valores, "pv"),
    pp: recurso(ficha, valores, "pp"),
    defesa: valorDe(valores, "defesa:esquiva"),
    armadura: valorDe(valores, "defesa:armadura"),
    rdb: valorDe(valores, "rdb:armadura"),
  };
}

/** História gravada na personalidade, ou nada. */
export function historiaDe(ficha: FichaContrato): string | undefined {
  const texto = asString(asRecord(ficha.personalidade).historia);
  return texto && texto.trim() ? texto : undefined;
}
