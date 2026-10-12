// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { NarratorShell } from "./NarratorShell";
import { PlayerShell } from "./PlayerShell";
import { CHAVE_BARRA_RECOLHIDA } from "./usePreferenciaLocal";
import { WorkspaceChrome } from "./WorkspaceChrome";

const mesa = { id: "mesa-a", nome: "O Véu de Aram", papel: "narrador" as const, sistema: "cursed" as const };

const api = {
  GET: vi.fn().mockResolvedValue({ data: [], error: undefined }),
} as unknown as ApiClient;

function withProviders(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

describe("shells de Narrador e jogador", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => cleanup());

  it("a mesa oferece o caminho de volta para a campanha em Campanhas", () => {
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("link", { name: "Campanhas" }).getAttribute("href")).toBe("/campanhas/mesa-a");
    expect(screen.getByRole("link", { name: "Voltar às campanhas" }).getAttribute("href")).toBe("/campanhas/mesa-a");
  });

  it("o shell do Narrador tem uma estrutura própria: fila de pendências e atalhos exclusivos na lateral", () => {
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("complementary", { name: "Fila do Narrador" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ferramentas do Narrador" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Seu personagem" })).toBeNull();
  });

  it("o shell do jogador tem uma estrutura própria: cartão do personagem na lateral, sem a fila do Narrador", () => {
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("region", { name: "Seu personagem" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Fila do Narrador" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Ferramentas do Narrador" })).toBeNull();
  });

  it("a navegação de cada shell reflete o papel, no desktop e na navegação móvel", () => {
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    const desktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    for (const nav of [desktop, mobile]) {
      expect(within(nav).getByRole("button", { name: "Registro" })).toBeTruthy();
      expect(within(nav).getByRole("button", { name: "Personagens" })).toBeTruthy();
    }

    cleanup();
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    const playerDesktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const playerMobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    for (const nav of [playerDesktop, playerMobile]) {
      expect(within(nav).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
      expect(within(nav).getByRole("button", { name: "Registro" })).toBeTruthy();
    }
  });

  it("a navegação móvel é utilizável: tocar em um item aciona a navegação", () => {
    const onNavigate = vi.fn();
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={onNavigate} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    fireEvent.click(within(mobile).getByRole("button", { name: "Registro" }));
    expect(onNavigate).toHaveBeenCalledWith("activity");
  });
});

function chrome(props: Partial<Parameters<typeof WorkspaceChrome>[0]> = {}) {
  return withProviders(
    <WorkspaceChrome role="jogador" mesaNome="O Véu de Aram" mesaId="mesa-a" view="activity" onNavigate={vi.fn()} onSignOut={vi.fn()}
      roleLabel="Você é jogador" headerTitle="Registro" headerEyebrow="REGISTRO"
      sidebarExtra={<section aria-label="Seu personagem">cartão</section>} {...props}>
      <p>conteúdo</p>
    </WorkspaceChrome>,
  );
}

describe("barra lateral retrátil da mesa", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("recolhe e expande pelo botão, com o estado anunciado e o foco no botão", () => {
    render(chrome());
    const botao = screen.getByRole("button", { name: "Recolher barra lateral" });
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(botao.getAttribute("aria-controls")).toBe("barra-lateral-mesa");
    expect(screen.getByText("CAMPANHA ATUAL")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Seu personagem" })).toBeTruthy();
    botao.focus();
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(botao.getAttribute("aria-label")).toBe("Expandir barra lateral");
    expect(document.activeElement).toBe(botao);
    expect(document.querySelector(".workspace-app--barra-recolhida")).toBeTruthy();
    expect((screen.getByText("CAMPANHA ATUAL").closest(".sidebar__campaign") as HTMLElement).hidden).toBe(true);
    expect(screen.queryByRole("region", { name: "Seu personagem" })).toBeNull();
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-label")).toBe("Recolher barra lateral");
    expect((screen.getByText("CAMPANHA ATUAL").closest(".sidebar__campaign") as HTMLElement).hidden).toBe(false);
  });

  it("vale para o Narrador: expandir devolve os atalhos do Narrador", () => {
    window.localStorage.setItem(CHAVE_BARRA_RECOLHIDA, "1");
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.queryByRole("region", { name: "Ferramentas do Narrador" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expandir barra lateral" }));
    expect(screen.getByRole("region", { name: "Ferramentas do Narrador" })).toBeTruthy();
    expect(window.localStorage.getItem(CHAVE_BARRA_RECOLHIDA)).toBe("0");
  });

  it("recolhida, mantém nomes, dicas, página atual, pendências e a volta a Campanhas", () => {
    window.localStorage.setItem(CHAVE_BARRA_RECOLHIDA, "1");
    const onNavigate = vi.fn();
    render(chrome({ onNavigate, badges: { cards: 2 } }));
    const nav = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const registro = within(nav).getByRole("button", { name: "Registro" });
    expect(registro.getAttribute("aria-current")).toBe("page");
    expect(registro.getAttribute("data-dica")).toBe("Registro");
    expect(within(nav).getByRole("button", { name: /^Biblioteca\s*, 2 pendente\(s\)$/ })).toBeTruthy();
    fireEvent.click(within(nav).getByRole("button", { name: "Sala" }));
    expect(onNavigate).toHaveBeenCalledWith("room");
    const campanhas = screen.getByRole("link", { name: "Campanhas" });
    expect(campanhas.getAttribute("href")).toBe("/campanhas/mesa-a");
    expect(campanhas.getAttribute("data-dica")).toBe("Campanhas");
  });

  it("a escolha vale para as outras mesas e papéis neste navegador", () => {
    render(chrome());
    fireEvent.click(screen.getByRole("button", { name: "Recolher barra lateral" }));
    cleanup();
    render(withProviders(<NarratorShell mesa={{ ...mesa, id: "mesa-b" }} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("button", { name: "Expandir barra lateral" })).toBeTruthy();
  });
});

describe("Sala como palco", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("na Sala, sem cabeçalho ilustrado nem rodapé; a barra superior continua", () => {
    render(withProviders(<NarratorShell mesa={mesa} view="room" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(document.querySelector(".workspace-app--palco")).toBeTruthy();
    expect(document.querySelector(".cabecalho-ilustrado, .hero-panel--tema")).toBeNull();
    expect(screen.queryByRole("contentinfo")).toBeNull();
    expect(screen.queryByText("Cena compartilhada")).toBeNull();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar às campanhas" })).toBeTruthy();
  });

  it("nas outras seções, o cabeçalho e o rodapé continuam", () => {
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(document.querySelector(".workspace-app--palco")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: /Seu personagem em foco/ })).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });
});
