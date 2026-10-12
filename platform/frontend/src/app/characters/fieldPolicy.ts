import type { PermissoesFicha } from "./types";

/**
 * Mesma regra de prefixo usada pela API (`cursed_platform.policies._atinge`):
 * uma regra "a" atinge o campo "a.b", e um campo "a" também é atingido por uma
 * regra mais específica "a.b" (a alteração do objeto inteiro cobre o subcampo).
 */
export function regraAtingeCampo(campo: string, regra: string): boolean {
  return campo === regra || campo.startsWith(`${regra}.`) || regra.startsWith(`${campo}.`);
}

export function campoBloqueado(campo: string, permissoes: PermissoesFicha): boolean {
  return (permissoes.campos_bloqueados ?? []).some((regra) => regraAtingeCampo(campo, regra));
}

export function campoExigeAprovacao(campo: string, permissoes: PermissoesFicha): boolean {
  return (permissoes.campos_exigem_aprovacao ?? []).some((regra) => regraAtingeCampo(campo, regra));
}

/** Verdadeiro quando o usuário pode enviar uma alteração direta ou por aprovação para o campo. */
export function campoEditavel(campo: string, permissoes: PermissoesFicha | undefined): boolean {
  return Boolean(permissoes?.editar) && !campoBloqueado(campo, permissoes as PermissoesFicha);
}
