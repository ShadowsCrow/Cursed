// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OfertaItem } from "../characters/sheet/sheetApi";
import { ItemOffers, type ItemOffersProps } from "./ItemOffers";

const oferta = (extra: Partial<OfertaItem>): OfertaItem => ({
  id: "o1", estado: "pendente", item_id: "i1", item_nome: "Espada", subtipo: "uma_mao", largura: 1, altura: 3,
  de_personagem_id: "lia", de_nome: "Lia", para_personagem_id: "teo", para_nome: "Teo", criado_em: "2026-09-27T10:00:00Z", ...extra,
});

const RECEBIDA = oferta({});
const SEM_DIMENSAO = oferta({ id: "o2", item_nome: "Mapa velho", largura: null, altura: null });
const ENVIADA = oferta({ id: "o3", item_nome: "Tocha", de_personagem_id: "teo", de_nome: "Teo", para_personagem_id: "lia", para_nome: "Lia" });
const ALHEIA = oferta({ id: "o4", de_personagem_id: "lia", para_personagem_id: "bram" });

function montar(extra: Partial<ItemOffersProps> = {}) {
  const handlers = { onAceitar: vi.fn(), onEscolherLugar: vi.fn(), onRecusar: vi.fn(), onCancelar: vi.fn() };
  const resultado = render(<ItemOffers personagemId="teo" ofertas={[RECEBIDA, SEM_DIMENSAO, ENVIADA, ALHEIA]} editavel ocupado={false}
    escolhendoLugar={null} {...handlers} {...extra} />);
  return { ...handlers, ...resultado };
}

afterEach(() => cleanup());

describe("ItemOffers — 6.3 trocas entre personagens", () => {
  it("separa ofertas recebidas e enviadas do personagem e ignora as de outros", () => {
    montar();
    const recebidas = screen.getByRole("list", { name: "Ofertas recebidas" });
    expect(within(recebidas).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Lia oferece Espada \(1 x 3\)\./), expect.stringMatching(/^Lia oferece Mapa velho \(sem dimensão\)\./),
    ]);
    const enviadas = within(screen.getByRole("list", { name: "Ofertas enviadas" })).getAllByRole("listitem");
    expect(enviadas.map((li) => li.textContent)).toEqual([expect.stringMatching(/^Tocha oferecido a Lia; aguardando resposta\./)]);
  });

  it("aciona aceitar, escolher lugar, recusar e cancelar", () => {
    const { onAceitar, onEscolherLugar, onRecusar, onCancelar } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Aceitar Espada" }));
    fireEvent.click(screen.getByRole("button", { name: "Escolher lugar para Espada" }));
    fireEvent.click(screen.getByRole("button", { name: "Recusar Espada" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar oferta de Tocha" }));
    expect(onAceitar).toHaveBeenCalledWith(RECEBIDA);
    expect(onEscolherLugar).toHaveBeenCalledWith(RECEBIDA);
    expect(onRecusar).toHaveBeenCalledWith(RECEBIDA);
    expect(onCancelar).toHaveBeenCalledWith(ENVIADA);
    expect(screen.queryByRole("button", { name: "Escolher lugar para Mapa velho" })).toBeNull();
  });

  it("enquanto escolhe o lugar, oferece voltar atrás", () => {
    const { onEscolherLugar } = montar({ escolhendoLugar: "o1" });
    fireEvent.click(screen.getByRole("button", { name: "Não escolher lugar" }));
    expect(onEscolherLugar).toHaveBeenCalledWith(null);
  });

  it("sem permissão só mostra; sem ofertas do personagem não aparece", () => {
    montar({ editavel: false });
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    const { container } = montar({ ofertas: [ALHEIA] });
    expect(container.innerHTML).toBe("");
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar();
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
