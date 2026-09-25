// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ContentCard, EffectIcon, EquipmentSlot, Portrait, ResourceBar } from "./Display";

describe("Portrait", () => {
  afterEach(() => cleanup());

  it("sem imagem, mostra iniciais como retrato ilustrativo acessível", () => {
    render(<Portrait name="Ari Teste" />);
    const portrait = screen.getByRole("img", { name: "Retrato ilustrativo de Ari Teste" });
    expect(portrait.textContent).toBe("AT");
  });

  it("com imagem, mostra a imagem real com texto alternativo do personagem", () => {
    render(<Portrait name="Mira Voss" imageUrl="https://exemplo.test/mira.png" />);
    const image = screen.getByRole("img", { name: "Retrato de Mira Voss" }) as HTMLImageElement;
    expect(image.tagName).toBe("IMG");
    expect(image.src).toBe("https://exemplo.test/mira.png");
  });
});

describe("ResourceBar", () => {
  afterEach(() => cleanup());

  it("estado cheio: valor igual ao máximo", () => {
    render(<ResourceBar label="Pontos de Vida" current={24} max={24} kind="life" />);
    const bar = screen.getByRole("progressbar", { name: "Pontos de Vida" });
    expect(bar.getAttribute("aria-valuenow")).toBe("24");
    expect(bar.getAttribute("aria-valuetext")).toBe("24 de 24");
  });

  it("estado parcial: rótulo textual acessível reflete o valor real", () => {
    render(<ResourceBar label="Pontos de Poder" current={7} max={12} kind="power" />);
    const bar = screen.getByRole("progressbar", { name: "Pontos de Poder" });
    expect(bar.getAttribute("aria-valuetext")).toBe("7 de 12");
  });

  it("estado vazio: current zero é sinalizado como esgotado", () => {
    render(<ResourceBar label="Foco" current={0} max={4} kind="focus" />);
    const bar = screen.getByRole("progressbar", { name: "Foco" });
    expect(bar.getAttribute("aria-valuetext")).toBe("0 de 4, esgotado");
    expect(screen.getByText("Esgotado")).toBeTruthy();
  });

  it("estado acima do máximo: mostra o valor real e sinaliza o excesso", () => {
    render(<ResourceBar label="Pontos de Vida" current={30} max={24} kind="life" />);
    const bar = screen.getByRole("progressbar", { name: "Pontos de Vida" });
    expect(bar.getAttribute("aria-valuenow")).toBe("30");
    expect(bar.getAttribute("aria-valuetext")).toBe("30 de 24, acima do máximo");
    expect(screen.getByText("Acima do máximo")).toBeTruthy();
  });
});

