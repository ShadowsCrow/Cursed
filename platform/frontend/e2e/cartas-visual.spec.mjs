/* global document, window */
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

/*
 * Aba Cartas (redesenhar-aba-cartas, tarefas 4.7, 5.3, 6.1, 6.3 e 7.2): as medidas da carta na referência do
 * usuário a 1448 px, as colunas por largura, nada rola na horizontal de 320 a 1920 px, a folha fica completa
 * sem as pinturas e sem salto de layout, os custos reservados só na visão do Narrador e o axe sem violações.
 * Usa a prévia `/preview/ficha` com as cartas da referência (`cartas=referencia`), sem API.
 */

const APP = process.env.E2E_APP_URL;
const AXE = resolve("node_modules/axe-core/axe.min.js");

async function abrir(browser, largura, { semArte = false, papel = "jogador", cartas = "referencia" } = {}) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: 900 } });
  if (semArte) await contexto.route("**/arte/cartas/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=cartas&cartas=${cartas}&papel=${papel}`);
  await expect(pagina.getByRole("button", { name: /: Segundo round\./ })).toBeVisible();
  await pagina.evaluate(() => document.fonts.ready);
  return { contexto, pagina };
}

const medidas = (pagina) => pagina.evaluate(() => {
  const caixa = (el) => el.getBoundingClientRect();
  const cartas = [...document.querySelectorAll(".cartas-secao--aprendidas .carta-ficha")].map(caixa);
  const primeira = document.querySelector(".cartas-secao--aprendidas .carta-ficha");
  const lateral = document.querySelector(".cartas-corpo__lateral");
  const faixa = caixa(primeira.querySelector(".carta-ficha__faixa"));
  const medalhao = primeira.querySelector(".carta-medalhao__aro");
  const pilula = caixa(primeira.querySelector(".carta-ficha__origem"));
  const doTopo = cartas.filter((c) => Math.round(c.top) === Math.round(cartas[0].top));
  return {
    paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    colunas: doTopo.length,
    carta: { largura: cartas[0].width, altura: cartas[0].height },
    vaoEntreColunas: doTopo.length > 1 ? doTopo[1].left - doTopo[0].right : null,
    faixa: faixa.height,
    medalhao: medalhao ? { diametro: caixa(medalhao).width * 62 / 78, centro: caixa(medalhao).top + caixa(medalhao).height / 2 - faixa.top } : null,
    pilulaAoPe: cartas[0].bottom - pilula.bottom,
    // A barra fica ao lado da grade, sem nenhuma carta por cima dela.
    barraAoLado: window.getComputedStyle(lateral).display !== "none" && caixa(lateral).right <= cartas[0].left,
    cartaSobreABarra: cartas.some((c) => c.left < caixa(lateral).right - .5 && c.top < caixa(lateral).bottom && c.bottom > caixa(lateral).top && caixa(lateral).right <= c.right),
    // Nenhum texto passa da borda da própria carta.
    textoVaza: [...document.querySelectorAll(".carta-ficha")].some((c) => {
      const dono = caixa(c);
      return [...c.querySelectorAll(".carta-ficha__corpo > *, .carta-ficha__custo, .carta-ficha__origem")]
        .some((el) => caixa(el).right > dono.right + .5 || caixa(el).left < dono.left - .5 || caixa(el).bottom > dono.bottom + .5);
    }),
  };
});

