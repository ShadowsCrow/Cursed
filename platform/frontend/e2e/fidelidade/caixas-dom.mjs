/* global document */
/**
 * Depuração da fidelidade (reformular-personalidade-da-ficha): lista as caixas do DOM das âncoras do gabarito,
 * relativas à folha, com a folha na largura da referência. Serve para acertar posições quando a tinta de uma
 * peça cai fora da região de busca e a medida do relatório fica parcial.
 *
 *   E2E_APP_URL=http://localhost:5183 node e2e/fidelidade/caixas-dom.mjs [seletor extra ...]
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const aqui = dirname(fileURLToPath(import.meta.url));
const gabarito = JSON.parse(await readFile(join(aqui, "..", "fixtures", "referencias", "personalidade", "caixas.json"), "utf8"));
const APP = process.env.E2E_APP_URL ?? "http://localhost:5179";
const extras = process.argv.slice(2);

const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage({ viewport: { width: 1156, height: 1600 }, deviceScaleFactor: 1 });
  await pagina.goto(`${APP}/preview/ficha?secao=personalidade`);
  await pagina.locator(".folha-personalidade").waitFor();
  const largura = () => pagina.evaluate(() => document.querySelector(".folha-personalidade").getBoundingClientRect().width);
  let janela = 1156;
  for (let i = 0; i < 6 && Math.abs((await largura()) - gabarito.largura_da_folha) > 0.5; i++) {
    janela += Math.round(gabarito.largura_da_folha - (await largura()));
    await pagina.setViewportSize({ width: janela, height: 1600 });
  }
  await pagina.evaluate(() => document.fonts.ready);
  const linhas = await pagina.evaluate(({ ancoras, extras }) => {
    const folha = document.querySelector(".folha-personalidade").getBoundingClientRect();
    const rel = (r) => [r.x - folha.x, r.y - folha.y, r.width, r.height].map((v) => Math.round(v));
    const saida = [];
    for (const { nome, seletor, indice = 0, dentro, caixa, caixa_manual: manual } of ancoras) {
      let alvo = [...document.querySelectorAll(seletor)].at(indice) ?? null;
      if (alvo && dentro) alvo = alvo.querySelector(dentro);
      saida.push(`${nome.padEnd(22)} dom ${alvo ? rel(alvo.getBoundingClientRect()).join(", ").padEnd(22) : "ausente".padEnd(22)} ref ${(caixa ?? manual).join(", ")}`);
    }
    for (const seletor of extras) {
      for (const el of document.querySelectorAll(seletor)) saida.push(`${seletor.padEnd(22)} dom ${rel(el.getBoundingClientRect()).join(", ")}`);
    }
    return saida;
  }, { ancoras: gabarito.ancoras, extras });
  console.log(`Janela ${janela}, folha ${await largura()} px`);
  console.log(linhas.join("\n"));
} finally {
  await navegador.close();
}
