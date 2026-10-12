// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { components } from "../../api/generated/schema";
import type { ApiClient } from "../characters/types";
import { instanciasPorModelo } from "./instanciasDaLista";
import { PersonagensDosJogadores, type AcoesDeInstancias } from "./PersonagensDosJogadores";

type Personagem = components["schemas"]["PersonagemResumo"];

vi.mock("../plataforma/imagens", () => ({ useRetrato: () => "data:retrato" }));

const personagem = (parcial: Partial<Personagem> & Pick<Personagem, "id" | "nome">): Personagem => ({
  mesa_id: "mesa", versao: 1, proprietario_id: null, tipo: "monstro", visibilidade: "mesa", retrato_objeto: null,
  instancia_de: null, numero_da_instancia: null, ...parcial,
});

const lion = personagem({ id: "lion", nome: "Lion", proprietario_id: "ana", tipo: "personagem" });
const goblin = personagem({ id: "goblin", nome: "Goblin" });
const goblin1 = personagem({ id: "g1", nome: "Goblin 1", instancia_de: "goblin", numero_da_instancia: 1 });
const goblin2 = personagem({ id: "g2", nome: "Goblin 2", instancia_de: "goblin", numero_da_instancia: 2 });
const orfa = personagem({ id: "x1", nome: "Lobo 1", instancia_de: "lobo-excluido", numero_da_instancia: 1 });

function montar(lista: Personagem[], naCena: string[] = [], acoes?: Partial<AcoesDeInstancias>) {
  const onColocar = vi.fn();
  const instancias: AcoesDeInstancias = { pendente: false, erro: null, onExcluir: vi.fn(), onPromover: vi.fn(), onLimpar: vi.fn(), ...acoes };
  render(<PersonagensDosJogadores api={{} as ApiClient} mesaId="mesa" personagens={lista} naCena={new Set(naCena)}
    onColocar={onColocar} instancias={instancias} />);
  return { onColocar, instancias };
}

describe("instâncias na lista de NPCs e monstros (instancias-de-personagem)", () => {
  afterEach(cleanup);

  it("agrupa as instâncias sob o modelo, marca as na cena e oferece Excluir, Promover e a limpeza", () => {
    const { onColocar, instancias } = montar([lion, goblin, goblin2, goblin1], ["g1"]);
    const npcs = screen.getByRole("region", { name: "NPCs e monstros" });
    expect(within(npcs).getByRole("button", { name: "Colocar Goblin" })).toBeTruthy();
    const grupo = within(npcs).getByRole("group", { name: "Instâncias de Goblin" });
    const itens = within(grupo).getAllByRole("listitem");
    expect(itens.map((i) => i.textContent)).toEqual([expect.stringContaining("Goblin 1"), expect.stringContaining("Goblin 2")]);
    expect(itens[0]!.textContent).toContain("na cena");
    expect(itens[1]!.textContent).not.toContain("na cena");
    fireEvent.click(within(grupo).getByRole("button", { name: "Excluir Goblin 2" }));
    expect(instancias.onExcluir).toHaveBeenCalledWith(expect.objectContaining({ id: "g2" }));
    fireEvent.click(within(grupo).getByRole("button", { name: "Promover Goblin 1 a ficha" }));
    expect(instancias.onPromover).toHaveBeenCalledWith(expect.objectContaining({ id: "g1" }));
    fireEvent.click(within(grupo).getByRole("button", { name: "Excluir as instâncias fora da cena (1)" }));
    expect(instancias.onLimpar).toHaveBeenCalledWith(expect.objectContaining({ id: "goblin" }));
    fireEvent.click(within(grupo).getByRole("button", { name: "Colocar Goblin 2" }));
    expect(onColocar).toHaveBeenCalledWith(expect.objectContaining({ id: "g2" }), undefined);
    // O jogador Lion não aparece entre os NPCs, e a contagem do título só conta modelos.
    expect(within(npcs).queryByText("Lion")).toBeNull();
    expect(within(npcs).getByRole("heading").textContent).toBe("NPCs e monstros1");
  });

  it("sem instâncias fora da cena não há limpeza; instâncias de modelo excluído ficam num grupo próprio", () => {
    montar([goblin, goblin1, orfa], ["g1", "x1"]);
    const npcs = screen.getByRole("region", { name: "NPCs e monstros" });
    expect(within(npcs).queryByRole("button", { name: /Excluir as instâncias fora da cena/ })).toBeNull();
    expect(within(npcs).getByRole("group", { name: "Instâncias de modelo excluído" }).textContent).toContain("Lobo 1");
  });

  it("instanciasPorModelo separa por modelo e põe as órfãs na chave vazia", () => {
    const grupos = instanciasPorModelo([goblin, goblin1, goblin2, orfa]);
    expect([...grupos.keys()]).toEqual(["goblin", ""]);
    expect(grupos.get("goblin")!.map((p) => p.id)).toEqual(["g1", "g2"]);
  });
});