test("Cartas em 1448 px: as medidas da carta na referência", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448, { papel: "narrador", semArte: true });
  try {
    const m = await medidas(pagina);
    // A carta tem tamanho fixo (não escala com a folha): 267 × 310 px de linha escura a linha escura.
    expect(m.colunas).toBe(4);
    expect(Math.abs(m.carta.largura - 266)).toBeLessThan(4);
    expect(Math.abs(m.carta.altura - 310)).toBeLessThan(5);
    expect(Math.abs(m.vaoEntreColunas - 13)).toBeLessThan(3);
    expect(Math.abs(m.faixa - 79)).toBeLessThan(3);
    // O medalhão da reserva: 67 px de aro, centrado na faixa (a pintura traz o dela no mesmo lugar).
    expect(Math.abs(m.medalhao.diametro - 67)).toBeLessThan(4);
    expect(Math.abs(m.medalhao.centro - 79 / 2)).toBeLessThan(3);
    expect(Math.abs(m.pilulaAoPe - 11)).toBeLessThan(3);
    expect(m.barraAoLado).toBe(true);
    // Visão do Narrador: os quatro custos e a pílula da classe, como na imagem.
    const carta = pagina.getByRole("button", { name: /: Segundo round\./ });
    for (const rotulo of ["Custo de aprendizado", "Descansos mínimos", "Potência de uso", "Custo de uso"]) {
      await expect(carta.getByText(rotulo)).toBeVisible();
    }
    await expect(carta.getByText("Classe: Especialista de Combate - automática")).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("a prévia da referência traz as dez cartas da imagem, e o jogador não vê os custos reservados", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448, { cartas: "imagem" });
  try {
    await expect(pagina.locator(".cartas-secao--aprendidas .carta-ficha")).toHaveCount(10);
    const carta = pagina.getByRole("button", { name: /: Segundo round\./ });
    await expect(carta.getByText("Potência de uso")).toBeVisible();
    await expect(carta.getByText("Custo de aprendizado")).toHaveCount(0);
    await expect(carta.getByText("Descansos mínimos")).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});

for (const [largura, colunas, barra] of [
  [1920, 4, true], [1448, 4, true], [1300, 3, true], [1024, 2, true],
  [768, 2, false], [480, 1, false], [375, 1, false], [360, 1, false], [320, 1, false],
]) {
  test(`Cartas em ${largura} px: ${colunas} coluna(s), ${barra ? "barra ao lado" : "fileiras acima"}, sem rolagem nem sobreposição`, async ({ browser }) => {
    const { contexto, pagina } = await abrir(browser, largura, { papel: "narrador" });
    try {
      const m = await medidas(pagina);
      expect(m.paginaRola).toBe(false);
      expect(m.colunas).toBe(colunas);
      expect(m.barraAoLado).toBe(barra);
      expect(m.cartaSobreABarra).toBe(false);
      expect(m.textoVaza).toBe(false);
    } finally {
      await contexto.close();
    }
  });
}

test("em tela larga, a caixa das cartas rola dentro de si, com a barra parada e o título da seção preso", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448);
  try {
    const grade = pagina.getByRole("region", { name: "Cartas do personagem" });
    const antes = await pagina.evaluate(() => {
      const g = document.querySelector(".cartas-corpo__grade");
      const folha = document.querySelector(".cartas-folha");
      window.scrollTo(0, folha.getBoundingClientRect().top + window.scrollY);
      return { rola: g.scrollHeight > g.clientHeight + 1, overflow: window.getComputedStyle(g).overflowY };
    });
    expect(antes).toEqual({ rola: true, overflow: "auto" });
    const lateralAntes = await pagina.locator(".cartas-corpo__lateral").evaluate((el) => el.getBoundingClientRect().top);
    await grade.evaluate((g) => { g.scrollTop = 260; });
    const depois = await pagina.evaluate(() => {
      const g = document.querySelector(".cartas-corpo__grade").getBoundingClientRect();
      const titulo = document.querySelector(".cartas-secao--aprendidas .cartas-secao__titulo").getBoundingClientRect();
      return { grade: g.top, titulo: titulo.top, lateral: document.querySelector(".cartas-corpo__lateral").getBoundingClientRect().top };
    });
    expect(Math.abs(depois.titulo - depois.grade)).toBeLessThan(6);
    expect(depois.lateral).toBe(lateralAntes);
    // Pelo teclado: a caixa recebe foco e rola com as setas.
    await grade.evaluate((g) => { g.scrollTop = 0; });
    await grade.focus();
    await pagina.keyboard.press("PageDown");
    // O PageDown rola com animação: espera a caixa sair do topo.
    await expect.poll(() => grade.evaluate((g) => g.scrollTop)).toBeGreaterThan(0);
  } finally {
    await contexto.close();
  }
});

