// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IMAGEM_PADRAO, paragrafosDaHistoria, type ModeloDoResumo } from "./modelo";
import { ResumoVisual } from "./ResumoVisual";

const MODELO: ModeloDoResumo = {
  nome: "Thalen Aerendir",
  classe: "Mago",
  raca: "Elfo",
  nivel: 3,
  imagem: { src: "/imagens/thalen.webp", origem: "ilustracao" },
  recursos: {
    pv: { valor: 22, atual: 14 },
    pp: { valor: null, motivo: "Classe não definida." },
    defesa: { valor: 11 },
    armadura: { valor: 12 },
    rdb: { valor: 1 },
  },
  atributos: [{ titulo: "Físicos", itens: [{ nome: "Força", valor: 4, icone: "forca" }, { nome: "Destreza", valor: null }] }],
  pericias: [{ nome: "Arcanismo", valor: 3 }, { nome: "Esquiva", valor: 2 }],
  equipamentos: { visiveis: [{ nome: "Poção de Cura", quantidade: 3, tipo: "outro" }], restantes: 2 },
  habilidades: { visiveis: [{ nome: "Projétil Arcano", tipo: "magia" }], restantes: 0 },
  historia: "Primeiro parágrafo.\n\nSegundo parágrafo,\ncom quebra simples.",
};

function quadro(nome: string) {
  return screen.getByRole("region", { name: nome });
}

