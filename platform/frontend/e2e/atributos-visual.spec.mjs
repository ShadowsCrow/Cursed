/* global document, window */
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

/*
 * Aba Atributos (redesenhar-aba-atributos, tarefa 5.1): cartões em três colunas na tela larga e em uma no
 * celular, nada rola na horizontal de 360 a 1448 px, sem sobreposição entre medalhão e cabeçalho, as
 * pinturas não deslocam o conteúdo e o axe não acusa violações. Usa a prévia `/preview/ficha`, sem API.
 */

// Seletores presos ao painel de Atributos: a aba Perícias reaproveita as classes `atributos-*` do cartão.
const APP = process.env.E2E_APP_URL;
const AXE = resolve("node_modules/axe-core/axe.min.js");

async function abrir(browser, largura, { semArte = false } = {}) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: 900 } });
  if (semArte) await contexto.route("**/arte/atributos/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=atributos`);
  await expect(pagina.getByRole("table", { name: "Mentais" })).toBeVisible();
  await pagina.evaluate(() => document.fonts.ready);
  return { contexto, pagina };
}

const medidas = (pagina) => pagina.evaluate(() => {
  const caixa = (el) => el.getBoundingClientRect();
  const cartoes = [...document.querySelectorAll("#painel-atributos .atributos-cartao")].map(caixa);
  const frase = caixa(document.querySelector("#painel-atributos .atributos-cabecalho__titulos"));
  const medalhoes = [...document.querySelectorAll("#painel-atributos .atributos-cartao__medalhao")].map(caixa);
  const tabelas = [...document.querySelectorAll("#painel-atributos .atributos-tabela")];
  return {
    paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    colunas: new Set(cartoes.map((c) => Math.round(c.top))).size === 1 ? cartoes.length : 1,
    medalhaoSobreOTexto: medalhoes.some((m) => m.top < frase.bottom && m.right > frase.left && m.left < frase.right),
    // Nenhuma célula das tabelas passa da borda do seu cartão.
    celulaVaza: tabelas.some((t) => {
      const cartao = caixa(t.closest("#painel-atributos .atributos-cartao"));
      return [...t.querySelectorAll("#painel-atributos .atributos-base, .atributos-ajuste, .derived-value__trigger")]
        .some((el) => caixa(el).right > cartao.right + .5 || caixa(el).left < cartao.left - .5);
    }),
    // Nomes não encostam no disco da base.
    nomeSobreABase: [...document.querySelectorAll("#painel-atributos .atributos-linha")].some((linha) => {
      const nome = caixa(linha.querySelector("#painel-atributos .atributos-linha__nome span:last-child"));
      return nome.right > caixa(linha.querySelector("#painel-atributos .atributos-base")).left;
    }),
  };
});

for (const [largura, colunas] of [[1448, 3], [1280, 3], [1024, 1], [768, 1], [375, 1], [360, 1]]) {
  test(`Atributos em ${largura} px: ${colunas === 3 ? "três colunas" : "uma coluna"}, sem rolagem nem sobreposição`, async ({ browser }) => {
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

test("sem as pinturas, emblemas e degradês ocupam o mesmo lugar, sem imagem quebrada", async ({ browser }) => {
  const comArte = await abrir(browser, 1448);
  const topoCom = await comArte.pagina.locator("#painel-atributos .atributos-cartoes").evaluate((el) => el.getBoundingClientRect().top);
  await comArte.contexto.close();

  const { contexto, pagina } = await abrir(browser, 1448, { semArte: true });
  try {
    await expect(pagina.locator("#painel-atributos .atributos-vinheta__emblema")).toHaveCount(3);
    await expect(pagina.locator("#painel-atributos .atributos-folha img")).toHaveCount(0);
    const topoSem = await pagina.locator("#painel-atributos .atributos-cartoes").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(topoSem - topoCom)).toBeLessThanOrEqual(1);
  } finally {
    await contexto.close();
  }
});

test("aba Atributos sem violações do axe, em leitura e em edição", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1280);
  try {
    await pagina.addScriptTag({ path: AXE });
    const rodar = () => pagina.evaluate(async () => window.axe.run(document.querySelector("#painel-atributos .atributos-folha"), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    }));
    let resultado = await rodar();
    expect(resultado.violations.map((v) => ({ regra: v.id, alvos: v.nodes.map((n) => n.target) }))).toEqual([]);
    await pagina.getByRole("button", { name: "Editar valores" }).click();
    await pagina.getByLabel("Base de Força").fill("7");
    resultado = await rodar();
    expect(resultado.violations.map((v) => ({ regra: v.id, alvos: v.nodes.map((n) => n.target) }))).toEqual([]);
  } finally {
    await contexto.close();
  }
});
