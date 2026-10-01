/* global document, Image */
/**
 * Fidelidade da aba Cartas à imagem de referência (redesenhar-aba-cartas, D11).
 *
 *   E2E_APP_URL=http://localhost:5188 node e2e/fidelidade-cartas.mjs [--sem-pinturas] [largura...]
 *
 * Abre `/preview/ficha?secao=cartas&cartas=imagem&papel=narrador` (as dez habilidades da imagem, vistas pelo
 * Narrador, que vê os quatro custos como na referência) e grava em `.screenshots/cartas/`:
 * - `cartas-<largura>.png`: a página inteira, para ver rolagem e empilhamento;
 * - `comparacao-1448.png`: a folha da referência em cima e a da prévia embaixo, na mesma largura;
 * - `sobreposicao-1448.png`: as duas a 50%;
 * - `carta-lado-a-lado.png` e `carta-sobreposicao.png`: a carta "Segundo round" isolada, ampliada três vezes,
 *   contra a primeira carta da referência. A barra lateral desloca a grade; a carta, não.
 * Sem pinturas (`--sem-pinturas`), as imagens de `/arte/cartas/` são recusadas, para conferir o desenho em SVG/CSS.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "../../..");
const APP = process.env.E2E_APP_URL ?? "http://localhost:5188";
const destino = join(raiz, ".screenshots", "cartas");
const referencia = join(raiz, "openspec", "changes", "redesenhar-aba-cartas", "referencia", "cartas.webp");
/** Folha na referência (1448 × 1086): da borda dourada de cima até o pé da imagem, que corta a folha. */
const FOLHA_NA_REFERENCIA = { x: 8, y: 368, largura: 1432, altura: 718 };
/** Primeira carta da referência, "Segundo round", da linha escura de fora de um lado à do outro. */
const CARTA_NA_REFERENCIA = { x: 37, y: 513, largura: 267, altura: 310 };
const AMPLIACAO = 3;
const semPinturas = process.argv.includes("--sem-pinturas");
const larguras = process.argv.slice(2).map(Number).filter(Boolean);
/** Conceito aprovado do detalhe (grimório), uma captura de tela inteira de 1586 × 992. */
const GRIMORIO = join(raiz, "openspec", "changes", "redesenhar-aba-cartas", "referencia", "detalhe-grimorio.png");

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch();
const ref = `data:image/webp;base64,${(await readFile(referencia)).toString("base64")}`;
const salvar = (nome, dados) => writeFile(join(destino, nome), Buffer.from(dados.split(",")[1], "base64"));

async function abrir(largura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 1086 }, locale: "pt-BR", reducedMotion: "reduce" });
  if (semPinturas) await contexto.route("**/arte/cartas/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=cartas&cartas=imagem&papel=narrador&nome=Lion`);
  const folha = pagina.locator(".cartas-folha");
  await folha.waitFor();
  await pagina.locator(".carta-ficha").first().waitFor();
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(600);
  return { contexto, pagina, folha };
}

/** Compõe a referência e a captura: empilhadas (ou lado a lado) e sobrepostas a 50%. */
async function compor(pagina, captura, recorte, { escalar, ladoALado, ampliar = 1 }) {
  return pagina.evaluate(async ({ ref, cap, recorte, escalar, ladoALado, ampliar }) => {
    const carregar = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
    const [a, b] = await Promise.all([carregar(ref), carregar(cap)]);
    const { x, y, largura: w, altura: h } = recorte;
    // Na folha, a captura é escalada até a largura da referência; na carta, fica na escala 1:1.
    const escala = escalar ? w / b.width : 1;
    const W = w * ampliar;
    const H = h * ampliar;
    const juntas = document.createElement("canvas");
    juntas.width = ladoALado ? W * 2 + 8 : W;
    juntas.height = ladoALado ? H : H * 2 + 8;
    const c1 = juntas.getContext("2d");
    c1.imageSmoothingQuality = "high";
    c1.fillStyle = "#c00"; c1.fillRect(0, 0, juntas.width, juntas.height);
    c1.drawImage(a, x, y, w, h, 0, 0, W, H);
    c1.drawImage(b, 0, 0, w / escala, h / escala, ladoALado ? W + 8 : 0, ladoALado ? 0 : H + 8, W, H);
    const sobre = document.createElement("canvas");
    sobre.width = W; sobre.height = H;
    const c2 = sobre.getContext("2d");
    c2.drawImage(a, x, y, w, h, 0, 0, W, H);
    c2.globalAlpha = .5;
    c2.drawImage(b, 0, 0, w / escala, h / escala, 0, 0, W, H);
    return [juntas.toDataURL("image/png"), sobre.toDataURL("image/png")];
  }, { ref, cap: `data:image/png;base64,${captura.toString("base64")}`, recorte, escalar, ladoALado, ampliar });
}

