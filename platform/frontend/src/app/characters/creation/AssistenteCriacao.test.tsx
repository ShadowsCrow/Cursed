// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../types";
import { AssistenteCriacao } from "./AssistenteCriacao";
import { estadoInicial, type EstadoAssistente, type EtapaId } from "./modelo";
import { chaveRascunho, gravarRascunho, lerRascunho } from "./rascunho";

class Memoria implements Storage {
  dados = new Map<string, string>();
  get length() { return this.dados.size; }
  clear() { this.dados.clear(); }
  getItem(chave: string) { return this.dados.get(chave) ?? null; }
  key(indice: number) { return [...this.dados.keys()][indice] ?? null; }
  removeItem(chave: string) { this.dados.delete(chave); }
  setItem(chave: string, valor: string) { this.dados.set(chave, valor); }
}

const base = (valor: number, atributo: string) => ({ valor, atributo, texto: `${valor} + ${atributo}` });
const habilidade = (nome: string) => ({ nome, descricao: "", tipo: "passiva" });
const CLASSES = [
  { nome: "Mago", cor: "#6b3fa0", pv: base(12, "vigor"), escala_pv: base(2, "vigor"), pp: base(8, "proposito"), escala_pp: base(5, "proposito"),
    habilidades: [habilidade("Mutações")], arquetipos: [{ nome: "Mutante Arcano", conceito: "Magos que sofrem mutações.", habilidades: [habilidade("Primeiras aulas")] }] },
  { nome: "Gatuno", cor: null, pv: base(10, "vigor"), escala_pv: null, pp: base(6, "proposito"), escala_pp: base(3, "proposito"),
    habilidades: [], arquetipos: ["Ladrão", "Assassino", "Psionico"].map((nome) => ({ nome, conceito: "", habilidades: [] })) },
];
const RACAS = [
  { nome: "Humano", tamanho: "Médio", deslocamento: 9, habilidades: [], altura: { minima: 1.55, maxima: 1.9 } },
  { nome: "Elfo", tamanho: "Médio", deslocamento: 9, habilidades: [], altura: { minima: 1.6, maxima: 1.95 } },
  { nome: "Gnomo", tamanho: null, deslocamento: null, habilidades: [habilidade("Engenhoca")] },
  { nome: "Golias", tamanho: "Enorme", deslocamento: 10, habilidades: [], altura: { minima: 3, maxima: 3.8 } },
  { nome: "Titã", tamanho: "Colossal", deslocamento: 12, habilidades: [], altura: { minima: 6, maxima: 9 } },
];
const FAIXAS = [["Minúsculo", 0.1, 0.6], ["Pequeno", 0.6, 1.4], ["Médio", 1.4, 2.1], ["Grande", 2.1, 3], ["Enorme", 3, 5], ["Colossal", 5, null]]
  .map(([tamanho, minima, maxima]) => ({ tamanho, minima, maxima }));
const LISTAS = {
  sexos: ["Masculino", "Feminino", "Outro"],
  alinhamentos: ["Leal | Bom", "Neutro | Bom"],
  pecados: [{ nome: "Orgulho", icone: "🦚", equivalentes: [] }],
  campos_personalidade: [
    { chave: "tracos", rotulo: "Traços", dica: "Ex: Leal", tipo: "tracos", maximo: 6, limite: 24 },
    { chave: "vivo_para", rotulo: "Vivo para", dica: "Ex: proteger os inocentes" },
    { chave: "historia", rotulo: "História", dica: "", longo: true, limite: 4000 },
  ],
  faixas_de_altura: FAIXAS,
};
const valor = (chave: string, rotulo: string, total: number | null, fontes: [string, number][] = [], motivo: string | null = null) => ({
  chave, rotulo, grupo: "recurso", total, calculavel: total !== null, motivo,
  fontes: fontes.map(([descricao, v]) => ({ tipo: "classe", descricao, valor: v })),
});
const PREVIA_MAGO = {
  problemas: [],
  valores: [
    valor("recurso:pv_maximo", "PV máximo", 14, [["Base de PV do Mago", 12], ["Vigor", 2]]),
    valor("recurso:escala_pv", "Escala de PV", 4, [["Base de Escala de PV do Mago", 2], ["Vigor", 2]]),
    valor("recurso:pp_maximo", "PP máximo", 10, [["Base de PP do Mago", 8], ["Propósito", 2]]),
    valor("recurso:escala_pp", "Escala de PP", 7, [["Base de Escala de PP do Mago", 5], ["Propósito", 2]]),
  ],
};

