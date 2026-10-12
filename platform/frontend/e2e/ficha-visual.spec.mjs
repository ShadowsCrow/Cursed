/* global document, getComputedStyle, window, MutationObserver */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

/*
 * Visual da ficha (reformular-visual-da-ficha, tarefa 7.3): a célula da grade acompanha a largura da
 * seção, a página nunca rola na horizontal e o arraste acerta a célula mesmo com a bolsa rolada.
 * Usa a prévia `/preview/ficha`, que não precisa de API.
 */

const APP = process.env.E2E_APP_URL;

async function abrirFicha(browser, consulta, largura, altura = 900) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: altura } });
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=inventario&${consulta}`);
  await expect(pagina.getByRole("group", { name: "Carga" })).toBeVisible();
  return { contexto, pagina };
}

const medidas = (pagina) => pagina.evaluate(() => {
  const conteudo = document.querySelector(".bolsa__conteudo");
  const area = document.querySelector(".bolsa .grade-inventario__area");
  return {
    paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bolsaRola: conteudo.scrollWidth > conteudo.clientWidth + 1,
    colunas: Number(area.style.getPropertyValue("--colunas")),
    celula: area.getBoundingClientRect().width / Number(area.style.getPropertyValue("--colunas")),
  };
});

test("grade de 8 colunas cabe num celular de 400 px sem rolagem", async ({ browser }) => {
  const { contexto, pagina } = await abrirFicha(browser, "tamanho=grande&forca=3&mochila=1", 400);
  try {
    const m = await medidas(pagina);
    expect(m.colunas).toBe(8);
    expect(m.paginaRola).toBe(false);
    expect(m.bolsaRola).toBe(false);
    expect(m.celula).toBeGreaterThanOrEqual(24);
    await expect(pagina.getByText("Deslize para ver a grade inteira.")).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});

test("Colossal com Força 5 e mochila em 375 px rola só dentro da bolsa", async ({ browser }) => {
  const { contexto, pagina } = await abrirFicha(browser, "tamanho=colossal&forca=5&mochila=1", 375);
  try {
    const m = await medidas(pagina);
    expect(m.colunas).toBe(12);
    expect(m.paginaRola).toBe(false);
    expect(m.bolsaRola).toBe(true);
    await expect(pagina.getByText("Deslize para ver a grade inteira.")).toBeVisible();
    await expect(pagina.locator(".bolsa__conteudo")).toHaveAttribute("data-rolagem", "mais");
    // A placa fica fixa à esquerda enquanto a grade rola.
    const placa = await pagina.locator(".placa").evaluate((el) => getComputedStyle(el).position);
    expect(placa).toBe("sticky");
  } finally {
    await contexto.close();
  }
});

test("célula cresce na tela larga e encolhe na grade Colossal", async ({ browser }) => {
  const pequena = await abrirFicha(browser, "tamanho=minusculo&forca=1", 1440);
  const grande = await abrirFicha(browser, "tamanho=colossal&forca=5&mochila=1", 1280);
  try {
    const a = await medidas(pequena.pagina);
    const b = await medidas(grande.pagina);
    expect(a.celula).toBeGreaterThan(80);
    expect(b.celula).toBeLessThan(a.celula);
    expect(b.celula).toBeGreaterThanOrEqual(36);
    expect(a.paginaRola || b.paginaRola).toBe(false);
  } finally {
    await pequena.contexto.close();
    await grande.contexto.close();
  }
});

test("arrastar com a bolsa rolada solta o item na célula sob o ponteiro", async ({ browser }) => {
  const { contexto, pagina } = await abrirFicha(browser, "tamanho=colossal&forca=5&mochila=1", 375);
  try {
    const conteudo = pagina.locator(".bolsa__conteudo");
    await conteudo.evaluate((el) => { el.scrollLeft = 160; });
    const item = pagina.getByRole("button", { name: /^Pão de Viagem,/ });
    await item.scrollIntoViewIfNeeded();
    const origem = await item.boundingBox();
    const area = await pagina.locator(".bolsa .grade-inventario__area").boundingBox();
    const celula = area.width / 12;
    // Alvo: coluna 9, linha 5 (índices 8 e 4), uma célula vazia na parte visível depois da rolagem.
    const alvo = { x: area.x + celula * 8.5, y: area.y + celula * 4.5 };
    await pagina.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2);
    await pagina.mouse.down();
    await pagina.mouse.move(alvo.x, alvo.y, { steps: 8 });
    await pagina.mouse.up();
    await expect(pagina.getByRole("button", { name: /^Pão de Viagem,.*coluna 9, linha 5/ })).toBeVisible();
    expect((await medidas(pagina)).paginaRola).toBe(false);
  } finally {
    await contexto.close();
  }
});

test("nenhuma aba da ficha rola na horizontal em 320 px, nem com os controles do Narrador", async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 320, height: 700 } });
  const pagina = await contexto.newPage();
  try {
    const abas = ["resumo", "informacoes", "personalidade", "atributos", "pericias", "equipamentos", "inventario", "status", "efeitos", "cartas"];
    const largas = [];
    for (const secao of abas) {
      // Nome longo de propósito: a palavra grande não pode alargar o cabeçalho.
      await pagina.goto(`${APP}/preview/ficha?papel=narrador&nome=Lia%20Andarilha%20Invernosa&secao=${secao}`);
      await pagina.getByRole("tabpanel").first().waitFor();
      await pagina.waitForTimeout(300);
      if (await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) largas.push(secao);
    }
    expect(largas).toEqual([]);
  } finally {
    await contexto.close();
  }
});

test("gravar uma ação do inventário não faz a tela saltar", async ({ browser }) => {
  // A prévia responde às gravações com a demora de um servidor (250 ms): "Guardando…" aparece e some.
  const { contexto, pagina } = await abrirFicha(browser, "tamanho=medio&forca=3", 1440);
  try {
    await pagina.getByRole("button", { name: /^Poção de Vida Menor,/ }).click();
    const acoes = pagina.getByRole("group", { name: "Ações para Poção de Vida Menor" });
    await expect(acoes).toBeVisible();
    await pagina.evaluate(() => {
      window.__saltos = 0;
      window.__estados = [];
      new PerformanceObserver((lista) => { for (const e of lista.getEntries()) window.__saltos += e.value; })
        .observe({ type: "layout-shift" });
      // Registra cada troca do texto de estado com a posição da bolsa naquele instante.
      const estado = document.querySelector(".inventario-ficha__estado");
      new MutationObserver(() => window.__estados.push([estado.textContent, document.querySelector(".bolsa").getBoundingClientRect().y]))
        .observe(estado, { childList: true, subtree: true, characterData: true });
    });
    const antes = await pagina.locator(".bolsa").boundingBox();
    await acoes.getByRole("button", { name: "Girar", exact: true }).click();
    await expect.poll(() => pagina.evaluate(() => window.__estados.map(([texto]) => texto))).toEqual(["Guardando…", ""]);
    const posicoes = await pagina.evaluate(() => window.__estados.map(([, y]) => y));
    expect(posicoes.every((y) => Math.abs(y - antes.y) < 1)).toBe(true);
    expect(await pagina.evaluate(() => window.__saltos)).toBe(0);
  } finally {
    await contexto.close();
  }
});

/*
 * Pinturas da bolsa (tarefas 8.3 e 8.4): laterais, tampa e base vêm de `fixtures/bolsa` (pinturas
 * sintéticas geradas pelo preparar_arte.py), servidas no lugar das reais, que podem nem existir.
 */
const PINTURAS = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "bolsa");

async function abrirComLaterais(browser, consulta, largura) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: 900 } });
  await contexto.route((url) => /\/arte\/inventario\/inventario-(lado-|tampa|base-)/.test(url.pathname), (rota) =>
    rota.fulfill({ path: path.join(PINTURAS, path.basename(new URL(rota.request().url()).pathname)) }));
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=inventario&${consulta}`);
  await expect(pagina.locator(".bolsa__lado--esquerdo")).toBeAttached();
  await expect(pagina.locator(".bolsa__tampa")).toBeAttached();
  return { contexto, pagina };
}