describe("EffectIcon", () => {
  afterEach(() => cleanup());

  it("mostra o conteúdo completo (nome, descrição, origem, duração, encerramento) por hover", () => {
    render(
      <EffectIcon
        name="Véu Protetor"
        symbol="✧"
        description="Reduz o dano recebido pelo alvo."
        origin="Mira Voss"
        duration="3 rodadas"
        endCondition="Termina ao final do combate"
      />,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Véu Protetor" }));
    const detail = screen.getByRole("group", { name: "Véu Protetor" });
    expect(within(detail).getByText("Reduz o dano recebido pelo alvo.")).toBeTruthy();
    expect(within(detail).getByText("Mira Voss")).toBeTruthy();
    expect(within(detail).getByText("3 rodadas")).toBeTruthy();
    expect(within(detail).getByText("Termina ao final do combate")).toBeTruthy();
  });

  it("mostra o conteúdo completo por foco de teclado, sem depender apenas de hover", () => {
    render(<EffectIcon name="Vigília" symbol="◈" tone="gold" description="Atenção constante a perigos." />);
    fireEvent.focus(screen.getByRole("button", { name: "Vigília" }));
    expect(screen.getByRole("group", { name: "Vigília" })).toBeTruthy();
  });

  it("mostra e esconde o conteúdo completo por clique", () => {
    render(<EffectIcon name="Vigília" symbol="◈" tone="gold" description="Atenção constante a perigos." />);
    const trigger = screen.getByRole("button", { name: "Vigília" });
    fireEvent.click(trigger);
    expect(screen.getByRole("group", { name: "Vigília" })).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("mostra o conteúdo completo por toque", () => {
    render(<EffectIcon name="Vigília" symbol="◈" tone="gold" description="Atenção constante a perigos." />);
    fireEvent.touchStart(screen.getByRole("button", { name: "Vigília" }));
    expect(screen.getByRole("group", { name: "Vigília" })).toBeTruthy();
  });

  it("campos opcionais ausentes não são inventados", () => {
    render(<EffectIcon name="Passo Leve" symbol="◇" description="Movimento silencioso." />);
    fireEvent.click(screen.getByRole("button", { name: "Passo Leve" }));
    const detail = screen.getByRole("group", { name: "Passo Leve" });
    expect(within(detail).queryByText("Origem")).toBeNull();
    expect(within(detail).queryByText("Duração")).toBeNull();
    expect(within(detail).queryByText("Encerramento")).toBeNull();
  });
});

describe("EquipmentSlot", () => {
  afterEach(() => cleanup());

  it("estado ocupado mostra o item e o detalhe", () => {
    render(<EquipmentSlot category="ARMA" state="ocupado" item="Lâmina da Vigília" detail="Efeito aplicado" icon="sword" />);
    expect(screen.getByText("Lâmina da Vigília")).toBeTruthy();
    expect(screen.getByText("Efeito aplicado")).toBeTruthy();
  });

  it("estado vazio convida a equipar, sem inventar um item", () => {
    const onAction = () => {};
    render(<EquipmentSlot category="ARMA" state="vazio" icon="sword" onAction={onAction} />);
    expect(screen.getByText("Vazio")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Equipar" })).toBeTruthy();
  });

  it("estado desabilitado não oferece ação e comunica o motivo", () => {
    render(<EquipmentSlot category="ARMA" state="desabilitado" item="Lâmina amaldiçoada" icon="sword" disabledReason="Bloqueada pelo Narrador" />);
    const slot = screen.getByText("Lâmina amaldiçoada").closest("article") as HTMLElement;
    expect(slot.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Bloqueada pelo Narrador")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ContentCard (carta base)", () => {
  afterEach(() => cleanup());

  it("habilidade mostra custo de aprendizado e custo de uso como campos separados", () => {
    render(
      <ContentCard
        kind="HABILIDADE"
        type="habilidade"
        title="Vigília Inabalável"
        description="Atenção constante aos perigos da estrada."
        meta="Disponível para aprendizado"
        emblem="✧"
        costs={[{ label: "Custo de aprendizado", value: "2 pontos de habilidade" }, { label: "Custo de uso", value: "1 Ponto de Poder" }]}
      />,
    );
    expect(screen.getByText("Custo de aprendizado")).toBeTruthy();
    expect(screen.getByText("2 pontos de habilidade")).toBeTruthy();
    expect(screen.getByText("Custo de uso")).toBeTruthy();
    expect(screen.getByText("1 Ponto de Poder")).toBeTruthy();
  });

  it("magia, item e efeito aceitam tipos e custos próprios, sem presumir valores ausentes", () => {
    render(
      <ContentCard kind="MAGIA" type="magia" title="Véu Protetor" description="Um manto de energia protege um aliado." meta="Aprendida" emblem="✦" />,
    );
    expect(screen.queryByRole("term")).toBeNull();

    cleanup();
    render(
      <ContentCard
        kind="ITEM"
        type="item"
        title="Lâmina da Vigília"
        description="Uma arma marcada por histórias de guardiões."
        meta="Possuída · equipada"
        emblem="⚔"
        costs={[{ label: "Custo de uso", value: "Nenhum" }]}
      />,
    );
    expect(screen.getByText("Custo de uso")).toBeTruthy();

    cleanup();
    render(
      <ContentCard kind="EFEITO" type="efeito" title="Vigília" description="Atenção constante." meta="Ativo" emblem="◈" />,
    );
    expect(screen.getByText("Vigília")).toBeTruthy();
  });
});