test("no celular, a grade rola com a página, sem rolagem interna", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 375);
  try {
    const grade = await pagina.locator(".cartas-corpo__grade").evaluate((g) => ({
      overflow: window.getComputedStyle(g).overflowY, rola: g.scrollHeight > g.clientHeight + 1,
    }));
    expect(grade).toEqual({ overflow: "visible", rola: false });
  } finally {
    await contexto.close();
  }
});

test("toda carta tem a altura da referência, inclusive itens sem quadro de custos", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448);
  try {
    const alturas = await pagina.evaluate(() => [...document.querySelectorAll(".cartas-secao__lista .carta-ficha")]
      .map((c) => ({ tipo: c.className, altura: c.getBoundingClientRect().height })));
    expect(alturas.some((a) => a.tipo.includes("carta-ficha--item"))).toBe(true);
    for (const { altura } of alturas) expect(Math.abs(altura - 310)).toBeLessThan(5);
  } finally {
    await contexto.close();
  }
});

test("sem as pinturas, a folha fica completa e nada salta ao abrir a aba", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448, { semArte: true });
  try {
    await expect(pagina.locator(".cartas-gravura__reserva .resumo-rosa")).toHaveCount(1);
    await expect(pagina.locator(".cartas-folha img")).toHaveCount(0);
    await expect(pagina.locator(".carta-ficha__reserva .carta-medalhao").first()).toBeVisible();
  } finally {
    await contexto.close();
  }
  // Com as pinturas (quando existem), as faixas e a gravura entram sem mover nada.
  const outro = await browser.newContext({ viewport: { width: 1448, height: 900 } });
  try {
    const pagina = await outro.newPage();
    await pagina.addInitScript(() => {
      window.__saltos = 0;
      new PerformanceObserver((lista) => { for (const e of lista.getEntries()) if (!e.hadRecentInput) window.__saltos += e.value; })
        .observe({ type: "layout-shift", buffered: true });
    });
    await pagina.goto(`${APP}/preview/ficha?secao=cartas&cartas=referencia`);
    const grade = pagina.locator(".cartas-corpo__grade");
    await expect(pagina.getByRole("button", { name: /: Segundo round\./ })).toBeVisible();
    await pagina.evaluate(() => document.fonts.ready);
    const antes = await pagina.evaluate(() => window.__saltos);
    const topo = await grade.evaluate((el) => el.getBoundingClientRect().top);
    await pagina.waitForLoadState("networkidle");
    await pagina.waitForTimeout(300);
    expect(await pagina.evaluate(() => window.__saltos) - antes).toBeLessThan(.001);
    expect(Math.abs(await grade.evaluate((el) => el.getBoundingClientRect().top) - topo)).toBeLessThan(1);
  } finally {
    await outro.close();
  }
});

