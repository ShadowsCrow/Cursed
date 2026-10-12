/* global document */
/**
 * Capturas da prova visual da ficha (reformular-visual-da-ficha, 5A.1): a matriz de grades por largura,
 * mais o cabeçalho sem a pintura de fundo e as abas Atributos e Perícias com a moldura nova.
 *
 *   E2E_APP_URL=http://localhost:5179 node e2e/capturas-ficha.mjs
 *
 * As imagens vão para `.screenshots/visual-da-ficha/` na raiz do repositório.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const APP = process.env.E2E_APP_URL ?? "http://localhost:5179";
const destino = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.screenshots/visual-da-ficha");

const GRADES = [
  ["minusculo-f1", "tamanho=minusculo&forca=1"],
  ["medio-f3", "tamanho=medio&forca=3"],
  ["grande-mochila", "tamanho=grande&forca=3&mochila=1"],
  ["colossal-f5-mochila", "tamanho=colossal&forca=5&mochila=1"],
];
const LARGURAS = [1440, 1280, 768, 375];

async function capturar(navegador, nome, consulta, largura, { bloquearArte = false, selecionar = null } = {}) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 900 }, locale: "pt-BR", reducedMotion: "reduce" });
  if (bloquearArte) await contexto.route("**/arte/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?${consulta}`);
  await pagina.getByRole("tabpanel").first().waitFor();
  await pagina.evaluate(() => document.fonts.ready);
  if (selecionar) {
    const item = pagina.getByRole("button", { name: selecionar }).first();
    await item.scrollIntoViewIfNeeded();
    await item.click();
  }
  const rola = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await pagina.screenshot({ path: join(destino, `${nome}.png`), fullPage: true });
  await contexto.close();
  return rola;
}

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch();
const problemas = [];
try {
  for (const [grade, consulta] of GRADES) {
    for (const largura of LARGURAS) {
      const nome = `inventario-${grade}-${largura}`;
      if (await capturar(navegador, nome, `secao=inventario&${consulta}`, largura)) problemas.push(nome);
    }
  }
  const extras = [
    ["inventario-item-selecionado-1440", "secao=inventario", 1440, { selecionar: /^Poção de Vida Menor,/ }],
    ["inventario-item-selecionado-375", "secao=inventario", 375, { selecionar: /^Poção de Vida Menor,/ }],
    ["cabecalho-sem-pintura-1440", "secao=inventario", 1440, { bloquearArte: true }],
    ["cabecalho-360", "secao=atributos", 360, {}],
    ["atributos-1440", "secao=atributos", 1440, {}],
    ["pericias-1440", "secao=pericias", 1440, {}],
    ["leitura-1440", "secao=inventario&papel=leitura", 1440, { selecionar: /^Adaga de Prata,/ }],
    // Informações básicas (redesenhar-informacoes-basicas, 4.2), com e sem as pinturas.
    ["informacoes-1440", "secao=informacoes", 1440, {}],
    ["informacoes-768", "secao=informacoes", 768, {}],
    ["informacoes-375", "secao=informacoes", 375, {}],
    ["informacoes-sem-pintura-1440", "secao=informacoes", 1440, { bloquearArte: true }],
  ];
  for (const [nome, consulta, largura, opcoes] of extras) {
    if (await capturar(navegador, nome, consulta, largura, opcoes)) problemas.push(nome);
  }
} finally {
  await navegador.close();
}
console.log(`Capturas em ${destino}`);
if (problemas.length) {
  console.error(`Rolagem horizontal da página em: ${problemas.join(", ")}`);
  process.exitCode = 1;
}