for (const [consulta, largura, colunas] of [
  ["tamanho=minusculo&forca=1", 1440, 2],
  ["tamanho=medio&forca=3", 1440, 5],
  ["tamanho=medio&forca=3", 768, 5],
  ["tamanho=medio&forca=3", 375, 5],
  ["tamanho=grande&forca=3&mochila=1", 400, 8],
  ["tamanho=colossal&forca=5&mochila=1", 1280, 12],
]) {
  test(`laterais, tampa e base sem cobrir células: ${consulta} em ${largura} px`, async ({ browser }) => {
    const { contexto, pagina } = await abrirComLaterais(browser, consulta, largura);
    try {
      await expect(pagina.locator(".bolsa__alca")).toHaveCount(0);
      const m = await pagina.evaluate(() => {
        const caixa = (seletor) => document.querySelector(seletor).getBoundingClientRect();
        const conteudo = document.querySelector(".bolsa__conteudo");
        const area = document.querySelector(".bolsa .grade-inventario__area");
        const imagens = [...document.querySelectorAll(".bolsa__lado img, .bolsa__tampa, .bolsa__base img")];
        return {
          paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          bolsaRola: conteudo.scrollWidth > conteudo.clientWidth + 1,
          colunas: Number(area.style.getPropertyValue("--colunas")),
          imagensCarregadas: imagens.length === 7 && imagens.every((img) => img.complete && img.naturalWidth > 0),
          coluna: caixa(".inventario-ficha__bolsa"), placa: caixa(".bolsa .placa"),
          tampa: caixa(".bolsa__tampa"), base: caixa(".bolsa__base"),
          tampaAtras: Number(getComputedStyle(document.querySelector(".bolsa__tampa")).zIndex) < 0,
          // Cada parte da base (pontas e miolo) cabe na altura dela, sem vazar.
          partesDaBase: [...document.querySelectorAll(".bolsa__base > *")].map((el) => el.getBoundingClientRect().height),
          bolsa: caixa(".bolsa"), area: caixa(".bolsa .grade-inventario__area"),
          esquerdo: caixa(".bolsa__lado--esquerdo"), direito: caixa(".bolsa__lado--direito"),
          miolo: caixa(".bolsa__lado--esquerdo .bolsa__lado-miolo"),
        };
      });
      expect(m.colunas).toBe(colunas);
      expect(m.paginaRola).toBe(false);
      expect(m.bolsaRola).toBe(false);
      expect(m.imagensCarregadas).toBe(true);
      for (const lado of [m.esquerdo, m.direito]) {
        // Cobre a bolsa de cima a baixo (com a sobra das pontas) e o miolo estica.
        expect(lado.top).toBeLessThanOrEqual(m.bolsa.top);
        expect(lado.bottom).toBeGreaterThanOrEqual(m.bolsa.bottom);
      }
      expect(m.miolo.height).toBeGreaterThan(0);
      expect(m.esquerdo.right).toBeLessThanOrEqual(m.area.left);
      expect(m.direito.left).toBeGreaterThanOrEqual(m.area.right);
      // A tampa sai por cima, no espaço que a coluna reservou; o resto dela fica atrás da bolsa, acima das
      // células. A base fica abaixo das células.
      expect(m.tampa.top).toBeGreaterThanOrEqual(m.coluna.top - 1);
      expect(m.tampa.bottom).toBeLessThanOrEqual(m.area.top);
      expect(m.tampaAtras).toBe(true);
      expect(m.tampa.width).toBeGreaterThan(0);
      expect(m.base.top).toBeGreaterThanOrEqual(m.area.bottom);
      expect(m.base.bottom).toBeLessThanOrEqual(m.coluna.bottom + 1);
      for (const altura of m.partesDaBase) expect(altura).toBeLessThanOrEqual(m.base.height + 1);
    } finally {
      await contexto.close();
    }
  });
}