test("o detalhe é o grimório do conceito aprovado, com as medidas dele em 1448 px", async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 1448, height: 1086 } });
  try {
    const pagina = await contexto.newPage();
    await pagina.goto(`${APP}/preview/ficha?secao=cartas&cartas=referencia`);
    await pagina.getByRole("button", { name: /: Segundo round\./ }).click();
    await expect(pagina.getByRole("dialog", { name: "Segundo round" })).toBeVisible();
    const m = await pagina.evaluate(() => {
      const caixa = (s) => document.querySelector(s).getBoundingClientRect();
      const dados = [...document.querySelectorAll(".grimorio-dado--esquerda, .grimorio-dado--direita")].map((d) => d.getBoundingClientRect());
      return {
        dialogo: caixa(".grimorio"), arte: caixa(".grimorio-arte"), citacao: caixa(".grimorio-citacao"), dado: caixa(".grimorio-dado"),
        paginaEsquerda: caixa(".grimorio-pagina--esquerda"), paginaDireita: caixa(".grimorio-pagina--direita"),
        colunas: new Set(dados.map((d) => Math.round(d.left))).size,
        rola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    // Geometria do conceito (diálogo de 1395 × 790): o grimório escala com a janela sem mudar de proporção.
    expect(Math.abs(m.dialogo.width - 1448 * .88)).toBeLessThan(4);
    expect(Math.abs(m.dialogo.width / m.dialogo.height - 1395 / 790)).toBeLessThan(.01);
    const x = (v) => (v - m.dialogo.left) / m.dialogo.width;
    const y = (v) => (v - m.dialogo.top) / m.dialogo.height;
    expect(Math.abs(x(m.arte.left) - .158)).toBeLessThan(.004);
    expect(Math.abs(y(m.arte.top) - .089)).toBeLessThan(.006);
    expect(Math.abs(m.arte.width / m.dialogo.width - .29)).toBeLessThan(.004);
    expect(Math.abs(m.arte.width - m.arte.height)).toBeLessThan(1);
    expect(Math.abs(x(m.citacao.left) - .52)).toBeLessThan(.004);
    // Quadros de dados baixos (pedido do usuário) e a citação com o resto da página.
    expect(m.dado.height / m.dialogo.height).toBeLessThan(.1);
    expect(m.citacao.height / m.dialogo.height).toBeGreaterThan(.4);
    expect(m.paginaEsquerda.right).toBeLessThanOrEqual(m.paginaDireita.left + 1);
    expect(m.colunas).toBe(2);
    expect(m.rola).toBe(false);
  } finally {
    await contexto.close();
  }
});

for (const largura of [375, 320]) {
  test(`o grimório em ${largura} px vira uma página só, sem rolagem horizontal, e a moldura não rola`, async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: largura, height: 812 } });
    try {
      const pagina = await contexto.newPage();
      await pagina.goto(`${APP}/preview/ficha?secao=cartas&cartas=referencia`);
      await pagina.getByRole("button", { name: /: Segundo round\./ }).click();
      await expect(pagina.getByRole("dialog", { name: "Segundo round" })).toBeVisible();
      const m = await pagina.evaluate(async () => {
        const esquerda = document.querySelector(".grimorio-pagina--esquerda").getBoundingClientRect();
        const direita = document.querySelector(".grimorio-pagina--direita").getBoundingClientRect();
        const moldura = () => document.querySelector(".grimorio-moldura").getBoundingClientRect().top;
        const antes = moldura();
        document.querySelector(".grimorio .dialog__body").scrollTop = 10000;
        await new Promise((r) => setTimeout(r, 50));
        return {
          empilhadas: direita.top >= esquerda.bottom - 1,
          molduraParada: Math.abs(moldura() - antes) < 1,
          rola: document.documentElement.scrollWidth > document.documentElement.clientWidth
            || [...document.querySelectorAll(".grimorio *")].some((el) => el.getBoundingClientRect().right > window.innerWidth + 1),
        };
      });
      expect(m).toEqual({ empilhadas: true, molduraParada: true, rola: false });
    } finally {
      await contexto.close();
    }
  });
}

test("o axe não acusa violações na folha, na barra e no detalhe", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448, { papel: "narrador" });
  try {
    await pagina.addScriptTag({ path: AXE });
    const rodar = (seletor) => pagina.evaluate(async (s) => window.axe.run(document.querySelector(s), {
      rules: { region: { enabled: false } },
    }), seletor);
    expect((await rodar(".cartas-folha")).violations).toEqual([]);
    await pagina.getByRole("navigation", { name: "Origem" }).getByRole("button", { name: /Da raça/ }).click();
    expect((await rodar(".cartas-folha")).violations).toEqual([]);
    await pagina.getByRole("button", { name: /: Luz das estrelas\./ }).click();
    await expect(pagina.getByRole("dialog", { name: "Luz das estrelas" })).toBeVisible();
    expect((await rodar("[role='dialog']")).violations).toEqual([]);
  } finally {
    await contexto.close();
  }
});