type Resposta = { data?: unknown; error?: unknown };

function criarApi({ previa = async () => ({ data: PREVIA_MAGO }), criar = async () => ({ data: { personagem_id: "novo-1" } }) }:
  { previa?: (corpo: unknown) => Promise<Resposta>; criar?: (corpo: unknown) => Promise<Resposta> } = {}) {
  const GET = vi.fn(async (caminho: string) => {
    if (caminho.endsWith("/catalogos/classes")) return { data: CLASSES };
    if (caminho.endsWith("/catalogos/racas")) return { data: RACAS };
    if (caminho.endsWith("/catalogos/listas-ficha")) return { data: LISTAS };
    throw new Error(`GET não simulado: ${caminho}`);
  });
  const POST = vi.fn(async (caminho: string, opcoes: { body: unknown }) => {
    if (caminho === "/mesas/{mesa_id}/personagens/previa") return previa(opcoes.body);
    if (caminho === "/mesas/{mesa_id}/personagens") return criar(opcoes.body);
    throw new Error(`POST não simulado: ${caminho}`);
  });
  return { api: { GET, POST } as unknown as ApiClient, GET, POST };
}

const onde = { local: "" };
function Local() {
  const location = useLocation();
  useEffect(() => { onde.local = `${location.pathname}${location.search}`; }, [location]);
  return null;
}

function montar({ armazenamento = new Memoria() as Storage | null, url = "/mesas/mesa-1/criar-personagem", api = criarApi().api, onCriado = vi.fn(), onSair = vi.fn() } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/mesas/:mesaId/criar-personagem" element={<><Local /><AssistenteCriacao api={api} mesaId="mesa-1" userId="ana" armazenamento={armazenamento} onCriado={onCriado} onSair={onSair} /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...resultado, armazenamento, onCriado, onSair };
}

/** Rascunho já preenchido até `etapa`, aberto direto nela (`?etapa=`), para testar uma etapa por vez. */
function estadoEm(etapa: EtapaId, mudar: (e: EstadoAssistente) => void = () => {}): EstadoAssistente {
  const estado = estadoInicial();
  estado.etapa = etapa;
  estado.alcancada = etapa;
  estado.ficha.personagem = { nome: "Lia", idade: "112", sexo: "Feminino", raca: "Elfo", altura: "", fora_da_media: "", tamanho: "", classe: "Mago", arquetipo: "Mutante Arcano" };
  estado.ficha.atributos = { Vigor: 2, "Força": 1, Destreza: 2, Carisma: 1, "Manipulação": 1, Proposito: 2, "Percepção": 1, "Inteligência": 3, "Raciocínio": 2 };
  estado.ficha.pericias = { Arcanismo: 3, "Acadêmicos": 2, "Investigação": 2, "Prontidão": 2, Ocultismo: 1, Linguistica: 1, Medicina: 1, Esquiva: 1 };
  mudar(estado);
  return estado;
}

function abrirEm(etapa: EtapaId, opcoes: Parameters<typeof montar>[0] & { mudar?: (e: EstadoAssistente) => void } = {}) {
  const armazenamento = opcoes.armazenamento === undefined ? new Memoria() : opcoes.armazenamento;
  gravarRascunho(armazenamento, "mesa-1", "ana", estadoEm(etapa, opcoes.mudar));
  return montar({ ...opcoes, armazenamento, url: `/mesas/mesa-1/criar-personagem?etapa=${etapa}` });
}

const avancar = () => fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
const titulo = () => screen.getByRole("heading", { level: 2 });
const radioDe = (grupo: string, rotulo: string) =>
  within(screen.getByRole("group", { name: grupo })).getByRole("radio", { name: rotulo });