describe("ResumoVisual", () => {
  afterEach(() => cleanup());

  it("identidade: nome como título da página e campos vazios com travessão", () => {
    render(<ResumoVisual modelo={MODELO} />);
    expect(screen.getByRole("heading", { level: 1, name: "Thalen Aerendir" })).toBeTruthy();
    const identidade = quadro("Thalen Aerendir");
    expect(within(identidade).getByText("Mago")).toBeTruthy();
    expect(within(identidade).getByText("Elfo")).toBeTruthy();
    expect(within(identidade).getByText("3")).toBeTruthy();
    expect(within(identidade).getByLabelText("Não informado")).toBeTruthy();
  });

  it("recursos: atual e máximo lidos juntos; sem valor calculado, travessão e o motivo do servidor", () => {
    render(<ResumoVisual modelo={MODELO} />);
    const recursos = quadro("Recursos");
    expect(within(recursos).getByText("Pontos de Vida")).toBeTruthy();
    expect(within(recursos).getByText("14 de 22")).toBeTruthy();
    expect(within(recursos).getByText("Pontos de Propósito")).toBeTruthy();
    expect(within(recursos).getByText("Classe não definida.")).toBeTruthy();
    expect(within(recursos).getByText("Defesa (Esquiva)")).toBeTruthy();
    expect(within(recursos).getByText("11")).toBeTruthy();
    expect(within(recursos).getByText("Defesa (Armadura)")).toBeTruthy();
  });

  it("atributos e perícias mostram só os valores recebidos, sem calcular nada", () => {
    render(<ResumoVisual modelo={MODELO} />);
    const atributos = quadro("Atributos");
    expect(within(atributos).getByRole("heading", { name: "Físicos" })).toBeTruthy();
    expect(within(atributos).getByText("Força").closest("li")!.textContent).toContain("4");
    expect(within(atributos).getByText("Destreza").closest("li")!.textContent).toContain("Sem valor calculado");
    expect(within(quadro("Perícias")).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Arcanismo3", "Esquiva2"]);
  });

  it("listas limitadas indicam quantos ficaram de fora; quantidade só acima de 1", () => {
    render(<ResumoVisual modelo={MODELO} />);
    const equipamentos = quadro("Equipamentos");
    expect(within(equipamentos).getByText("(×3)")).toBeTruthy();
    expect(within(equipamentos).getByText("e mais 2")).toBeTruthy();
    expect(within(quadro("Habilidades")).queryByText(/e mais/)).toBeNull();
  });

  it("estados vazios de perícias, equipamentos e habilidades", () => {
    render(<ResumoVisual modelo={{ ...MODELO, pericias: [], equipamentos: { visiveis: [], restantes: 0 }, habilidades: { visiveis: [], restantes: 0 } }} />);
    expect(within(quadro("Perícias")).getByText("Nenhuma perícia tem valor acima de 0.")).toBeTruthy();
    expect(within(quadro("Equipamentos")).getByText("Nada equipado no momento.")).toBeTruthy();
    expect(within(quadro("Habilidades")).getByText("Nenhuma habilidade ou magia aprendida ainda.")).toBeTruthy();
  });

  it("História: parágrafos preservados e capitular só no primeiro", () => {
    const { container } = render(<ResumoVisual modelo={MODELO} />);
    const paragrafos = container.querySelectorAll(".resumo-historia__texto p");
    expect(Array.from(paragrafos, (p) => p.textContent)).toEqual(["Primeiro parágrafo.", "Segundo parágrafo,\ncom quebra simples."]);
    expect(container.querySelectorAll(".resumo-historia__primeiro")).toHaveLength(1);
    expect(paragrafos[0]!.classList.contains("resumo-historia__primeiro")).toBe(true);
  });

  it("sem História: convite para quem edita, aviso neutro para quem só lê", () => {
    const onAbrir = vi.fn();
    render(<ResumoVisual modelo={{ ...MODELO, historia: "  " }} podeEditar onAbrir={onAbrir} />);
    fireEvent.click(screen.getByRole("button", { name: "Escrever a história" }));
    expect(onAbrir).toHaveBeenCalledWith("personalidade");
    cleanup();
    render(<ResumoVisual modelo={{ ...MODELO, historia: undefined }} />);
    expect(screen.getByText("História não escrita.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Escrever a história" })).toBeNull();
  });

  it("atalhos de cada quadro levam à aba correspondente; sem callback, não aparecem", () => {
    const onAbrir = vi.fn();
    render(<ResumoVisual modelo={MODELO} onAbrir={onAbrir} />);
    const esperado = {
      "Abrir Informações básicas": "informacoes", "Abrir Status": "status", "Abrir Atributos": "atributos",
      "Abrir Perícias": "pericias", "Abrir Equipamentos": "equipamentos", "Abrir Habilidades e cartas": "cartas",
      "Abrir Personalidade": "personalidade",
    };
    for (const [rotulo, secao] of Object.entries(esperado)) {
      fireEvent.click(screen.getByRole("button", { name: rotulo }));
      expect(onAbrir).toHaveBeenLastCalledWith(secao);
    }
    cleanup();
    render(<ResumoVisual modelo={MODELO} />);
    expect(screen.queryAllByRole("button", { name: /^Abrir / })).toHaveLength(0);
  });

  it("imagem central com o nome no texto alternativo; se falhar, cai na arte padrão", () => {
    render(<ResumoVisual modelo={MODELO} acaoImagem={<button type="button">Trocar ilustração</button>} />);
    const imagem = screen.getByRole("img", { name: "Ilustração de Thalen Aerendir" });
    expect(imagem.getAttribute("src")).toBe("/imagens/thalen.webp");
    expect(screen.getByRole("button", { name: "Trocar ilustração" })).toBeTruthy();
    fireEvent.error(imagem);
    const padrao = screen.getByRole("img", { name: "Thalen Aerendir, ainda sem imagem" });
    expect(padrao.getAttribute("src")).toBe(IMAGEM_PADRAO);
  });

  it("cena pintada é decorativa; se faltar, a imagem central faz o fundo", () => {
    const { container } = render(<ResumoVisual modelo={MODELO} arte={{ cena: "/arte/resumo-cena.webp" }} />);
    const cena = container.querySelector(".resumo-ficha__cena")!;
    expect(cena.getAttribute("aria-hidden")).toBe("true");
    fireEvent.error(cena.querySelector("img")!);
    expect(cena.classList.contains("resumo-ficha__cena--reserva")).toBe(true);
    expect(cena.querySelector("img")!.getAttribute("src")).toBe("/imagens/thalen.webp");
  });

  it("pinturas opcionais: somem se faltarem e abrem espaço na folha quando carregam", () => {
    const arte = { primeiroPlano: "/arte/pp.webp", naturezaMorta: "/arte/nm.webp", bussola: "/arte/b.webp" };
    const { container } = render(<ResumoVisual modelo={MODELO} arte={arte} />);
    const folha = container.querySelector(".resumo-ficha")!;
    const pintura = (classe: string) => container.querySelector(`.resumo-pintura--${classe}`);
    expect(container.querySelector(".resumo-bussola-svg")).not.toBeNull();
    fireEvent.load(pintura("natureza-morta")!);
    fireEvent.load(pintura("bussola")!);
    expect(folha.classList.contains("resumo-ficha--natureza-morta")).toBe(true);
    expect(folha.classList.contains("resumo-ficha--bussola")).toBe(true);
    expect(container.querySelector(".resumo-bussola-svg")).toBeNull();
    fireEvent.error(pintura("primeiro-plano")!);
    fireEvent.error(pintura("bussola")!);
    expect(pintura("primeiro-plano")).toBeNull();
    expect(pintura("bussola")).toBeNull();
    expect(folha.classList.contains("resumo-ficha--bussola")).toBe(false);
    expect(container.querySelector(".resumo-bussola-svg")).not.toBeNull();
    for (const img of Array.from(container.querySelectorAll(".resumo-pintura"))) {
      expect([img.getAttribute("alt"), img.getAttribute("aria-hidden")]).toEqual(["", "true"]);
    }
  });

  it("ornamentos não aparecem para leitores de tela", () => {
    const { container } = render(<ResumoVisual modelo={MODELO} />);
    for (const svg of Array.from(container.querySelectorAll("svg"))) {
      expect(svg.closest("[aria-hidden='true']")).not.toBeNull();
    }
  });
});

describe("paragrafosDaHistoria", () => {
  it("separa por linha em branco e descarta vazios", () => {
    expect(paragrafosDaHistoria(undefined)).toEqual([]);
    expect(paragrafosDaHistoria("\n\n  \n")).toEqual([]);
    expect(paragrafosDaHistoria("a\nb\n\n\n c ")).toEqual(["a\nb", "c"]);
  });
});
