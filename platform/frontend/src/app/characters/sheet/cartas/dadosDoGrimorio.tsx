import type { ReactNode } from "react";

import { custosDaCarta } from "../../../cards/cardFormat";
import type { TipoCarta } from "../../../cards/types";
import { rotuloDaOrigem, type Carta } from "./apresentacao";
import type { NomeIconeDado } from "./grimorio";

/* Quadros de dados da página direita do grimório (redesenhar-aba-cartas, D8 revisto). */

type Conteudo = Record<string, unknown>;

const lista = (valor: unknown) => (Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string" && Boolean(v.trim())) : []);
const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

export interface Dado { icone: NomeIconeDado; rotulo: string; valor: ReactNode; largo?: boolean }
export type ColunaDoDado = "esquerda" | "direita" | "larga";

/** "classe:Especialista de Combate" -> "Especialista de Combate": o prefixo das marcações do catálogo é interno. */
const marcacao = (tag: string) => tag.includes(":") ? tag.slice(tag.indexOf(":") + 1).split("/").pop()!.trim() : tag;
/**
 * Valor longo demais para meio quadro: o par dele ocupa as duas colunas, na mesma ordem. O limite é alto: no
 * conceito os pares ficam sempre lado a lado, e um texto como a origem da classe quebra dentro do quadro.
 */
const LARGO = 60;
const longo = (dado: Dado) => dado.largo || (typeof dado.valor === "string" && dado.valor.length > LARGO);

/** Distribui os quadros em pares (esquerda e direita); um par com valor longo vira dois quadros largos. */
export function emColunas(dados: Dado[]): (Dado & { coluna: ColunaDoDado })[] {
  const saida: (Dado & { coluna: ColunaDoDado })[] = [];
  let pendente: Dado | null = null;
  for (const dado of dados) {
    if (dado.largo) {
      if (pendente) saida.push({ ...pendente, coluna: "larga" });
      pendente = null;
      saida.push({ ...dado, coluna: "larga" });
    } else if (!pendente) {
      pendente = dado;
    } else {
      const largos = longo(pendente) || longo(dado);
      saida.push({ ...pendente, coluna: largos ? "larga" : "esquerda" }, { ...dado, coluna: largos ? "larga" : "direita" });
      pendente = null;
    }
  }
  if (pendente) saida.push({ ...pendente, coluna: longo(pendente) ? "larga" : "esquerda" });
  return saida;
}

/** Data curta do quadro ("Recebida em", "Publicada em"); sem data válida, um travessão. */
export function dataDoQuadro(iso: string | null | undefined): string {
  const data = new Date(iso ?? "");
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

export function marcacoesDoConteudo(conteudo: Conteudo): Dado {
  const tags = lista(conteudo.tags);
  return { icone: "marcacoes", rotulo: "Marcações", valor: tags.length ? [...new Set(tags.map(marcacao))].join(" • ") : "Nenhuma" };
}

/** Os quadros de dados da página direita, na ordem da especificação; só os que se aplicam à carta. */
export function dadosDaCarta(carta: Carta, narrador: boolean): Dado[] {
  const conteudo = carta.carta.conteudo as Conteudo;
  return [
    marcacoesDoConteudo(conteudo),
    { icone: "origem", rotulo: "Origem", valor: rotuloDaOrigem(carta) },
    { icone: "versao", rotulo: "Versão", valor: String(carta.carta.numero) },
    { icone: "recebida", rotulo: "Recebida em", valor: dataDoQuadro(carta.adquirida_em) },
    ...dadosDoConteudo(carta.tipo, conteudo, narrador),
  ];
}

/** Os quadros que dependem só do conteúdo (custos, escola, grau, requisitos e legado): a ficha e a biblioteca os usam. */
export function dadosDoConteudo(tipo: TipoCarta, conteudo: Conteudo, narrador: boolean): Dado[] {
  const custos = custosDaCarta(tipo, conteudo, { narrador });
  const valorDe = (rotulo: string) => custos.find((c) => c.label === rotulo)?.value ?? "Não definido";
  const dados: Dado[] = [];
  if (tipo === "habilidade" || tipo === "magia") {
    dados.push({ icone: "potencia", rotulo: "Potência de uso", valor: valorDe("Potência de uso") });
    dados.push({ icone: "custo", rotulo: "Custo de uso", valor: valorDe("Custo de uso") });
  }
  if (tipo === "magia") {
    dados.push({ icone: "escola", rotulo: "Escola", valor: texto(conteudo.escola) || "Não definida" });
    dados.push({ icone: "grau", rotulo: "Grau", valor: typeof conteudo.grau === "number" ? String(conteudo.grau) : "Não definido" });
  }
  if (narrador && (tipo === "habilidade" || tipo === "magia")) {
    dados.push({ icone: "aprendizado", rotulo: "Custo de aprendizado", valor: valorDe("Custo de aprendizado") });
    dados.push({ icone: "descansos", rotulo: "Descansos mínimos", valor: valorDe("Descansos mínimos") });
  }
  const fixos = new Set(["Custo de aprendizado", "Descansos mínimos", "Potência de uso", "Custo de uso"]);
  for (const adicional of custos.filter((c) => !fixos.has(c.label))) {
    dados.push({ icone: "adicional", rotulo: adicional.label, valor: adicional.value });
  }
  const requisitos = lista(conteudo.requisitos);
  if (requisitos.length) {
    dados.push({ icone: "requisitos", rotulo: "Requisitos", largo: true,
      valor: <ul className="grimorio-dado__lista">{requisitos.map((r) => <li key={r}>{r}</li>)}</ul> });
  }
  const legado = narrador ? texto(conteudo.custo_legado) : "";
  if (legado) dados.push({ icone: "legado", rotulo: "Custo legado (apenas histórico)", valor: legado, largo: true });
  return dados;
}
