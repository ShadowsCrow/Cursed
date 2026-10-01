/* global document, window */
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

/*
 * Editor de cartas (simplificar-criacao-de-cartas, tarefas 5.4, 6.2 e 6.3): a geometria do conceito aprovado
 * (`referencia/conceito-editor-mochila.png`, 1536 × 1024) em frações do diálogo, o desenho em CSS sem as pinturas,
 * o layout de fluxo no celular, as setas na fila "O que é?" e o axe sem violações. Usa a prévia `/preview/editor`
 * (`carta=mochila`: a carta do conceito), sem API.
 */

const APP = process.env.E2E_APP_URL;
const AXE = resolve("node_modules/axe-core/axe.min.js");

async function abrir(browser, largura, altura, { semArte = false, carta = "mochila" } = {}) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: altura } });
  const recusadas = [];
  if (semArte) await contexto.route("**/arte/cartas/**", (rota) => { recusadas.push(rota.request().url()); return rota.abort(); });
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/editor${carta ? `?carta=${carta}` : ""}`);
  await expect(pagina.getByRole("radiogroup", { name: "Tipo da carta" })).toBeVisible();
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(400);
  return { contexto, pagina, recusadas };
}

/** Caixa de um elemento em frações do diálogo. */
const fracoes = (pagina) => pagina.evaluate(() => {
  const dialogo = document.querySelector(".dialog.editor-carta").getBoundingClientRect();
  const em = (seletor) => {
    const c = document.querySelector(seletor).getBoundingClientRect();
    const r = (v) => Math.round(v * 1000) / 1000;
    return { x0: r((c.left - dialogo.left) / dialogo.width), y0: r((c.top - dialogo.top) / dialogo.height),
      x1: r((c.right - dialogo.left) / dialogo.width), y1: r((c.bottom - dialogo.top) / dialogo.height) };
  };
  return {
    proporcao: dialogo.width / dialogo.height,
    marcadores: em(".editor-marcadores"),
    ativo: em(".editor-marcador--ativo"),
    arte: em(".editor-arte"),
    titulo: em(".editor-titulo"),
    oQueE: em(".editor-o-que-e"),
    primeiroQuadro: em(".editor-quadros .editor-quadro"),
    selo: em(".editor-selo"),
    paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});

// Medidas do conceito, em frações de 1536 × 1024 (tolerância de 2,5% do diálogo).
const PERTO = .025;
const perto = (valor, esperado, nome = "") => expect(Math.abs(valor - esperado), `${nome}: ${valor} × ${esperado}`).toBeLessThanOrEqual(PERTO);

test("editor em 1600 px: a geometria do conceito, em frações do diálogo", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1600, 1100);
  try {
    const m = await fracoes(pagina);
    expect(Math.abs(m.proporcao - 1.5)).toBeLessThan(.01);
    expect(m.paginaRola).toBe(false);
    // Marcadores: de Habilidade (22,5%) a Efeito (76,6%), saindo do alto do livro (pé em ~13,7%).
    perto(m.marcadores.x0, .225, "marcadores.x0"); perto(m.marcadores.x1, .766, "marcadores.x1"); perto(m.marcadores.y1, .137, "marcadores.y1");
    perto(m.ativo.x0, .518, "ativo.x0");
    // Página esquerda: a arte (17,7%–46,3% × 17,9%–59,1%) e o cartucho do título embaixo dela.
    perto(m.arte.x0, .177, "arte.x0"); perto(m.arte.x1, .463, "arte.x1"); perto(m.arte.y0, .179, "arte.y0"); perto(m.arte.y1, .591, "arte.y1");
    perto(m.titulo.y0, .605, "titulo.y0"); perto(m.titulo.y1, .781, "titulo.y1");
    // Página direita: "O que é?" no alto (19%), os quadros abaixo (31,7%) e o selo no pé (74%–86% × 77%–84%).
    perto(m.oQueE.x0, .521, "oQueE.x0"); perto(m.oQueE.y0, .19, "oQueE.y0");
    perto(m.primeiroQuadro.y0, .317, "primeiroQuadro.y0");
    perto(m.selo.x1, .865, "selo.x1"); perto(m.selo.y0, .767, "selo.y0");
  } finally {
    await contexto.close();
  }
});

test("sem as pinturas: livro, marcadores e selo em CSS, na mesma geometria e sem imagem quebrada", async ({ browser }) => {
  const { contexto, pagina, recusadas } = await abrir(browser, 1600, 1100, { semArte: true });
  try {
    expect(recusadas.length).toBeGreaterThan(0);
    const estado = await pagina.evaluate(() => ({
      pintado: document.querySelector(".dialog.editor-carta").classList.contains("grimorio--pintado"),
      livroEmCss: window.getComputedStyle(document.querySelector(".grimorio-livro")).display !== "none",
      marcadoresPintados: document.querySelector(".editor-marcadores").classList.contains("editor-marcadores--pintados"),
      imagensDeArte: [...document.querySelectorAll(".dialog.editor-carta img")].filter((i) => i.src.includes("/arte/cartas/")).length,
      seloVisivel: document.querySelector(".editor-selo").getBoundingClientRect().width > 0,
    }));
    expect(estado).toEqual({ pintado: false, livroEmCss: true, marcadoresPintados: false, imagensDeArte: 0, seloVisivel: true });
    const m = await fracoes(pagina);
    perto(m.marcadores.y1, .137, "marcadores.y1"); perto(m.arte.x0, .177, "arte.x0"); perto(m.selo.y0, .767, "selo.y0");
  } finally {
    await contexto.close();
  }
});

test("celular: marcadores, carta e campos em coluna, sem rolagem horizontal", async ({ browser }) => {
  for (const largura of [400, 375, 320]) {
    const { contexto, pagina } = await abrir(browser, largura, 800);
    try {
      const m = await pagina.evaluate(() => {
        const caixa = (s) => document.querySelector(s).getBoundingClientRect();
        const dialogo = caixa(".dialog.editor-carta");
        const vaza = [...document.querySelectorAll(".dialog.editor-carta .editor-quadro, .editor-titulo, .editor-arte, .editor-pe")]
          .some((el) => el.getBoundingClientRect().right > dialogo.right + .5);
        return {
          paginaRola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          vaza,
          ordem: caixa(".editor-marcadores").bottom <= caixa(".editor-arte").top
            && caixa(".editor-titulo").bottom <= caixa(".editor-o-que-e").top,
        };
      });
      expect(m, `${largura} px`).toEqual({ paginaRola: false, vaza: false, ordem: true });
    } finally {
      await contexto.close();
    }
  }
});

test("as setas trocam a escolha na fila \"O que é?\" e nos marcadores de tipo", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1600, 1100);
  try {
    await pagina.getByRole("radio", { name: "Mochila" }).focus();
    await pagina.keyboard.press("ArrowRight");
    await expect(pagina.getByRole("radio", { name: "Aljava" })).toBeChecked();
    await expect(pagina.getByLabel("Capacidade de flechas")).toBeVisible();
    await pagina.getByRole("radio", { name: "Item" }).focus();
    await pagina.keyboard.press("ArrowRight");
    // Item com campos preenchidos: trocar o tipo pede confirmação antes de descartar.
    await expect(pagina.getByRole("dialog", { name: "Trocar para Efeito?" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("o axe não acusa violações no editor", async ({ browser }) => {
  for (const carta of ["mochila", ""]) {
    const { contexto, pagina } = await abrir(browser, 1600, 1100, { carta });
    try {
      await pagina.addScriptTag({ path: AXE });
      const violacoes = await pagina.evaluate(async () => (await window.axe.run(document.querySelector(".dialog.editor-carta"), {
        rules: { region: { enabled: false } },
      })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));
      expect(violacoes, carta || "nova").toEqual([]);
    } finally {
      await contexto.close();
    }
  }
});