/*
 * Informações básicas (redesenhar-informacoes-basicas, D7): quadros lado a lado na tela larga, empilhados na
 * estreita; em cada linha, rótulo, valor e "Editar" sem se sobrepor; nenhuma rolagem horizontal da página.
 */
for (const largura of [1440, 768, 375, 360]) {
  test(`Informações básicas em ${largura} px: quadros, linhas sem sobreposição e sem rolagem`, async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: largura, height: 900 } });
    const pagina = await contexto.newPage();
    try {
      await pagina.goto(`${APP}/preview/ficha?secao=informacoes&papel=narrador`);
      await expect(pagina.getByRole("region", { name: "Conceito do arquétipo Antimago" })).toBeVisible();
      const m = await pagina.evaluate(() => {
        const caixa = (el) => el.getBoundingClientRect();
        const sobrepoe = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        const [pessoal, origem] = [...document.querySelectorAll(".info-quadro")].map(caixa);
        const linhas = [...document.querySelectorAll(".info-linha")].map((linha) => {
          const partes = [linha.querySelector(".eyebrow"), linha.querySelector(".editable-field > strong"), linha.querySelector(".popover__trigger")]
            .filter(Boolean).map(caixa);
          return partes.some((a, i) => partes.some((b, j) => i < j && sobrepoe(a, b)));
        });
        return {
          paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          ladoALado: Math.abs(pessoal.top - origem.top) < 2 && origem.left >= pessoal.right,
          mesmaAltura: Math.abs(pessoal.height - origem.height) < 2,
          linhas: linhas.length,
          sobrepostas: linhas.filter(Boolean).length,
          botoes: document.querySelectorAll(".info-linha .popover__trigger").length,
        };
      });
      expect(m.paginaRola).toBe(false);
      expect(m.linhas).toBe(10);
      expect(m.sobrepostas).toBe(0);
      // O Narrador edita todos os campos, menos o Tamanho base, que vem da raça.
      expect(m.botoes).toBe(9);
      expect(m.ladoALado).toBe(largura >= 1280);
      if (m.ladoALado) expect(m.mesmaAltura).toBe(true);

      // A edição aberta no último botão da direita não alarga a página.
      await pagina.getByRole("button", { name: "Editar Tamanho atual" }).focus();
      await expect(pagina.getByRole("group", { name: "Editar Tamanho atual" })).toBeVisible();
      expect(await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally {
      await contexto.close();
    }
  });
}
