// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../types";
import { ActiveStateStrip } from "./ActiveStateStrip";
import type { ConsequenciaResumo, PreviaDesgaste, TrilhaDesgaste } from "./sheetApi";

const FAIXAS = {
  estavel: { id: "estavel", nome: "Estável", efeito: "Sem penalidade.", min: 0, max: 5 },
  cansado: { id: "cansado", nome: "Cansado", efeito: "−1 em testes físicos.", min: 6, max: 8 },
  exausto: { id: "exausto", nome: "Exausto", efeito: "−2 em testes físicos e −1 em Defesas.", min: 9, max: 11 },
  colapsoFisico: { id: "colapso_fisico", nome: "Colapso Físico", efeito: "Inconsciente e incapaz de realizar ações.", min: 15, max: 15 },
  controlado: { id: "controlado", nome: "Controlado", efeito: "Sem penalidade.", min: 0, max: 4 },
  abalado: { id: "abalado", nome: "Abalado", efeito: "−2 em testes mentais e sociais e −1 em testes físicos.", min: 7, max: 8 },
  aBeira: { id: "a_beira", nome: "À Beira", efeito: "−3 em testes mentais e sociais.", min: 9, max: 9 },
  colapsoMental: { id: "colapso_mental", nome: "Colapso Mental", efeito: "Manifestação de colapso.", min: 10, max: 10 },
};

function trilhas(exaustao = 8, estresse = 0): TrilhaDesgaste[] {
  const faixaE = exaustao >= 15 ? FAIXAS.colapsoFisico : exaustao >= 9 ? FAIXAS.exausto : exaustao >= 6 ? FAIXAS.cansado : FAIXAS.estavel;
  const faixaS = estresse >= 10 ? FAIXAS.colapsoMental : estresse >= 9 ? FAIXAS.aBeira : estresse >= 7 ? FAIXAS.abalado : FAIXAS.controlado;
  return [
    { recurso: "exaustao", atual: exaustao, maximo: 15, registrado: true, faixa: faixaE, proxima_faixa: null, pontos_ate_proxima: null },
    { recurso: "estresse", atual: estresse, maximo: 10, registrado: true, faixa: faixaS, proxima_faixa: null, pontos_ate_proxima: null },
  ];
}

function previa(overrides: Partial<PreviaDesgaste> = {}): PreviaDesgaste {
  return {
    trilha: "exaustao", antes: 8, depois: 9, maximo: 15, delta_solicitado: 1, delta_aplicado: 1,
    faixa_antes: FAIXAS.cansado, faixa_depois: FAIXAS.exausto, mudou_faixa: true,
    colapso_fisico: false, colapso_mental: false, excedente_fisico: false, ...overrides,
  };
}

const TRAUMA: ConsequenciaResumo = {
  id: "trauma-1", categoria: "trauma", nome: "Medo do Abismo", descricao: "Pavor de lugares sem fundo.",
  origem: { tipo: "mestre", nome: "Poço de Varn" }, gatilho: "Beiradas", efeito_atual: "Paralisa.", intensidade: 1,
  tratamento: { estado: "ativo", progresso: 0, objetivo: null, regra: "Três cenas com apoio." }, historico: [],
};

type Resposta = { data?: unknown; error?: unknown };

function createApi(rotas: Record<string, (body: unknown) => Resposta> = {}) {
  const POST = vi.fn(async (path: string, options: { body: unknown }) => {
    const rota = rotas[path];
    if (rota) return rota(options.body);
    if (path.endsWith("/desgaste/previa")) return { data: previa() };
    if (path.endsWith("/desgaste/esforco/previa")) return { data: previa({ tipo_esforco: "fisico", bonus_teste: 1, bonus_movimento: 0 }) };
    return { data: { versao: 2, trilhas: trilhas(), consequencias: [], previa: null } };
  });
  return { api: { POST } as unknown as ApiClient, POST };
}

