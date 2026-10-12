// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "../App";
import { criarApiDeDemonstracao, estadoDeDemonstracao, type EstadoDemonstracao } from "./apiDemonstracao";
import { ladoInicial } from "./dados";

function Local() {
  const local = useLocation();
  return <output data-testid="local">{local.pathname}</output>;
}

function montar(rota: string, ajustar?: (estado: EstadoDemonstracao) => void) {
  const estado = estadoDeDemonstracao();
  ajustar?.(estado);
  const { api } = criarApiDeDemonstracao(estado);
  const sair = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[rota]}>
        <AppRoutes api={api} userId={estado.usuarioId} onSignOut={sair} />
        <Local />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { estado, sair };
}

const local = () => screen.getByTestId("local").textContent;

describe("navegação inicial", () => {
  beforeEach(() => { try { window.localStorage.clear(); } catch { /* sem armazenamento */ } });
  afterEach(() => cleanup());

  describe("casco e perfil (4.3, 5.2)", () => {
    it("barra superior com as quatro seções na ordem e a atual anunciada", async () => {
      montar("/");
      const nav = await screen.findByRole("navigation", { name: "Seções da plataforma" });
      const links = within(nav).getAllByRole("link");
      expect(links.map((link) => link.textContent)).toEqual(["Início", "Campanhas", "Personagens", "Biblioteca"]);
      expect(within(nav).getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBe("page");
      expect(screen.getByRole("heading", { level: 1, name: "Histórias vivem aqui" })).toBeTruthy();
    });

    it("sem apelido confirmado, vai ao primeiro acesso com o nome sugerido e depois ao Início", async () => {
      montar("/campanhas", (estado) => { estado.perfil.apelido = null; estado.perfil.apelido_sugerido = "Ana Souza"; });
      expect(await screen.findByRole("heading", { name: "Como o seu grupo vai chamar você?" })).toBeTruthy();
      expect(local()).toBe("/boas-vindas");
      const campo = screen.getByRole("textbox", { name: /Apelido/ }) as HTMLInputElement;
      expect(campo.value).toBe("Ana Souza");
      fireEvent.change(campo, { target: { value: "R" } });
      expect((screen.getByRole("button", { name: "Confirmar e entrar" }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.change(campo, { target: { value: "Ana Souza" } });
      fireEvent.click(screen.getByRole("button", { name: "Confirmar e entrar" }));
      expect(await screen.findByRole("heading", { level: 1, name: "Histórias vivem aqui" })).toBeTruthy();
      expect(local()).toBe("/");
    });

    it("menu do avatar: Meu perfil e Sair", async () => {
      const { sair } = montar("/");
      fireEvent.click(await screen.findByRole("button", { name: "Conta de Corvo" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Meu perfil" }));
      expect(await screen.findByRole("heading", { name: "Meu perfil" })).toBeTruthy();
      expect(screen.getByText("voce@exemplo.com")).toBeTruthy();
      expect(screen.getByText("E-mail e senha")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Conta de Corvo" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Sair" }));
      expect(sair).toHaveBeenCalled();
    });

    it("menu recolhido (celular): botão com aria-expanded controla a lista de seções e fecha ao escolher", async () => {
      montar("/");
      const botao = await screen.findByRole("button", { name: /Seções/ });
      const nav = screen.getByRole("navigation", { name: "Seções da plataforma" });
      expect(botao.getAttribute("aria-controls")).toBe(nav.id);
      expect(botao.getAttribute("aria-expanded")).toBe("false");
      expect(nav.getAttribute("data-aberta")).toBe("false");
      fireEvent.click(botao);
      expect(botao.getAttribute("aria-expanded")).toBe("true");
      expect(nav.getAttribute("data-aberta")).toBe("true");
      fireEvent.click(within(nav).getByRole("link", { name: "Biblioteca" }));
      expect(await screen.findByRole("heading", { level: 1, name: "Visão geral do Cursed" })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Seções/ }).getAttribute("aria-expanded")).toBe("false");
    });

    it("recarregar com uma seleção mantém a seleção (endereço próprio)", async () => {
      montar("/campanhas/ceynar");
      expect(await screen.findByRole("heading", { level: 1, name: "A Queda de Ceynar" })).toBeTruthy();
      expect(local()).toBe("/campanhas/ceynar");
    });

    it("foto do perfil: enviar mostra a foto no perfil e na barra; remover volta às iniciais", async () => {
      const { estado } = montar("/perfil");
      await screen.findByRole("heading", { name: "Meu perfil" });
      const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], "foto.png", { type: "image/png" });
      fireEvent.change(screen.getByTestId("upload-foto"), { target: { files: [png] } });
      expect(await screen.findByRole("button", { name: "Trocar foto" })).toBeTruthy();
      await waitFor(() => expect(screen.getByRole("img", { name: "Foto de Corvo" }).querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/png;base64,/));
      expect(document.querySelector(".barra-superior .avatar img")?.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
      expect(estado.perfil.tem_foto).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));
      expect(await screen.findByRole("button", { name: "Enviar foto" })).toBeTruthy();
      await waitFor(() => expect(screen.getByRole("img", { name: "Foto de Corvo" }).textContent).toBe("CO"));
    });

    it("foto grande demais é recusada antes de enviar", async () => {
      const { estado } = montar("/perfil");
      await screen.findByRole("heading", { name: "Meu perfil" });
      const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.png", { type: "image/png" });
      fireEvent.change(screen.getByTestId("upload-foto"), { target: { files: [grande] } });
      expect((await screen.findByRole("alert")).textContent).toContain("5 MB");
      expect(estado.perfil.tem_foto).toBe(false);
    });

    it("endereço de mesa antigo continua fora do casco", async () => {
      montar("/mesas/vigrad/personagens/lia");
      await waitFor(() => expect(local()).toBe("/mesas/vigrad/personagens/lia"));
      expect(screen.queryByRole("navigation", { name: "Seções da plataforma" })).toBeNull();
    });
  });

  describe("Início (6.1)", () => {
    it("Criar campanha pede o nome e abre a campanha em Narrando", async () => {
      const { estado } = montar("/");
      fireEvent.click(await screen.findByRole("button", { name: /Criar campanha/ }));
      const dialogo = screen.getByRole("dialog", { name: "Criar campanha" });
      fireEvent.change(within(dialogo).getByRole("textbox", { name: "Nome da campanha" }), { target: { value: "Cinzas do Norte" } });
      fireEvent.click(within(dialogo).getByRole("button", { name: "Criar campanha" }));
      expect(await screen.findByRole("heading", { level: 1, name: "Cinzas do Norte" })).toBeTruthy();
      expect(local()).toBe(`/campanhas/${estado.mesas[3]?.id}`);
      expect(screen.getByRole("button", { name: /Narrando/ }).getAttribute("aria-pressed")).toBe("true");
    });

    it("Gestão de mesas leva a Campanhas", async () => {
      montar("/");
      expect((await screen.findByRole("link", { name: "Gestão de mesas" })).getAttribute("href")).toBe("/campanhas");
    });
  });

  describe("Campanhas (6.2, 6.3)", () => {
    it("lado inicial: selecionada, último usado, ou o lado que tem campanhas", () => {
      const mesas = estadoDeDemonstracao().mesas;
      const so = (papel: "narrador" | "jogador") => mesas.filter((m) => m.papel === papel);
      expect(ladoInicial(so("jogador"), undefined, null)).toBe("jogando");
      expect(ladoInicial(mesas, undefined, null)).toBe("narrando");
      expect(ladoInicial(mesas, undefined, "jogando")).toBe("jogando");
      expect(ladoInicial(mesas, mesas[2], "narrando")).toBe("jogando");
    });

    it("pessoa que só joga abre em Jogando, na primeira campanha", async () => {
      montar("/campanhas", (estado) => { estado.mesas = estado.mesas.filter((m) => m.papel === "jogador"); });
      expect(await screen.findByRole("heading", { level: 1, name: "Ordem: Fragmentos" })).toBeTruthy();
      expect(local()).toBe("/campanhas/ordem");
      expect(screen.getByRole("button", { name: /Jogando/ }).getAttribute("aria-pressed")).toBe("true");
    });

    it("trocar de lado filtra a lista e seleciona a primeira do lado", async () => {
      montar("/campanhas/vigrad");
      const lista = await screen.findByRole("list", { name: "Campanhas que você narra" });
      expect(within(lista).getAllByRole("link").map((l) => l.textContent)).toEqual(["Sombras de VigradCursed", "A Queda de CeynarCursed"]);
      expect(within(lista).getByRole("link", { name: /Sombras de Vigrad/ }).getAttribute("aria-current")).toBe("page");
      fireEvent.click(screen.getByRole("button", { name: /Jogando/ }));
      const jogadas = await screen.findByRole("list", { name: "Campanhas que você joga" });
      expect(within(jogadas).getAllByRole("link")).toHaveLength(1);
      expect(local()).toBe("/campanhas/ordem");
    });

    it("entrar com convite: inválido explica; válido abre a campanha em Jogando", async () => {
      montar("/campanhas/ordem");
      fireEvent.click(await screen.findByRole("button", { name: /Entrar com convite/ }));
      const dialogo = screen.getByRole("dialog", { name: "Entrar com convite" });
      const campo = within(dialogo).getByRole("textbox", { name: "Código do convite" });
      fireEvent.change(campo, { target: { value: "vencido" } });
      fireEvent.click(within(dialogo).getByRole("button", { name: "Entrar na campanha" }));
      expect((await within(dialogo).findByRole("alert")).textContent).toContain("Convite indisponível");
      fireEvent.change(campo, { target: { value: "CONVITE-VALIDO" } });
      fireEvent.click(within(dialogo).getByRole("button", { name: "Entrar na campanha" }));
      expect(await screen.findByRole("heading", { level: 1, name: "Mesa do Convite" })).toBeTruthy();
      expect(local()).toBe("/campanhas/sala-convite");
    });

    it("campanha mostra capa padrão, sistema, sinopse, personagens, participantes e Entrar na mesa", async () => {
      montar("/campanhas/vigrad");
      expect(await screen.findByText(/Em Vigrad, a noite nunca é silenciosa/)).toBeTruthy();
      expect(screen.getByText("Cursed · Você narra esta campanha")).toBeTruthy();
      expect(screen.getByRole("link", { name: /Entrar na mesa/ }).getAttribute("href")).toBe("/mesas/vigrad");
      expect(await screen.findByText("Rainha Velada")).toBeTruthy();
      expect(screen.getByText("NPC · oculto")).toBeTruthy();
      const participantes = await screen.findByRole("heading", { name: "Participantes" });
      expect(within(participantes.parentElement as HTMLElement).getByText("Bruno")).toBeTruthy();
      expect(document.querySelector('img[src$="capa-campanha-padrao-1536.webp"]')).toBeTruthy();
    });

    it("jogador só vê os próprios personagens (nada de NPC oculto)", async () => {
      montar("/campanhas/ordem");
      expect(await screen.findByText("Caelren")).toBeTruthy();
      expect(screen.queryByText("Rainha Velada")).toBeNull();
      expect(screen.queryByRole("button", { name: /Editar campanha/ })).toBeNull();
    });

    it("jogador sem personagem vê Criar personagem quando a mesa permite; senão, a explicação", async () => {
      const nova = { id: "nova", nome: "Nova", papel: "jogador" as const, sistema: "cursed" as const, sinopse: null, capa_objeto: null };
      montar("/campanhas/nova", (estado) => { estado.mesas.push({ ...nova, permitir_criacao_propria: true }); });
      expect((await screen.findByRole("link", { name: "Criar personagem" })).getAttribute("href")).toBe("/mesas/nova/criar-personagem");
      cleanup();
      montar("/campanhas/nova", (estado) => { estado.mesas.push({ ...nova, permitir_criacao_propria: false }); });
      expect(await screen.findByText("Nesta campanha, quem narra cria os personagens.")).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Criar personagem" })).toBeNull();
    });

    it("Narrador edita a sinopse e gera convite", async () => {
      montar("/campanhas/ceynar");
      expect(await screen.findByText(/Sem sinopse ainda/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Editar campanha/ }));
      const dialogo = screen.getByRole("dialog", { name: "Editar campanha" });
      fireEvent.change(within(dialogo).getByRole("textbox", { name: /Sinopse/ }), { target: { value: "O reino caiu numa noite." } });
      fireEvent.click(within(dialogo).getByRole("button", { name: "Gravar" }));
      expect(await screen.findByText("O reino caiu numa noite.")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Convidar jogadores/ }));
      expect(await screen.findByText("VIGRAD-7Q2K")).toBeTruthy();
    });
  });

  describe("Personagens (7.1–7.3)", () => {
    it("abre Meus personagens no primeiro e mostra o Resumo da ficha com os valores do servidor", async () => {
      montar("/personagens", (estado) => {
        const caelren = estado.personagens.find((p) => p.id === "caelren");
        if (caelren) caelren.atributos = { "Força": 7, "Inteligência": 3, "Proposito": 2 };
      });
      const resumo = await screen.findByRole("article", { name: "Resumo de Caelren" });
      expect(local()).toBe("/personagens/meus/ordem/caelren");
      expect(within(resumo).getByRole("heading", { level: 1, name: "Caelren" })).toBeTruthy();
      const atributos = within(resumo).getByRole("region", { name: "Atributos" });
      // Valor fora do padrão vindo do servidor aparece como está: nada é recalculado no cliente.
      expect(within(atributos).getByText("Força").closest("li")?.textContent).toContain("7");
      expect(within(atributos).getByText("Propósito").closest("li")?.textContent).toContain("2");
      const recursos = within(resumo).getByRole("region", { name: "Recursos" });
      expect(within(recursos).getByText("14")).toBeTruthy();
      expect(screen.getByRole("link", { name: /Abrir ficha/ }).getAttribute("href")).toBe("/mesas/ordem/personagens/caelren");
      // Só leitura: sem envio de ilustração nem convite para escrever a História.
      expect(screen.queryByRole("button", { name: /ilustração/i })).toBeNull();
      expect(screen.getByText("Campanha:").textContent).toContain("Ordem: Fragmentos");
    });

    it("o atalho de um quadro do Resumo abre a ficha completa naquela seção", async () => {
      montar("/personagens/meus/ordem/caelren");
      fireEvent.click(await screen.findByRole("button", { name: "Abrir Atributos" }));
      await waitFor(() => expect(local()).toBe("/mesas/ordem/personagens/caelren"));
    });

    it("coleções: NPCs e Monstros só de campanhas narradas; vazio explica", async () => {
      montar("/personagens/npcs");
      expect(await screen.findByRole("article", { name: "Resumo de Velho Barqueiro" })).toBeTruthy();
      const lista = screen.getByRole("list", { name: "NPCs" });
      expect(within(lista).getAllByRole("link").map((l) => l.querySelector("strong")?.textContent)).toEqual(["Velho Barqueiro", "Rainha Velada"]);
      cleanup();
      montar("/personagens/npcs", (estado) => { estado.mesas = estado.mesas.filter((m) => m.papel === "jogador"); });
      expect(await screen.findByText(/NPCs aparecem aqui quando você narra/)).toBeTruthy();
    });

    it("copiar personagem próprio para uma campanha narrada cria um NPC lá", async () => {
      const { estado } = montar("/personagens/meus/ordem/caelren");
      fireEvent.click(await screen.findByRole("button", { name: /Copiar para campanha/ }));
      const dialogo = screen.getByRole("dialog", { name: "Copiar para campanha" });
      fireEvent.click(await within(dialogo).findByRole("radio", { name: "Sombras de Vigrad" }));
      fireEvent.click(within(dialogo).getByRole("button", { name: "Copiar" }));
      expect(await within(dialogo).findByText(/agora é NPC em/)).toBeTruthy();
      expect(within(dialogo).getByRole("link", { name: "Abrir a campanha" }).getAttribute("href")).toBe("/campanhas/vigrad");
      // O resultado recebe o foco, dentro do diálogo: quem usa teclado não se perde e o Esc continua fechando.
      await waitFor(() => expect(document.activeElement).toBe(within(dialogo).getByRole("link", { name: "Abrir a campanha" })));
      const copia = estado.personagens.find((p) => p.mesa_id === "vigrad" && p.nome === "Caelren");
      expect(copia && [copia.tipo, copia.visibilidade, copia.proprietario_id]).toEqual(["npc", "narrador", null]);
      expect(estado.personagens.find((p) => p.id === "caelren")?.mesa_id).toBe("ordem");
    });

    it("sem campanha narrada, a cópia explica o que falta", async () => {
      montar("/personagens/meus/ordem/caelren", (estado) => { estado.mesas = estado.mesas.filter((m) => m.papel === "jogador"); });
      fireEvent.click(await screen.findByRole("button", { name: /Copiar para campanha/ }));
      expect(await screen.findByText(/você precisa narrar uma campanha/)).toBeTruthy();
    });
  });

  describe("Biblioteca (8.1, 8.2)", () => {
    it("abre na Visão geral com links para as regras", async () => {
      montar("/biblioteca");
      expect(await screen.findByRole("heading", { level: 1, name: "Visão geral do Cursed" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Visão geral" }).getAttribute("aria-current")).toBe("page");
      expect(screen.getAllByRole("link", { name: "Carga" }).some((l) => l.getAttribute("href") === "/biblioteca/regras/carga")).toBe(true);
    });

    it("documento de regra com índice e tabelas de verdade", async () => {
      montar("/biblioteca/regras/carga");
      expect(await screen.findByRole("heading", { level: 1, name: "Carga e Transporte" })).toBeTruthy();
      expect(screen.getByRole("navigation", { name: "Seções do documento" })).toBeTruthy();
      const tabelas = screen.getAllByRole("region", { name: "Tabela" });
      expect(tabelas.length).toBeGreaterThan(0);
      expect(tabelas[0]?.querySelector("table")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Carga" }).getAttribute("aria-current")).toBe("page");
    });
  });
});
