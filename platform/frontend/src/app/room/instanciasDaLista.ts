/** Instâncias de personagem na lista da Sala (instancias-de-personagem, D4). */
import type { components } from "../../api/generated/schema";

type Personagem = components["schemas"]["PersonagemResumo"];

/** Agrupa as instâncias pelo modelo; as de modelo que não está na lista vão para a chave vazia. */
export function instanciasPorModelo(personagens: readonly Personagem[]): Map<string, Personagem[]> {
  const modelos = new Set(personagens.filter((p) => !p.instancia_de).map((p) => p.id));
  const grupos = new Map<string, Personagem[]>();
  for (const p of personagens) {
    if (!p.instancia_de) continue;
    const chave = modelos.has(p.instancia_de) ? p.instancia_de : "";
    grupos.set(chave, [...(grupos.get(chave) ?? []), p]);
  }
  return grupos;
}

