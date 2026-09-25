// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EffectsPanel } from "./EffectsPanel";
import type { EfeitoResumo } from "../types";

const efeitos: EfeitoResumo[] = [
  {
    id: "efeito-1",
    nome: "Bênção da armadura",
    descricao: "Reforça a proteção enquanto a armadura estiver vestida.",
    estado: "ativo",
    duracao_rodadas: null,
    ativacao: "enquanto_equipado",
    fontes: [{ tipo: "equipamento", descricao: "Cota de malha", equipamento_id: "item-1" }],
    modificadores: [
      { alvo: "defesa:armadura", valor: 1, contexto: null },
      { alvo: "defesa:armadura", valor: 2, contexto: "contra projéteis" },
    ],
  },
  {
    id: "efeito-2",
    nome: "Veneno lento",
    descricao: "Reduz o vigor enquanto ativo.",
    estado: "suspenso",
    duracao_rodadas: 3,
    ativacao: null,
    fontes: [],
    modificadores: [{ alvo: "atributo:vigor", valor: -1, contexto: null }],
  },
];

describe("EffectsPanel — 6.5 efeitos ativos legíveis e acessíveis", () => {
  afterEach(() => cleanup());

  it("cada efeito é um ícone cujo conteúdo completo aparece por clique", () => {
    render(<EffectsPanel efeitos={efeitos} />);
    fireEvent.click(screen.getByRole("button", { name: "Bênção da armadura" }));
    const details = screen.getByRole("group", { name: "Bênção da armadura" });
    expect(within(details).getByText("Ativo")).toBeTruthy();
    expect(within(details).getByText("Reforça a proteção enquanto a armadura estiver vestida.")).toBeTruthy();
    expect(within(details).getByText(/Cota de malha/)).toBeTruthy();
    expect(within(details).getByText(/Modificador — defesa:armadura/)).toBeTruthy();
    expect(within(details).getByText("Situacionais")).toBeTruthy();
    expect(within(details).getByText(/contra projéteis/)).toBeTruthy();
  });

  it("um efeito suspenso é rotulado como tal e visualmente distinto", () => {
    render(<EffectsPanel efeitos={efeitos} />);
    const trigger = screen.getByRole("button", { name: "Veneno lento (suspenso)" });
    expect(trigger.className).toContain("effect-icon--suspenso");
    fireEvent.click(trigger);
    const details = screen.getByRole("group", { name: "Veneno lento (suspenso)" });
    expect(within(details).getByText("Suspenso")).toBeTruthy();
    expect(within(details).getByText("3 rodadas")).toBeTruthy();
  });

  it("abre por foco de teclado e por toque, não só por hover ou clique", () => {
    render(<EffectsPanel efeitos={efeitos} />);
    const trigger = screen.getByRole("button", { name: "Bênção da armadura" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("group", { name: "Bênção da armadura" })).toBeTruthy();
    fireEvent.blur(trigger);

    fireEvent.touchStart(trigger);
    expect(screen.getByRole("group", { name: "Bênção da armadura" })).toBeTruthy();
  });

  it("mostra uma mensagem quando não há efeitos ativos ou suspensos", () => {
    render(<EffectsPanel efeitos={[]} />);
    expect(screen.getByText("Nenhum efeito ativo ou suspenso no momento.")).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    render(<EffectsPanel efeitos={efeitos} />);
    fireEvent.click(screen.getByRole("button", { name: "Bênção da armadura" }));
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