const sufixo = semPinturas ? "-sem-pinturas" : "";
for (const largura of larguras.length ? larguras : [1448, 1024, 375]) {
  const { contexto, pagina, folha } = await abrir(largura);
  const rola = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await pagina.screenshot({ path: join(destino, `cartas-${largura}${sufixo}.png`), fullPage: true });
  console.log(`${largura}px${rola ? " — ROLAGEM HORIZONTAL" : ""}`);

  if (largura === 1448) {
    const [juntas, sobre] = await compor(pagina, await pagina.screenshot({ clip: await folha.boundingBox(), fullPage: true }),
      FOLHA_NA_REFERENCIA, { escalar: true, ladoALado: false });
    await salvar(`comparacao-1448${sufixo}.png`, juntas);
    await salvar(`sobreposicao-1448${sufixo}.png`, sobre);

    const carta = pagina.getByRole("button", { name: /: Segundo round\./ });
    const caixa = await carta.boundingBox();
    // A linha escura de fora é a borda da carta: o recorte pega a caixa dela, sem a sombra.
    const recorte = { x: caixa.x, y: caixa.y, width: CARTA_NA_REFERENCIA.largura, height: CARTA_NA_REFERENCIA.altura };
    const [lado, sobreCarta] = await compor(pagina, await pagina.screenshot({ clip: recorte, fullPage: true }),
      CARTA_NA_REFERENCIA, { escalar: false, ladoALado: true, ampliar: AMPLIACAO });
    await salvar(`carta-lado-a-lado${sufixo}.png`, lado);
    await salvar(`carta-sobreposicao${sufixo}.png`, sobreCarta);
    console.log(`carta: ${Math.round(caixa.width)} × ${Math.round(caixa.height)} px (referência ${CARTA_NA_REFERENCIA.largura} × ${CARTA_NA_REFERENCIA.altura})`);
  }
  await contexto.close();
}

// O grimório do detalhe, na mesma janela do conceito: lado a lado e sobreposto a 50%.
{
  const contexto = await navegador.newContext({ viewport: { width: 1586, height: 992 }, locale: "pt-BR", reducedMotion: "reduce" });
  if (semPinturas) await contexto.route("**/arte/cartas/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=cartas&cartas=imagem&nome=Lion`);
  await pagina.getByRole("button", { name: /: Segundo round\./ }).click();
  await pagina.getByRole("dialog").waitFor();
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(600);
  const conceito = `data:image/png;base64,${(await readFile(GRIMORIO)).toString("base64")}`;
  const captura = await pagina.screenshot();
  const [lado, sobre] = await pagina.evaluate(async ({ conceito, cap }) => {
    const carregar = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
    const [a, b] = await Promise.all([carregar(conceito), carregar(cap)]);
    const juntas = document.createElement("canvas");
    juntas.width = a.width * 2 + 8; juntas.height = a.height;
    const c1 = juntas.getContext("2d");
    c1.fillStyle = "#c00"; c1.fillRect(0, 0, juntas.width, juntas.height);
    c1.drawImage(a, 0, 0); c1.drawImage(b, a.width + 8, 0, a.width, a.height);
    const sobre = document.createElement("canvas");
    sobre.width = a.width; sobre.height = a.height;
    const c2 = sobre.getContext("2d");
    c2.drawImage(a, 0, 0); c2.globalAlpha = .5; c2.drawImage(b, 0, 0, a.width, a.height);
    return [juntas.toDataURL("image/png"), sobre.toDataURL("image/png")];
  }, { conceito, cap: `data:image/png;base64,${captura.toString("base64")}` });
  await salvar(`grimorio-lado-a-lado${sufixo}.png`, lado);
  await salvar(`grimorio-sobreposicao${sufixo}.png`, sobre);
  await contexto.close();
}
await navegador.close();