describe("assistente de criação: estrutura e navegação (4.3)", () => {
  afterEach(() => cleanup());

  it("abre em Conceito com as oito etapas e a posição atual", async () => {
    montar();
    expect(titulo().textContent).toBe("Conceito");
    const etapas = within(screen.getByRole("navigation", { name: "Etapas da criação" })).getAllByRole("button");
    expect(etapas.map((b) => b.textContent?.replace(/\s*\(ainda não disponível\)/, "").replace(/^\d/, ""))).toEqual([
      "Conceito", "Identidade", "Raça", "Classe e arquétipo", "Atributos", "Perícias", "Personalidade", "Conferência"]);
    expect(etapas[0]!.getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("Etapa 1 de 8");
  });

  it("avanço bloqueado com motivo junto ao campo Nome", async () => {
    montar({ url: "/mesas/mesa-1/criar-personagem?etapa=conceito" });
    avancar();
    expect(titulo().textContent).toBe("Identidade");
    avancar();
    expect(titulo().textContent).toBe("Identidade");
    const nome = screen.getByLabelText("Nome (obrigatório)");
    expect(nome.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(nome.getAttribute("aria-describedby")!)?.textContent).toContain("o nome do personagem");
    expect(screen.getByRole("alert").textContent).toContain("Revise");
  });

  it("voltar sem perder dados e foco no título ao trocar de etapa", async () => {
    abrirEm("atributos");
    await screen.findByRole("group", { name: "Força" });
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(titulo().textContent).toBe("Raça");
    expect(document.activeElement).toBe(titulo());
    expect((await screen.findByRole("radio", { name: /^Elfo/ }) as HTMLInputElement).checked).toBe(true);
    avancar();
    expect((screen.getByRole("radio", { name: /^Mago/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /^Mutante Arcano/ }) as HTMLInputElement).checked).toBe(true);
    expect(onde.local).toContain("etapa=classe");
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("Etapa 4 de 8");
  });

  it("etapa futura não é acessível pela lista", async () => {
    abrirEm("raca");
    await screen.findByRole("radio", { name: /^Elfo/ });
    const pericias = within(screen.getByRole("navigation")).getByRole("button", { name: /Perícias/ });
    expect(pericias.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(pericias);
    expect(titulo().textContent).toBe("Raça");
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: /Identidade/ }));
    expect(titulo().textContent).toBe("Identidade");
  });

  it("link direto para uma etapa não alcançada volta para a etapa do rascunho", async () => {
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", estadoEm("raca"));
    montar({ armazenamento, url: "/mesas/mesa-1/criar-personagem?etapa=conferencia" });
    expect(titulo().textContent).toBe("Raça");
    await waitFor(() => expect(onde.local).toContain("etapa=raca"));
  });
});

describe("Identidade (4.4)", () => {
  afterEach(() => cleanup());

  it("idade negativa bloqueia e nenhuma etapa pergunta o nível", async () => {
    abrirEm("identidade", { mudar: (e) => { e.ficha.personagem.idade = ""; } });
    fireEvent.change(screen.getByLabelText("Idade (opcional)"), { target: { value: "-3" } });
    avancar();
    expect(titulo().textContent).toBe("Identidade");
    expect(screen.getByText("Erro: A idade não pode ser negativa.")).toBeTruthy();
    expect(await screen.findByRole("option", { name: "Feminino" })).toBeTruthy();
    for (const etapa of ["conceito", "identidade", "raca", "classe", "atributos", "pericias", "personalidade", "conferencia"] as const) {
      cleanup();
      abrirEm(etapa);
      expect(screen.queryByLabelText(/nível/i)).toBeNull();
    }
  });
});

describe("Raça e Classe (4.5)", () => {
  afterEach(() => cleanup());

  it("Gatuno lista só Ladrão, Assassino e Psionico", async () => {
    abrirEm("classe");
    fireEvent.click(await screen.findByRole("radio", { name: /^Gatuno/ }));
    const grupo = screen.getByRole("group", { name: "Arquétipo de Gatuno" });
    expect(within(grupo).getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["Ladrão", "Assassino", "Psionico"]);
  });

  it("Mago mostra 12, 2, 8 e 5 e as habilidades recebidas", async () => {
    abrirEm("classe");
    const detalhe = await screen.findByRole("region", { name: "O que a classe Mago significa" });
    const valores = within(detalhe).getAllByRole("definition").map((d) => d.textContent);
    expect(valores).toEqual(["12 + Vigor", "2 + Vigor", "8 + Propósito", "5 + Propósito"]);
    expect(within(detalhe).getByText("Mutações")).toBeTruthy();
    expect(screen.getByText(/Habilidades recebidas: Primeiras aulas/)).toBeTruthy();
  });

  it("base ausente no catálogo aparece como não informado", async () => {
    abrirEm("classe");
    fireEvent.click(await screen.findByRole("radio", { name: /^Gatuno/ }));
    const detalhe = screen.getByRole("region", { name: "O que a classe Gatuno significa" });
    expect(within(detalhe).getAllByRole("definition")[1]!.textContent).toBe("não informado");
  });

  it("Humano informa que não há habilidades reais; raça sem dados mostra não informado", async () => {
    abrirEm("raca");
    fireEvent.click(await screen.findByRole("radio", { name: /^Humano/ }));
    expect(screen.getByText("Não há habilidades registradas para esta raça no catálogo.")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /^Gnomo/ }));
    const detalhe = screen.getByRole("region", { name: "O que a raça Gnomo significa" });
    expect(within(detalhe).getAllByRole("definition").map((d) => d.textContent)).toEqual(["não informado", "não informado", "não informado"]);
  });

  it("troca de classe limpa o arquétipo e exige outro", async () => {
    abrirEm("classe", { mudar: (e) => { e.ficha.personagem.classe = "Gatuno"; e.ficha.personagem.arquetipo = "Assassino"; } });
    fireEvent.click(await screen.findByRole("radio", { name: /^Mago/ }));
    expect(screen.getByText(/O arquétipo Assassino não pertence a Mago/).getAttribute("role")).toBe("status");
    expect((screen.getByRole("radio", { name: /^Mutante Arcano/ }) as HTMLInputElement).checked).toBe(false);
    avancar();
    expect(titulo().textContent).toBe("Classe e arquétipo");
    expect(screen.getByText("Erro: Escolha um arquétipo de Mago.")).toBeTruthy();
  });
});

