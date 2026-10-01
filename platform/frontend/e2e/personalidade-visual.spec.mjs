/* global document, getComputedStyle */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

/*
 * Aba Personalidade (reformular-personalidade-da-ficha): cópia fiel da referência do usuário. Confere as larguras
 * sem rolagem, as pinturas sem cobrir texto (e a folha igual sem elas), um valor longo dentro da linha e a
 * sobreposição com a referência (o script de fidelidade, que trava regressões). Usa a prévia `/preview/ficha`.
 */

const APP = process.env.E2E_APP_URL;
const aqui = path.dirname(fileURLToPath(import.meta.url));

async function abrir(browser, largura, { bloquearPinturas = false, consulta = "" } = {}) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: 1000 }, locale: "pt-BR" });
  if (bloquearPinturas) await contexto.route("**/arte/personalidade/personalidade-*.webp", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=personalidade${consulta}`);
  await pagina.locator(".folha-personalidade").waitFor();
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(300);
  return { contexto, pagina };
}

const caixa = (r) => ({ x: r.x, y: r.y, direita: r.x + r.width, baixo: r.y + r.height });
const cruza = (a, b) => a.x < b.direita && b.x < a.direita && a.y < b.baixo && b.y < a.baixo;

/** Caixas das pinturas e dos textos que elas não podem cobrir, em px da página. */
const medidas = (pagina) => pagina.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().toJSON() : null; };
  const visivel = (s) => { const e = document.querySelector(s); return Boolean(e) && getComputedStyle(e).display !== "none"; };
  return {
    rola: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    pinturas: [".personalidade-pintura--escrivaninha", ".personalidade-pintura--historia"].filter(visivel).map(r),
    textos: [".personalidade-citacao strong", ".personalidade-etiquetas", ".personalidade-historia__texto",
      ".folha-personalidade__titulo", ".folha-personalidade__subtitulo"].map(r).filter(Boolean),
    linhas: [...document.querySelectorAll(".personalidade-linha")].map((l) => l.getBoundingClientRect().toJSON()),
    imagensQuebradas: [...document.querySelectorAll(".folha-personalidade img")].filter((i) => i.complete && i.naturalWidth === 0).length,
  };
});

for (const largura of [360, 768, 1280, 1440]) {
  test(`Personalidade em ${largura} px: sem rolagem e nenhuma pintura sobre texto`, async ({ browser }) => {
    const { contexto, pagina } = await abrir(browser, largura);
    try {
      const m = await medidas(pagina);
      expect(m.rola).toBe(false);
      // A pintura do topo fica atrás da citação nas larguras médias só se estiver esmaecida (opacidade baixa).
      const opacidade = await pagina.evaluate(() => Number(getComputedStyle(document.querySelector(".personalidade-pintura--escrivaninha")).opacity));
      for (const pintura of m.pinturas) {
        for (const texto of m.textos) {
          if (cruza(caixa(pintura), caixa(texto))) expect(opacidade, `pintura sobre texto em ${largura} px`).toBeLessThanOrEqual(0.4);
        }
      }
      expect(m.imagensQuebradas).toBe(0);
    } finally {
      await contexto.close();
    }
  });
}

test("sem as pinturas, os ornamentos entram no lugar e as linhas ficam onde estavam", async ({ browser }) => {
  const com = await abrir(browser, 1280);
  const sem = await abrir(browser, 1280, { bloquearPinturas: true });
  try {
    const [a, b] = [await medidas(com.pagina), await medidas(sem.pagina)];
    expect(b.imagensQuebradas).toBe(0);
    expect(await sem.pagina.locator(".personalidade-pintura--reserva").count()).toBe(2);
    expect(b.linhas.map((l) => [Math.round(l.x), Math.round(l.y)])).toEqual(a.linhas.map((l) => [Math.round(l.x), Math.round(l.y)]));
  } finally {
    await com.contexto.close();
    await sem.contexto.close();
  }
});

test("um valor de 200 caracteres a 1280 px fica dentro da própria linha", async ({ browser }) => {
  const { contexto, pagina } = await abrir(browser, 1280);
  try {
    const botao = pagina.getByRole("button", { name: "Editar Coisa favorita" });
    await botao.click();
    if (!(await pagina.locator(".popover__surface").count())) await botao.click();
    await pagina.getByLabel("Coisa favorita", { exact: true }).fill("Runas antigas ".repeat(15).slice(0, 200));
    await pagina.getByRole("button", { name: "Salvar" }).last().click();
    await expect(pagina.locator(".personalidade-linha").nth(1).locator("strong")).toContainText("Runas antigas Runas");
    const { valor, linha, proxima } = await pagina.evaluate(() => {
      const linhas = [...document.querySelectorAll(".personalidade-grupo--essencia .personalidade-linha")];
      return { valor: linhas[1].querySelector("strong").getBoundingClientRect().toJSON(),
        linha: linhas[1].getBoundingClientRect().toJSON(), proxima: linhas[2].getBoundingClientRect().toJSON() };
    });
    expect(valor.y).toBeGreaterThanOrEqual(linha.y - 0.5);
    expect(valor.y + valor.height).toBeLessThanOrEqual(linha.y + linha.height + 0.5);
    expect(linha.y + linha.height).toBeLessThanOrEqual(proxima.y + 0.5);
  } finally {
    await contexto.close();
  }
});

test("a aba continua fiel à referência (sobreposição medida pelo script de fidelidade)", async () => {
  test.setTimeout(180_000);
  const codigo = await new Promise((resolver, rejeitar) => {
    const processo = spawn(process.execPath, [path.join(aqui, "fidelidade-personalidade.mjs")], {
      env: { ...process.env, E2E_APP_URL: APP }, stdio: ["ignore", "ignore", "inherit"],
    });
    processo.once("error", rejeitar);
    processo.once("exit", resolver);
  });
  expect(codigo, "âncoras fora da tolerância: ver .screenshots/personalidade/fidelidade/relatorio.md").toBe(0);
});