function renderStrip({ api, narrador = true, esforco = true, desgaste = trilhas(), consequencias = [] as ConsequenciaResumo[] }: {
  api: ApiClient; narrador?: boolean; esforco?: boolean; desgaste?: TrilhaDesgaste[]; consequencias?: ConsequenciaResumo[];
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ActiveStateStrip desgaste={desgaste} efeitos={[]} consequencias={consequencias}
        controles={{ api, mesaId: "mesa", personagemId: "lia", versao: 1, consequencias, narrador, esforco }} />
    </QueryClientProvider>,
  );
}

function chamadas(POST: ReturnType<typeof vi.fn>, sufixo: string) {
  return POST.mock.calls.filter(([path]) => String(path).endsWith(sufixo)).map(([, options]) => (options as { body: unknown }).body);
}

afterEach(cleanup);

describe("alteração do Narrador (5.1)", () => {
  it("abre com a prévia e confirma em um clique depois de informar a origem", async () => {
    const { api, POST } = createApi();
    renderStrip({ api });
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Exaustão" }));
    const dialogo = await screen.findByRole("dialog");
    const status = await within(dialogo).findByRole("status");
    expect(status.textContent).toContain("Exaustão 8 → 9");
    expect(status.textContent).toContain("Faixa: Cansado → Exausto");
    expect(status.textContent).toContain("Passa a valer: −2 em testes físicos e −1 em Defesas.");
    const confirmar = within(dialogo).getByRole("button", { name: "Confirmar alteração" });
    expect((confirmar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialogo).getByLabelText("Origem"), { target: { value: "Marcha forçada" } });
    fireEvent.click(confirmar);
    await waitFor(() => expect(chamadas(POST, "/desgaste/alteracoes")).toHaveLength(1));
    expect(chamadas(POST, "/desgaste/alteracoes")[0]).toMatchObject({
      trilha: "exaustao", delta: 1, origem: { tipo: "mestre", nome: "Marcha forçada" }, versao_esperada: 1,
      colapso_mental: null, consequencia_excedente: null,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("anuncia quando a faixa não muda", async () => {
    const { api } = createApi({
      "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/previa": () => ({ data: previa({
        trilha: "estresse", antes: 8, depois: 7, maximo: 10, delta_solicitado: -1, delta_aplicado: -1,
        faixa_antes: FAIXAS.abalado, faixa_depois: FAIXAS.abalado, mudou_faixa: false,
      }) }),
    });
    renderStrip({ api, desgaste: trilhas(0, 8) });
    fireEvent.click(screen.getByRole("button", { name: "Reduzir Estresse" }));
    const status = await within(await screen.findByRole("dialog")).findByRole("status");
    expect(status.textContent).toContain("Permanece Abalado.");
    expect(status.textContent).not.toContain("Passa a valer");
  });

  it("jogador não vê a alteração direta, só o Esforço", () => {
    const { api } = createApi();
    renderStrip({ api, narrador: false });
    expect(screen.queryByRole("button", { name: "Aumentar Exaustão" })).toBeNull();
    expect(screen.getByRole("button", { name: "Esforço" })).toBeTruthy();
  });

  it("quem só lê a ficha não recebe controles", () => {
    const { api } = createApi();
    renderStrip({ api, narrador: false, esforco: false });
    expect(screen.queryByRole("button", { name: "Esforço" })).toBeNull();
  });
});

describe("Esforço voluntário (5.2)", () => {
  it("distribui os pontos e registra o custo depois da ação", async () => {
    const { api, POST } = createApi({
      "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/esforco/previa": (body) => {
        const { pontos, bonus_movimento } = body as { pontos: number; bonus_movimento: number };
        return { data: previa({ antes: 2, depois: 2 + pontos, delta_solicitado: pontos, delta_aplicado: pontos,
          faixa_antes: FAIXAS.estavel, faixa_depois: FAIXAS.estavel, mudou_faixa: false,
          tipo_esforco: "fisico", bonus_teste: pontos - bonus_movimento, bonus_movimento }) };
      },
    });
    renderStrip({ api, narrador: false, desgaste: trilhas(2, 0) });
    fireEvent.click(screen.getByRole("button", { name: "Esforço" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Pontos assumidos"), { target: { value: "3" } });
    fireEvent.change(within(dialogo).getByLabelText("Pontos convertidos em Movimento (+1 m cada)"), { target: { value: "1" } });
    fireEvent.change(within(dialogo).getByLabelText("Ação ou teste"), { target: { value: "Saltar o fosso" } });
    await within(dialogo).findByText("Bônus nesta ação: +2 no teste, +1 m de Movimento.");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar custo" }));
    await waitFor(() => expect(chamadas(POST, "/desgaste/esforco")).toHaveLength(1));
    expect(chamadas(POST, "/desgaste/esforco")[0]).toMatchObject({
      tipo: "fisico", pontos: 3, bonus_movimento: 1, acao: "Saltar o fosso", colapso_mental: null,
    });
  });

  it("mostra o bloqueio À Beira e não deixa registrar", async () => {
    const { api } = createApi({
      "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/esforco/previa": () => ({
        error: { detail: "Um personagem À Beira ou em Colapso Mental não pode usar Esforço mental." },
      }),
    });
    renderStrip({ api, narrador: false, desgaste: trilhas(0, 9) });
    fireEvent.click(screen.getByRole("button", { name: "Esforço" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByLabelText("Mental ou social (custa Estresse)"));
    fireEvent.change(within(dialogo).getByLabelText("Ação ou teste"), { target: { value: "Convencer o guarda" } });
    expect((await within(dialogo).findByRole("alert")).textContent).toContain("À Beira");
    expect((within(dialogo).getByRole("button", { name: "Registrar custo" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("anuncia o último esforço antes do Colapso Físico", async () => {
    const { api } = createApi({
      "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/esforco/previa": () => ({ data: previa({
        antes: 14, depois: 15, faixa_antes: { id: "no_limite", nome: "No Limite", efeito: "−3 em testes físicos.", min: 12, max: 14 },
        faixa_depois: FAIXAS.colapsoFisico, colapso_fisico: true, tipo_esforco: "fisico", bonus_teste: 1, bonus_movimento: 0,
      }) }),
    });
    renderStrip({ api, narrador: false, desgaste: trilhas(14, 0) });
    fireEvent.click(screen.getByRole("button", { name: "Esforço" }));
    const status = await within(await screen.findByRole("dialog")).findByRole("status");
    expect(status.textContent).toContain("Passa a valer: Inconsciente e incapaz de realizar ações.");
    expect(status.textContent).toContain("Colapso Físico: por si só, não cria Ferimento Grave, Sequela nem morte.");
  });
});

describe("Colapso Mental (5.3)", () => {
  const colapso = { "/mesas/{mesa_id}/personagens/{personagem_id}/desgaste/previa": () => ({ data: previa({
    trilha: "estresse", antes: 9, depois: 10, maximo: 10, faixa_antes: FAIXAS.aBeira, faixa_depois: FAIXAS.colapsoMental,
    colapso_mental: true,
  }) }) };

  async function abrirColapso(consequencias: ConsequenciaResumo[] = []) {
    const { api, POST } = createApi(colapso);
    renderStrip({ api, desgaste: trilhas(0, 9), consequencias });
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Estresse" }));
    const dialogo = await screen.findByRole("dialog");
    await within(dialogo).findByText("Manifestação do Colapso Mental");
    fireEvent.change(within(dialogo).getByLabelText("Origem"), { target: { value: "Grito do Vazio" } });
    return { dialogo, POST };
  }

  it("cria um Trauma novo com os campos mínimos", async () => {
    const { dialogo, POST } = await abrirColapso();
    const confirmar = within(dialogo).getByRole("button", { name: "Confirmar alteração" }) as HTMLButtonElement;
    fireEvent.click(within(dialogo).getByLabelText("Fugir"));
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Medo do Abismo" } });
    fireEvent.change(within(dialogo).getByLabelText("Descrição"), { target: { value: "Pavor de lugares sem fundo." } });
    fireEvent.change(within(dialogo).getByLabelText("Manifestação"), { target: { value: "Paralisa diante de precipícios." } });
    fireEvent.change(within(dialogo).getByLabelText("Tratamento ou encerramento"), { target: { value: "Três cenas com apoio." } });
    expect(confirmar.disabled).toBe(true); // Trauma exige gatilho
    fireEvent.change(within(dialogo).getByLabelText("Gatilho"), { target: { value: "Beiradas" } });
    fireEvent.click(confirmar);
    await waitFor(() => expect(chamadas(POST, "/desgaste/alteracoes")).toHaveLength(1));
    expect(chamadas(POST, "/desgaste/alteracoes")[0]).toMatchObject({
      trilha: "estresse", delta: 1,
      colapso_mental: { manifestacao: "Fugir", trauma_id: null, trauma: { categoria: "trauma", nome: "Medo do Abismo", gatilho: "Beiradas" } },
    });
  });

  it("intensifica um Trauma equivalente já registrado", async () => {
    const { dialogo, POST } = await abrirColapso([TRAUMA]);
    fireEvent.click(within(dialogo).getByLabelText("Dissociar"));
    fireEvent.click(within(dialogo).getByLabelText("Intensificar Trauma existente"));
    expect((within(dialogo).getByLabelText("Trauma equivalente") as HTMLSelectElement).value).toBe("trauma-1");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar alteração" }));
    await waitFor(() => expect(chamadas(POST, "/desgaste/alteracoes")).toHaveLength(1));
    expect(chamadas(POST, "/desgaste/alteracoes")[0]).toMatchObject({
      colapso_mental: { manifestacao: "Dissociar", trauma_id: "trauma-1", trauma: null },
    });
  });

  it("cancelar antes de confirmar não grava nada", async () => {
    const { dialogo, POST } = await abrirColapso();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(chamadas(POST, "/desgaste/alteracoes")).toHaveLength(0);
  });

  it("o Narrador encerra o Colapso Mental", async () => {
    const { api, POST } = createApi();
    renderStrip({ api, desgaste: trilhas(0, 10) });
    fireEvent.click(screen.getByRole("button", { name: "Encerrar Colapso Mental" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("O Estresse volta a 8. O Trauma criado ou intensificado permanece.")).toBeTruthy();
    fireEvent.click(within(dialogo).getByLabelText("Auxílio pertinente"));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Encerrar Colapso Mental" }));
    await waitFor(() => expect(chamadas(POST, "/colapso-mental/encerrar")).toEqual([{ motivo: "Auxílio pertinente", versao_esperada: 1 }]));
  });

  it("sem colapso, o botão de encerrar não aparece", () => {
    const { api } = createApi();
    renderStrip({ api, desgaste: trilhas(0, 9) });
    expect(screen.queryByRole("button", { name: "Encerrar Colapso Mental" })).toBeNull();
  });
});

describe("faixa de estado ativo", () => {
  it("mostra as consequências em aberto com a categoria em texto", () => {
    const { api } = createApi();
    renderStrip({ api, consequencias: [
      { ...TRAUMA, intensidade: 2 },
      { ...TRAUMA, id: "t2", nome: "Encerrado", tratamento: { ...TRAUMA.tratamento, estado: "encerrado" } },
    ] });
    expect(screen.getByText("Trauma: Medo do Abismo (intensidade 2)")).toBeTruthy();
    expect(screen.queryByText(/Encerrado/)).toBeNull();
  });
});