describe("Altura e Tamanho fora da média (8.4)", () => {
  afterEach(() => cleanup());

  const estatura = (nome: RegExp) => within(screen.getByRole("radiogroup", { name: "Estatura" })).queryByRole("radio", { name: nome });

  it("Humano na média: mostra o intervalo, mantém Médio e avança", async () => {
    abrirEm("raca", { mudar: (e) => { e.ficha.personagem.raca = "Humano"; } });
    await screen.findByRole("radiogroup", { name: "Estatura" });
    expect(screen.getByText("Vai de 1,55 m a 1,90 m (Médio).")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Altura em metros (opcional)"), { target: { value: "1,75" } });
    avancar();
    expect(titulo().textContent).toBe("Classe e arquétipo");
  });

  it("altura fora do intervalo da raça bloqueia e sugere fora da média", async () => {
    abrirEm("raca", { mudar: (e) => { e.ficha.personagem.raca = "Humano"; e.ficha.personagem.altura = "2,20"; } });
    await screen.findByRole("radiogroup", { name: "Estatura" });
    avancar();
    expect(titulo().textContent).toBe("Raça");
    const campo = screen.getByLabelText("Altura em metros (opcional)");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/Na média, a altura de um Humano vai de 1,55 m a 1,90 m; para ir além, marque que o personagem é fora da média/)).toBeTruthy();
  });

  it("mais alto: passa a Grande, mostra a faixa e a ficha enviada leva Tamanho e altura", async () => {
    const { api, POST } = criarApi();
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", estadoEm("raca", (e) => { e.ficha.personagem.raca = "Humano"; }));
    montar({ api, armazenamento, url: "/mesas/mesa-1/criar-personagem?etapa=raca" });
    fireEvent.click(await screen.findByRole("radio", { name: /Mais alto que a média/ }));
    expect(screen.getByText("Vai de 2,10 m a 3,00 m (Grande).")).toBeTruthy();
    expect(screen.getByText(/o Tamanho passa a Grande/).textContent).toContain("O Deslocamento continua 9 m");
    expect(within(screen.getByRole("region", { name: "O que a raça Humano significa" })).getByText("Grande (fora da média; Médio na raça)")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Altura em metros (opcional)"), { target: { value: "1,80" } });
    avancar();
    expect(screen.getByText("Erro: A altura de um personagem Grande vai de 2,10 m a 3,00 m.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Altura em metros (opcional)"), { target: { value: "2,30" } });
    avancar();
    expect(titulo().textContent).toBe("Classe e arquétipo");
    for (let i = 0; i < 4; i += 1) avancar();
    expect(titulo().textContent).toBe("Conferência");
    expect(await screen.findByText(/Humano · Grande \(fora da média, mais alto\) · 2,30 m/)).toBeTruthy();
    const corpo = (POST.mock.calls.at(-1)![1] as { body: { ficha: { personagem: Record<string, unknown> } } }).body.ficha.personagem;
    expect(corpo).toMatchObject({ raca: "Humano", tamanho: "Grande", altura: 2.3 });
  });

  it("passo inexistente não é oferecido; Colossal sem teto", async () => {
    abrirEm("raca", { mudar: (e) => { e.ficha.personagem.raca = "Titã"; } });
    await screen.findByRole("radiogroup", { name: "Estatura" });
    expect(estatura(/Mais alto/)).toBeNull();
    expect(estatura(/Mais baixo que a média/)).toBeTruthy();
    expect(screen.getByText("Não há Tamanho acima de Colossal.")).toBeTruthy();
    cleanup();
    abrirEm("raca", { mudar: (e) => { e.ficha.personagem.raca = "Golias"; } });
    fireEvent.click(await screen.findByRole("radio", { name: /Mais alto que a média/ }));
    expect(screen.getByText("Vai acima de 5,00 m (Colossal).")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Altura em metros (opcional)"), { target: { value: "12" } });
    avancar();
    expect(titulo().textContent).toBe("Classe e arquétipo");
  });

  it("trocar para uma raça sem o passo escolhido volta à média", async () => {
    abrirEm("raca", { mudar: (e) => { e.ficha.personagem.raca = "Golias"; } });
    fireEvent.click(await screen.findByRole("radio", { name: /Mais alto que a média/ }));
    fireEvent.click(screen.getByRole("radio", { name: /^Titã/ }));
    expect((estatura(/Na média da raça/) as HTMLInputElement).checked).toBe(true);
    expect(within(screen.getByRole("region", { name: "O que a raça Titã significa" })).getByText("Colossal")).toBeTruthy();
  });
});

describe("Atributos (4.6)", () => {
  afterEach(() => cleanup());

  it("distribuição completa avança", async () => {
    abrirEm("atributos");
    await screen.findByRole("group", { name: "Força" });
    expect(screen.getAllByText(/completo/).length).toBe(3);
    avancar();
    expect(titulo().textContent).toBe("Perícias");
  });

  it("valor excedido é recusado mostrando onde está o 3", async () => {
    abrirEm("atributos");
    fireEvent.click(radioDe("Força", "3"));
    expect((radioDe("Força", "3") as HTMLInputElement).checked).toBe(false);
    expect((radioDe("Força", "1") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("alert").textContent).toBe("O único 3 já foi usado em Inteligência.");
  });

  it("atributo sem valor bloqueia e os contadores dizem o que falta", async () => {
    abrirEm("atributos", { mudar: (e) => { e.ficha.atributos = {}; } });
    expect(screen.getByText("Valor 3: falta 1")).toBeTruthy();
    expect(screen.getByText("Valor 2: faltam 4")).toBeTruthy();
    avancar();
    expect(titulo().textContent).toBe("Atributos");
    expect(screen.getAllByText("Erro: Escolha um valor para este Atributo.").length).toBe(9);
  });

  it("sem a distribuição padrão: 4 em dois Atributos avança; Vigor 6 não; voltar ao padrão bloqueia", async () => {
    abrirEm("atributos");
    fireEvent.click(screen.getByLabelText(/Seguir sem a distribuição padrão/));
    fireEvent.change(screen.getByLabelText("Força"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Destreza"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Vigor"), { target: { value: "6" } });
    avancar();
    expect(titulo().textContent).toBe("Atributos");
    expect(screen.getByText("Erro: O Atributo base vai de 1 a 5.")).toBeTruthy();
    expect(screen.getByLabelText("Vigor").getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(screen.getByLabelText("Vigor"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText(/Seguir sem a distribuição padrão/));
    avancar();
    expect(titulo().textContent).toBe("Atributos");
    expect(screen.getByText(/A distribuição padrão não usa o valor 4|Só .* pode.* ter 4/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Seguir sem a distribuição padrão/));
    avancar();
    expect(titulo().textContent).toBe("Perícias");
  });
});

describe("Perícias (4.7)", () => {
  afterEach(() => cleanup());

  it("agrupadas como na ficha; as demais ficam em 0 e a distribuição fecha", async () => {
    abrirEm("pericias");
    expect(screen.getByRole("group", { name: "Talentos" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Técnicas" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Conhecimentos" })).toBeTruthy();
    expect((radioDe("Briga", "0") as HTMLInputElement).checked).toBe(true);
    avancar();
    expect(titulo().textContent).toBe("Personalidade");
  });

  it("cinco Perícias com 1 não avançam", async () => {
    abrirEm("pericias", { mudar: (e) => { e.ficha.pericias.Briga = 1; } });
    avancar();
    expect(titulo().textContent).toBe("Perícias");
    expect(screen.getAllByText(/Só quatro Perícias podem ter 1/).length).toBeGreaterThan(0);
    fireEvent.click(radioDe("Linguística", "0"));
    avancar();
    expect(titulo().textContent).toBe("Personalidade");
  });

  it("a mesma saída da distribuição padrão", async () => {
    abrirEm("pericias", { mudar: (e) => { e.ficha.pericias = { Arcanismo: 5 }; } });
    avancar();
    expect(titulo().textContent).toBe("Perícias");
    fireEvent.click(screen.getByLabelText(/Seguir sem a distribuição padrão/));
    avancar();
    expect(titulo().textContent).toBe("Personalidade");
  });
});

describe("Personalidade (4.8)", () => {
  afterEach(() => cleanup());

  it("avança sem preencher, mostra a dica sem gravá-la e usa as listas do sistema", async () => {
    const { armazenamento } = abrirEm("personalidade");
    const campo = await screen.findByLabelText("Vivo para");
    expect((campo as HTMLTextAreaElement).value).toBe("");
    expect(campo.getAttribute("placeholder")).toBe("Ex: proteger os inocentes");
    expect(within(screen.getByLabelText("Alinhamento")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Não informado", "Leal | Bom", "Neutro | Bom"]);
    expect(within(screen.getByLabelText("Pecado Capital")).getByRole("option", { name: "🦚 Orgulho" })).toBeTruthy();
    avancar();
    expect(titulo().textContent).toBe("Conferência");
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(lerRascunho(armazenamento, "mesa-1", "ana")?.ficha.personalidade).toEqual({});
  });
});

describe("Conferência (4.9)", () => {
  afterEach(() => cleanup());

  it("mostra PV, PP e Escalas vindos do servidor, com as fontes, e a nota das etapas fora do assistente", async () => {
    const { api, POST } = criarApi();
    abrirEm("conferencia", { api });
    const previa = await screen.findByRole("region", { name: "PV, PP e Escalas calculados pelo servidor" });
    await within(previa).findByText("14");
    expect(within(previa).getAllByRole("definition").map((d) => d.querySelector("strong")?.textContent)).toEqual(["14", "4", "10", "7"]);
    expect(within(previa).getByText("Base de PV do Mago 12 + Vigor 2")).toBeTruthy();
    const corpo = (POST.mock.calls[0]![1] as { body: { ficha: { personagem: unknown; pericias: { valores: Record<string, number> } } } }).body.ficha;
    expect(corpo.personagem).toEqual({ nome: "Lia", idade: 112, sexo: "Feminino", raca: "Elfo", classe: "Mago", arquetipo: "Mutante Arcano" });
    expect(corpo.pericias.valores.Briga).toBe(0);
    expect(screen.getByText(/Vantagens e Desvantagens, equipamento inicial, Acessos/)).toBeTruthy();
  });

  it("sem classe, PV e PP aparecem como não calculáveis com o motivo", async () => {
    const { api } = criarApi({ previa: async () => ({ data: { problemas: [], valores: [
      valor("recurso:pv_maximo", "PV máximo", null, [], "Classe não definida."),
      valor("recurso:pp_maximo", "PP máximo", null, [], "Classe não definida."),
    ] } }) });
    abrirEm("conferencia", { api });
    expect((await screen.findAllByText("Não calculável")).length).toBe(2);
    expect(screen.getAllByText("Classe não definida.").length).toBe(2);
  });

  it("aviso não bloqueia; problema do servidor bloqueia e leva à etapa", async () => {
    const { api } = criarApi({ previa: async () => ({ data: { ...PREVIA_MAGO, problemas: [
      { campo: "personagem.arquetipo", mensagem: 'O arquétipo "Assassino" não pertence à classe Mago.' }] } }) });
    abrirEm("conferencia", { api, mudar: (e) => { e.foraDoPadrao.pericias = true; } });
    expect(await screen.findByText(/Aviso: As Perícias não seguem a distribuição do livro/)).toBeTruthy();
    const resumo = await screen.findByRole("region", { name: "Resumo: Classe e arquétipo" });
    await within(resumo).findByText(/não pertence à classe Mago/);
    expect((screen.getByRole("button", { name: "Criar personagem" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(resumo).getByRole("button", { name: "Editar classe e arquétipo" }));
    expect(titulo().textContent).toBe("Classe e arquétipo");
  });

  it("só com avisos o botão de criar fica disponível", async () => {
    abrirEm("conferencia", { mudar: (e) => { e.foraDoPadrao.pericias = true; e.ficha.personagem.idade = ""; } });
    await screen.findByText("14");
    expect(screen.getByText(/Campos opcionais em branco na Identidade: idade/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Criar personagem" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Criação atômica (4.10)", () => {
  afterEach(() => cleanup());

  it("nada é criado antes de concluir; concluir faz um único POST, remove o rascunho e abre a ficha", async () => {
    const { api, POST } = criarApi();
    const { armazenamento, onCriado } = abrirEm("conferencia", { api });
    await screen.findByText("14");
    expect(POST.mock.calls.filter(([c]) => c === "/mesas/{mesa_id}/personagens")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Criar personagem" }));
    await waitFor(() => expect(onCriado).toHaveBeenCalledWith("novo-1"));
    expect(POST.mock.calls.filter(([c]) => c === "/mesas/{mesa_id}/personagens")).toHaveLength(1);
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
  });

  it("falha mantém a Conferência, o erro e o rascunho; a nova tentativa faz uma só gravação", async () => {
    let tentativas = 0;
    const { api, POST } = criarApi({ criar: async () => {
      tentativas += 1;
      if (tentativas === 1) return { error: { detail: { mensagem: "A ficha tem valores fora das regras.", problemas: [{ campo: "atributos.valores.Vigor", mensagem: "O Atributo base vai de 1 a 5." }] } } };
      return { data: { personagem_id: "novo-1" } };
    } });
    const { armazenamento, onCriado } = abrirEm("conferencia", { api });
    await screen.findByText("14");
    fireEvent.click(screen.getByRole("button", { name: "Criar personagem" }));
    expect(await screen.findByText(/Erro: A ficha tem valores fora das regras/)).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Resumo: Atributos" })).getByText(/vai de 1 a 5/)).toBeTruthy();
    expect(titulo().textContent).toBe("Conferência");
    expect(lerRascunho(armazenamento, "mesa-1", "ana")?.ficha.personagem.nome).toBe("Lia");
    expect(onCriado).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Editar atributos" }));
    avancar(); avancar(); avancar();
    await screen.findByText("14");
    fireEvent.click(screen.getByRole("button", { name: "Criar personagem" }));
    fireEvent.click(screen.getByRole("button", { name: /Criar personagem|Criando/ }));
    await waitFor(() => expect(onCriado).toHaveBeenCalledTimes(1));
    expect(POST.mock.calls.filter(([c]) => c === "/mesas/{mesa_id}/personagens")).toHaveLength(2);
  });

  it("falha de rede mostra o erro e mantém as escolhas", async () => {
    const { api } = criarApi({ criar: async () => { throw new TypeError("Failed to fetch"); } });
    abrirEm("conferencia", { api });
    await screen.findByText("14");
    fireEvent.click(screen.getByRole("button", { name: "Criar personagem" }));
    expect(await screen.findByText(/Verifique a conexão/)).toBeTruthy();
    expect(screen.getByText("Lia")).toBeTruthy();
  });
});

describe("Rascunho no assistente (4.2)", () => {
  afterEach(() => cleanup());

  it("oferece continuar o rascunho e volta à etapa com tudo preenchido", async () => {
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", estadoEm("atributos"));
    montar({ armazenamento });
    expect(screen.getByText(/Lia, parado na etapa 5 de 8 \(Atributos\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar rascunho" }));
    expect(titulo().textContent).toBe("Atributos");
    expect((radioDe("Inteligência", "3") as HTMLInputElement).checked).toBe(true);
  });

  it("os Traços voltam com o rascunho e seguem, com a História, para a ficha criada", async () => {
    const { api, POST } = criarApi();
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", estadoEm("personalidade", (e) => {
      e.ficha.personalidade = { tracos: ["Leal", "Reservado"], historia: "Veio de terras antigas." };
    }));
    expect(lerRascunho(armazenamento, "mesa-1", "ana")?.ficha.personalidade.tracos).toEqual(["Leal", "Reservado"]);
    montar({ api, armazenamento, url: "/mesas/mesa-1/criar-personagem?etapa=personalidade" });
    expect(await screen.findByRole("button", { name: "Remover Reservado" })).toBeTruthy();
    avancar();
    expect(await screen.findByText("Leal · Reservado")).toBeTruthy();
    await screen.findByText("14");
    fireEvent.click(screen.getByRole("button", { name: "Criar personagem" }));
    await waitFor(() => expect(POST.mock.calls.some(([c]) => c === "/mesas/{mesa_id}/personagens")).toBe(true));
    const [, { body }] = POST.mock.calls.find(([c]) => c === "/mesas/{mesa_id}/personagens")! as [string, { body: { ficha: { personalidade: unknown } } }];
    expect(body.ficha.personalidade).toEqual({ tracos: ["Leal", "Reservado"], historia: "Veio de terras antigas." });
  });

  it("descartar abre vazio em Conceito e apaga o rascunho", async () => {
    const armazenamento = new Memoria();
    gravarRascunho(armazenamento, "mesa-1", "ana", estadoEm("atributos"));
    montar({ armazenamento });
    fireEvent.click(screen.getByRole("button", { name: "Descartar e começar de novo" }));
    expect(titulo().textContent).toBe("Conceito");
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toBeNull();
  });

  it("grava o progresso e sair guarda o rascunho", async () => {
    const armazenamento = new Memoria();
    const { onSair } = montar({ armazenamento });
    avancar();
    fireEvent.change(screen.getByLabelText("Nome (obrigatório)"), { target: { value: "Bram" } });
    fireEvent.click(screen.getByRole("button", { name: "Sair e guardar rascunho" }));
    expect(onSair).toHaveBeenCalled();
    expect(lerRascunho(armazenamento, "mesa-1", "ana")).toMatchObject({ etapa: "identidade", ficha: { personagem: { nome: "Bram" } } });
    expect(armazenamento.getItem(chaveRascunho("mesa-2", "ana"))).toBeNull();
  });

  it("armazenamento bloqueado: funciona até a Conferência sem oferecer retomada", async () => {
    montar({ armazenamento: null });
    expect(screen.queryByText("Continuar rascunho")).toBeNull();
    avancar();
    fireEvent.change(screen.getByLabelText("Nome (obrigatório)"), { target: { value: "Bram" } });
    avancar();
    expect(titulo().textContent).toBe("Raça");
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });
});

describe("acessibilidade do assistente (4.12)", () => {
  afterEach(() => cleanup());

  it("nenhuma violação detectável pelo axe em cada etapa, inclusive com erros e sem a distribuição padrão", async () => {
    for (const etapa of ["conceito", "identidade", "raca", "classe", "atributos", "pericias", "personalidade", "conferencia"] as const) {
      abrirEm(etapa, { mudar: (e) => { if (etapa === "identidade") e.ficha.personagem.nome = ""; } });
      if (etapa === "conferencia") await screen.findByText("14");
      else if (etapa !== "conceito") await waitFor(() => expect(screen.queryByText("Carregando os dados do sistema…")).toBeNull());
      if (etapa === "identidade") avancar();
      const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
      expect(resultado.violations.map((v) => `${etapa}: ${v.id}`)).toEqual([]);
      cleanup();
    }
    abrirEm("atributos", { mudar: (e) => { e.foraDoPadrao.atributos = true; e.ficha.atributos.Vigor = 6; } });
    avancar();
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations.map((v) => v.id)).toEqual([]);
  });

  it("contadores em região polite e erro de campo associado ao campo", async () => {
    abrirEm("atributos", { mudar: (e) => { e.ficha.atributos = {}; } });
    const contadores = screen.getByText("Valor 3: falta 1").closest(".contadores")!;
    expect(contadores.getAttribute("aria-live")).toBe("polite");
    expect(contadores.getAttribute("role")).toBe("status");
    avancar();
    const grupo = screen.getByRole("group", { name: "Vigor" });
    expect(document.getElementById(grupo.getAttribute("aria-describedby")!)?.textContent).toContain("Escolha um valor");
  });

  it("avançar leva o foco ao título da próxima etapa (percurso por teclado no e2e)", async () => {
    abrirEm("atributos", { mudar: (e) => { e.ficha.atributos = { ...e.ficha.atributos, Vigor: undefined }; } });
    const vigor1 = radioDe("Vigor", "1");
    vigor1.focus();
    fireEvent.click(radioDe("Vigor", "2"));
    expect((radioDe("Vigor", "2") as HTMLInputElement).checked).toBe(true);
    const botao = screen.getByRole("button", { name: "Avançar" });
    botao.focus();
    expect(document.activeElement).toBe(botao);
    fireEvent.click(botao);
    expect(titulo().textContent).toBe("Perícias");
    expect(document.activeElement).toBe(titulo());
  });
});
