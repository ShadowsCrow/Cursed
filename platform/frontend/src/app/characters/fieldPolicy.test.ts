import { describe, expect, it } from "vitest";

import { campoBloqueado, campoEditavel, campoExigeAprovacao } from "./fieldPolicy";
import type { PermissoesFicha } from "./types";

function permissoes(overrides: Partial<PermissoesFicha> = {}): PermissoesFicha {
  return {
    papel: "jogador",
    editar: true,
    excluir: false,
    transferir: false,
    campos_bloqueados: [],
    campos_exigem_aprovacao: [],
    ...overrides,
  };
}

describe("fieldPolicy", () => {
  it("uma regra de bloqueio atinge o campo exato", () => {
    const p = permissoes({ campos_bloqueados: ["personagem.nivel"] });
    expect(campoBloqueado("personagem.nivel", p)).toBe(true);
  });

  it("uma regra 'a' atinge o subcampo 'a.b'", () => {
    const p = permissoes({ campos_bloqueados: ["inventario"] });
    expect(campoBloqueado("inventario.equipado", p)).toBe(true);
  });

  it("uma regra mais específica também bloqueia o campo mais amplo que a contém", () => {
    const p = permissoes({ campos_bloqueados: ["personagem.nivel"] });
    expect(campoBloqueado("personagem", p)).toBe(true);
  });

  it("não bloqueia campos não relacionados", () => {
    const p = permissoes({ campos_bloqueados: ["inventario"] });
    expect(campoBloqueado("efeitos", p)).toBe(false);
  });

  it("campos que exigem aprovação são identificados separadamente de bloqueados", () => {
    const p = permissoes({ campos_exigem_aprovacao: ["personagem.nome"] });
    expect(campoExigeAprovacao("personagem.nome", p)).toBe(true);
    expect(campoBloqueado("personagem.nome", p)).toBe(false);
  });

  it("campoEditavel é falso sem permissão geral de editar, mesmo sem bloqueio específico", () => {
    const p = permissoes({ editar: false });
    expect(campoEditavel("personagem.nome", p)).toBe(false);
  });

  it("campoEditavel é falso quando o campo está bloqueado, mesmo com editar=true", () => {
    const p = permissoes({ editar: true, campos_bloqueados: ["personagem"] });
    expect(campoEditavel("personagem.nome", p)).toBe(false);
  });

  it("campoEditavel é verdadeiro quando editar=true e o campo não está bloqueado", () => {
    const p = permissoes({ editar: true, campos_bloqueados: ["inventario"] });
    expect(campoEditavel("personagem.nome", p)).toBe(true);
  });
});
