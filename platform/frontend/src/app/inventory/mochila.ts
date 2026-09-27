import { calcularGrade, encontrarEspaco, type ItemGrade, type ParametrosGrade } from "./gridEngine";

/**
 * Mochila que não fica equipada (desequipada, ou uma segunda mochila) passa a ser um item carregado: entra na
 * grade onde houver espaço, sem a ampliação dela; sem espaço, fica fora da grade esperando ser colocada ou equipada.
 */
export function guardarMochila(parametros: ParametrosGrade, itens: readonly ItemGrade[], id: string): ItemGrade[] {
  const semEla = itens.map((i) => (i.id === id ? { ...i, equipado: false, coluna: null, linha: null } : i));
  const mochila = semEla.find((i) => i.id === id);
  if (!mochila) return semEla;
  const grade = calcularGrade(parametros, semEla);
  const lugar = encontrarEspaco(grade, semEla.filter((i) => i.id !== id), mochila);
  return lugar ? semEla.map((i) => (i.id === id ? { ...i, ...lugar } : i)) : semEla;
}

/** A mochila equipada que seria substituída ao equipar `id`, se houver. */
export function mochilaSubstituida(itens: readonly ItemGrade[], id: string): ItemGrade | null {
  const item = itens.find((i) => i.id === id);
  if (item?.subtipo !== "mochila") return null;
  return itens.find((i) => i.subtipo === "mochila" && i.equipado && i.id !== id) ?? null;
}

/**
 * Só uma mochila fica equipada por vez; equipada, ela não ocupa célula. Equipar uma mochila quando já há outra
 * substitui a antiga, que passa a ser item carregado (na grade se couber, já com a ampliação da nova).
 */
export function equiparOuGuardar(parametros: ParametrosGrade, itens: readonly ItemGrade[], id: string, equipado: boolean): ItemGrade[] {
  const item = itens.find((i) => i.id === id);
  if (item?.subtipo !== "mochila") return itens.map((i) => (i.id === id ? { ...i, equipado } : i));
  if (!equipado) return guardarMochila(parametros, itens, id);
  const antiga = mochilaSubstituida(itens, id);
  const comNova = itens.map((i) => {
    if (i.id === id) return { ...i, equipado: true, coluna: null, linha: null };
    if (i.id === antiga?.id) return { ...i, equipado: false, coluna: null, linha: null };
    return i;
  });
  return antiga ? guardarMochila(parametros, comNova, antiga.id) : comNova;
}
