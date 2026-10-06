/**
 * Prévia do movimento no modo turno (modo-de-turno, D8b): quanto o arraste vai gastar de Deslocamento e se cabe no
 * saldo. É só visual; quem decide é o servidor, com a mesma conta: cada casa vale 1 m, inclusive na diagonal.
 */
import type { CombateDoTurno } from "./useModoDeTurno";

export interface Casa { x: number; y: number }
export interface MedidaDoArraste { texto: string; excede: boolean }

export const custoEmMetros = (origem: Casa, destino: Casa) =>
  Math.max(Math.abs(destino.x - origem.x), Math.abs(destino.y - origem.y));

export function medirArraste({ combate, tokenId, narrador, livre, origem, destino }: {
  combate: CombateDoTurno | null | undefined;
  /** Token arrastado: o participante é quem tem esse token (o grupo da ficha ou o token próprio, D8d). */
  tokenId: string;
  narrador: boolean;
  /** Movimento livre do Narrador (chave da barra ou Alt). */
  livre: boolean;
  origem: Casa;
  destino: Casa;
}): MedidaDoArraste | null {
  if (!combate) return null;
  const participante = combate.participantes.find((p) => p.token_ids?.includes(tokenId));
  if (!participante) return null;
  const custo = custoEmMetros(origem, destino);
  if (narrador && livre) return { texto: `${custo} m · livre`, excede: false };
  // Na fase de iniciativa ninguém tem a vez: o jogador não move, e o Narrador só com o Movimento livre.
  if (combate.estado !== "combate") {
    return narrador ? { texto: "Fora da vez: ligue o Movimento livre", excede: true } : null;
  }
  if (participante.id !== combate.vez_participante_id) {
    return narrador ? { texto: "Fora da vez: ligue o Movimento livre", excede: true } : { texto: "Não é a sua vez", excede: true };
  }
  const movimento = participante.movimento;
  if (!movimento) return { texto: `${custo} m`, excede: false };
  const sobra = movimento.limite - movimento.gasto - custo;
  return sobra >= 0
    ? { texto: `${custo} m · restam ${sobra} m`, excede: false }
    : { texto: `${custo} m · faltam ${-sobra} m`, excede: true };
}
