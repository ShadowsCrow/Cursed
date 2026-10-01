/* global document, window */
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

/*
 * Aba Perícias (redesenhar-aba-pericias, tarefas 4.5, 6.3 e 7.2): as medidas da referência do usuário a
 * 1448 px, três colunas na tela larga e uma abaixo de 1180 px de folha, nada rola na horizontal de 320 a
 * 1920 px, a folha fica completa sem as pinturas e o axe não acusa violações. Usa a prévia `/preview/ficha`
 * com as perícias da referência (`pericias=referencia`), sem API.
 */

const APP = process.env.E2E_APP_URL;
const AXE = resolve("node_modules/axe-core/axe.min.js");

async function abrir(browser, largura, { semArte = false } = {}) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: 900 } });
  if (semArte) await contexto.route("**/arte/pericias/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=pericias&pericias=referencia`);
  await expect(pagina.getByRole("table", { name: "Conhecimentos" })).toBeVisible();
  await pagina.evaluate(() => document.fonts.ready);
  return { contexto, pagina };
}

const medidas = (pagina) => pagina.evaluate(() => {
  const caixa = (el) => el.getBoundingClientRect();
  const folha = caixa(document.querySelector(".pericias-folha"));
  const cartoes = [...document.querySelectorAll(".pericias-cartao")].map(caixa);
  const titulos = caixa(document.querySelector(".pericias-cabecalho .atributos-cabecalho__titulos"));
  const medalhoes = [...document.querySelectorAll(".pericias-cartao .atributos-cartao__medalhao")].map(caixa);
  const linhas = [...document.querySelectorAll(".pericias-cartao--talentos .pericias-linha")].map(caixa);
  const primeira = document.querySelector(".pericias-cartao--talentos .pericias-linha");
  const cartao = cartoes[0];
  const centro = (seletor) => { const c = caixa(primeira.querySelector(seletor)); return (c.left + c.width / 2 - cartao.left) / cartao.width; };
  return {
    folha: folha.width,
    paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    colunas: new Set(cartoes.map((c) => Math.round(c.top))).size === 1 ? cartoes.length : 1,
    larguras: cartoes.map((c) => c.width),
    faixa: caixa(document.querySelector(".pericias-cartao .atributos-cartao__faixa")).height,
    linha: (linhas[linhas.length - 1].top - linhas[0].top) / (linhas.length - 1),
    centros: { base: centro(".pericias-base"), ajuste: centro(".pericias-ajuste"), total: centro(".derived-value__trigger") },
    medalhaoSobreOTexto: medalhoes.some((m) => m.top < titulos.bottom && m.right > titulos.left && m.left < titulos.right),
    // Nenhuma caixa das tabelas passa da borda do seu cartão.
    celulaVaza: [...document.querySelectorAll(".pericias-tabela")].some((t) => {
      const dono = caixa(t.closest(".pericias-cartao"));
      return [...t.querySelectorAll(".pericias-base, .pericias-ajuste, .derived-value__trigger")]
        .some((el) => caixa(el).right > dono.right + .5 || caixa(el).left < dono.left - .5);
    }),
    // Nomes não passam por cima da base.
    nomeSobreABase: [...document.querySelectorAll(".pericias-linha")].some((linha) => {
      const nome = caixa(linha.querySelector(".pericias-linha__nome span:last-child"));
      return nome.right > caixa(linha.querySelector(".pericias-base")).left;
    }),
  };
});

test("Perícias em 1448 px: as medidas da referência", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448);
  try {
    const m = await medidas(pagina);
    // A prévia limita a folha; as medidas da referência (folha de 1428 px) são comparadas na mesma escala.
    const escala = m.folha / 1428;
    expect(m.colunas).toBe(3);
    expect(Math.max(...m.larguras) - Math.min(...m.larguras)).toBeLessThan(1);
    for (const largura of m.larguras) expect(Math.abs(largura - 455 * escala)).toBeLessThan(12);
    expect(Math.abs(m.faixa - 104 * escala)).toBeLessThan(6);
    expect(Math.abs(m.linha - 30.7 * escala)).toBeLessThan(2);
    // Centros das colunas na referência: Base a 51%, Ajuste a 68% e Total a 88% do cartão.
    expect(Math.abs(m.centros.base - .51)).toBeLessThan(.02);
    expect(Math.abs(m.centros.ajuste - .68)).toBeLessThan(.02);
    expect(Math.abs(m.centros.total - .88)).toBeLessThan(.02);
    // Prontidão 3 com ajuste 3: selo na base, 3 na caixa e +6 no total.
    await expect(pagina.getByLabel("Base de Prontidão, maior base")).toHaveText("3");
    await expect(pagina.getByLabel("Ajuste manual de Prontidão")).toHaveText("3");
    await expect(pagina.getByRole("button", { name: "Fontes de Prontidão" })).toHaveText("+6");
  } finally {
    await contexto.close();
  }
});

for (const [largura, colunas] of [[1920, 3], [1448, 3], [1300, 3], [1024, 1], [768, 1], [480, 1], [375, 1], [360, 1], [320, 1]]) {
  test(`Perícias em ${largura} px: ${colunas === 3 ? "três colunas" : "uma coluna"}, sem rolagem nem sobreposição`, async ({ browser }) => {
    const { contexto, pagina } = await abrir(browser, largura);
    try {
      const m = await medidas(pagina);
      expect(m.paginaRola).toBe(false);
      expect(m.colunas).toBe(colunas);
      expect(m.medalhaoSobreOTexto).toBe(false);
      expect(m.celulaVaza).toBe(false);
      expect(m.nomeSobreABase).toBe(false);
    } finally {
      await contexto.close();
    }
  });
}

test("sem as pinturas, a folha fica completa: rosas dos ventos no cabeçalho, degradê nos estandartes, nada se move", async ({ browser }) => {
  const comArte = await abrir(browser, 1448);
  await comArte.pagina.waitForLoadState("networkidle");
  const topoCom = await comArte.pagina.locator(".pericias-cartoes").evaluate((el) => el.getBoundingClientRect().top);
  await comArte.contexto.close();
  const { contexto, pagina } = await abrir(browser, 1448, { semArte: true });
  try {
    await expect(pagina.locator(".pericias-cena__reserva .resumo-rosa")).toHaveCount(2);
    await expect(pagina.locator(".pericias-folha img")).toHaveCount(0);
    const topoSem = await pagina.locator(".pericias-cartoes").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(topoSem - topoCom)).toBeLessThan(1);
  } finally {
    await contexto.close();
  }
});

test("o axe não acusa violações na folha de Perícias, em leitura e em edição", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1448);
  try {
    await pagina.addScriptTag({ path: AXE });
    const rodar = () => pagina.evaluate(async () => window.axe.run(document.querySelector(".pericias-folha"), {
      rules: { region: { enabled: false } },
    }));
    expect((await rodar()).violations).toEqual([]);
    await pagina.getByRole("button", { name: "Editar valores" }).click();
    await pagina.getByLabel("Base de Briga").fill("9");
    expect((await rodar()).violations).toEqual([]);
  } finally {
    await contexto.close();
  }
});
