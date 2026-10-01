/* global document, window, Image */
/**
 * Fidelidade da aba Personalidade à imagem de referência (reformular-personalidade-da-ficha, D0).
 *
 *   node e2e/fidelidade-personalidade.mjs medir            # mede a referência e grava as caixas no gabarito
 *   node e2e/fidelidade-personalidade.mjs medir --conferir # só confere (desvio ≤ 2 px), sem gravar
 *   E2E_APP_URL=http://localhost:5179 node e2e/fidelidade-personalidade.mjs
 *                                                          # compara a prévia com a referência
 *
 * A comparação abre `/preview/ficha?secao=personalidade`, acha a largura de janela em que a folha mede o mesmo
 * que na referência, fotografa a folha e mede cada âncora pela caixa de tinta (`fidelidade/tinta.mjs`). Grava em
 * `.screenshots/personalidade/fidelidade/` o lado a lado, a sobreposição, a diferença e `relatorio.md`, e sai com
 * erro se alguma âncora passar da tolerância.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

import { comparar, comporNaPagina, medirNaPagina, TOLERANCIAS } from "./fidelidade/tinta.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const pastaGabarito = join(aqui, "fixtures", "referencias", "personalidade");
const arquivoGabarito = join(pastaGabarito, "caixas.json");
const destino = resolve(aqui, "../../../.screenshots/personalidade/fidelidade");
const APP = process.env.E2E_APP_URL ?? "http://localhost:5179";
const CONSULTA = process.env.FIDELIDADE_CONSULTA ?? "secao=personalidade";
/** Margem em volta da folha na captura: os cantos de filigrana avançam para fora dela. */
const MARGEM = 24;

const dataUrl = (buffer, tipo) => `data:${tipo};base64,${buffer.toString("base64")}`;
const arred = (caixa) => caixa.map((v) => Math.round(v));

async function lerGabarito() {
  const gabarito = JSON.parse(await readFile(arquivoGabarito, "utf8"));
  const imagem = dataUrl(await readFile(join(pastaGabarito, gabarito.referencia)), "image/webp");
  return { gabarito, imagem };
}

/** Mede a referência inteira; as caixas ficam relativas ao canto da folha. */
async function medirReferencia(pagina, gabarito, imagem) {
  const medidas = await pagina.evaluate(medirNaPagina, {
    imagem,
    ancoras: gabarito.ancoras.filter((a) => a.regiao).map(({ nome, modo, limiar, minimo, regiao }) => ({ nome, modo, limiar, minimo, regiao })),
  });
  const folha = medidas.folha;
  if (!folha) throw new Error("A folha não foi encontrada na referência.");
  const relativas = {};
  for (const [nome, caixa] of Object.entries(medidas)) {
    relativas[nome] = caixa && [caixa[0] - folha[0], caixa[1] - folha[1], caixa[2], caixa[3]];
  }
  return { folha, relativas };
}

async function modoMedir(conferir) {
  const { gabarito, imagem } = await lerGabarito();
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    const { folha, relativas } = await medirReferencia(pagina, gabarito, imagem);
    const problemas = [];
    for (const ancora of gabarito.ancoras) {
      if (!ancora.regiao) continue;
      const medida = relativas[ancora.nome];
      if (!medida) { problemas.push(`${ancora.nome}: nenhuma tinta na região`); continue; }
      if (conferir) {
        const desvio = Math.max(...medida.map((v, i) => Math.abs(v - ancora.caixa[i])));
        if (desvio > 2) problemas.push(`${ancora.nome}: desvio de ${desvio} px (gravada ${ancora.caixa}, medida ${medida})`);
      } else {
        ancora.caixa = medida;
      }
    }
    if (!conferir) {
      gabarito.origem_na_referencia = folha.slice(0, 2);
      await writeFile(arquivoGabarito, `${JSON.stringify(gabarito, null, 2)}\n`);
    }
    // Conferência a olho: as regiões de busca (azul) e as caixas medidas (vermelho) sobre a referência.
    const desenho = await pagina.evaluate(async ({ imagem, ancoras, folha }) => {
      const img = new Image();
      img.src = imagem;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth * 2;
      c.height = img.naturalHeight * 2;
      const ctx = c.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = 0.5;
      for (const { regiao, caixa, caixa_manual: manual } of ancoras) {
        if (regiao) { ctx.strokeStyle = "#1e6bff"; ctx.strokeRect(regiao[0], regiao[1], regiao[2] - regiao[0], regiao[3] - regiao[1]); }
        const cx = caixa ?? manual;
        if (cx) { ctx.strokeStyle = "#ff1e1e"; ctx.strokeRect(folha[0] + cx[0], folha[1] + cx[1], cx[2], cx[3]); }
      }
      return c.toDataURL("image/png");
    }, { imagem, ancoras: gabarito.ancoras, folha });
    await mkdir(destino, { recursive: true });
    await writeFile(join(destino, "gabarito.png"), Buffer.from(desenho.split(",")[1], "base64"));
    console.log(`Folha na referência: x ${folha[0]}, y ${folha[1]}, ${folha[2]} × ${folha[3]} px`);
    for (const ancora of gabarito.ancoras) {
      console.log(`${ancora.nome.padEnd(22)} ${JSON.stringify(ancora.caixa ?? ancora.caixa_manual)}`);
    }
    if (problemas.length) {
      console.error(problemas.join("\n"));
      process.exitCode = 1;
    } else if (conferir) {
      console.log("Gabarito conferido: todas as caixas a até 2 px da referência.");
    }
  } finally {
    await navegador.close();
  }
}

/** Largura de janela em que a folha mede `alvo` px (busca binária; a folha acompanha a largura da aba). */
async function ajustarLargura(pagina, alvo, seletorFolha) {
  const larguraDaFolha = () => pagina.evaluate((s) => document.querySelector(s)?.getBoundingClientRect().width ?? 0, seletorFolha);
  let baixo = 360;
  let alto = 2600;
  let melhor = null;
  for (let passo = 0; passo < 16; passo++) {
    const meio = Math.round((baixo + alto) / 2);
    await pagina.setViewportSize({ width: meio, height: 1600 });
    const largura = await larguraDaFolha();
    if (!melhor || Math.abs(largura - alvo) < Math.abs(melhor.largura - alvo)) melhor = { janela: meio, largura };
    if (Math.abs(largura - alvo) < 0.5) break;
    if (largura < alvo) baixo = meio + 1; else alto = meio - 1;
    if (baixo > alto) break;
  }
  await pagina.setViewportSize({ width: melhor.janela, height: 1600 });
  return melhor;
}

async function modoComparar() {
  const { gabarito, imagem } = await lerGabarito();
  await mkdir(destino, { recursive: true });
  const navegador = await chromium.launch();
  const linhas = [];
  let falhas = 0;
  try {
    const contexto = await navegador.newContext({ viewport: { width: 1280, height: 1600 }, locale: "pt-BR", reducedMotion: "reduce", deviceScaleFactor: 1 });
    const pagina = await contexto.newPage();
    await pagina.goto(`${APP}/preview/ficha?${CONSULTA}`);
    await pagina.getByRole("tabpanel").first().waitFor();
    // Sem a folha nova (a aba de antes), compara a moldura que estiver no painel: tudo sai como ausente.
    const seletorFolha = (await pagina.locator(".folha-personalidade").count()) ? ".folha-personalidade" : "#painel-personalidade > :first-child";
    const { janela, largura } = await ajustarLargura(pagina, gabarito.largura_da_folha, seletorFolha);
    // Só as imagens da folha: as das abas escondidas são "lazy" e nunca terminam de carregar.
    await pagina.evaluate(async (s) => {
      await document.fonts.ready;
      const imagens = [...document.querySelector(s).querySelectorAll("img")].filter((i) => !i.complete);
      const limite = new Promise((fim) => window.setTimeout(fim, 5000));
      await Promise.race([Promise.all(imagens.map((i) => i.decode().catch(() => null))), limite]);
      await new Promise((fim) => window.requestAnimationFrame(() => window.requestAnimationFrame(fim)));
    }, seletorFolha);

    const folhaDom = await pagina.locator(seletorFolha).boundingBox();
    const recorte = {
      x: Math.max(0, folhaDom.x - MARGEM),
      y: Math.max(0, folhaDom.y + (await pagina.evaluate(() => window.scrollY)) - MARGEM),
      width: folhaDom.width + MARGEM * 2,
      height: folhaDom.height + MARGEM * 2,
    };
    const captura = await pagina.screenshot({ clip: recorte, fullPage: true });

    // A folha da tela, medida pela mesma tinta da referência, dá a origem das caixas.
    const medidor = await navegador.newPage();
    const refFolha = gabarito.ancoras.find((a) => a.nome === "folha");
    const origemRef = gabarito.origem_na_referencia;
    const regiaoNaCaptura = (regiao) => [
      regiao[0] - origemRef[0] + MARGEM, regiao[1] - origemRef[1] + MARGEM,
      regiao[2] - origemRef[0] + MARGEM, regiao[3] - origemRef[1] + MARGEM,
    ];
    const imagemTela = dataUrl(captura, "image/png");
    const { folha: folhaTela } = await medidor.evaluate(medirNaPagina, {
      imagem: imagemTela,
      ancoras: [{ nome: "folha", modo: refFolha.modo, limiar: refFolha.limiar, minimo: refFolha.minimo, regiao: [0, 0, recorte.width, recorte.height] }],
    });
    if (!folhaTela) throw new Error("A folha não foi encontrada na captura.");
    // As regiões de busca acompanham a folha da tela (a origem medida, e não a suposta).
    const ajusteX = folhaTela[0] - MARGEM;
    const ajusteY = folhaTela[1] - MARGEM;
    const tintas = await medidor.evaluate(medirNaPagina, {
      imagem: imagemTela,
      ancoras: gabarito.ancoras.filter((a) => a.regiao && a.nome !== "folha").map(({ nome, modo, limiar, minimo, regiao }) => {
        const r = regiaoNaCaptura(regiao);
        return { nome, modo, limiar, minimo, regiao: [r[0] + ajusteX, r[1] + ajusteY, r[2] + ajusteX, r[3] + ajusteY] };
      }),
    });

    // Elementos: existência de cada âncora e caixa das áreas (pinturas), relativas ao canto da folha.
    const elementos = await pagina.evaluate(({ ancoras, seletorFolha }) => {
      const folha = document.querySelector(seletorFolha).getBoundingClientRect();
      const saida = {};
      for (const { nome, seletor, indice = 0, dentro } of ancoras) {
        const lista = [...document.querySelectorAll(seletor)];
        let alvo = lista.at(indice) ?? null;
        if (alvo && dentro) alvo = alvo.querySelector(dentro);
        if (!alvo) { saida[nome] = null; continue; }
        const r = alvo.getBoundingClientRect();
        saida[nome] = [r.x - folha.x, r.y - folha.y, r.width, r.height];
      }
      return saida;
    }, { ancoras: gabarito.ancoras.map(({ nome, seletor, indice, dentro }) => ({ nome, seletor, indice, dentro })), seletorFolha });

    // Imagens de comparação: a referência recortada no mesmo enquadramento da captura.
    const [rx, ry, rw, rh] = refFolha.caixa;
    const escala = folhaTela[2] / rw;
    const recorteRef = await medidor.evaluate(async ({ imagem, x, y, largura, altura, escala }) => {
      const img = new Image();
      img.src = imagem;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = largura;
      c.height = altura;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#050d14";
      ctx.fillRect(0, 0, largura, altura);
      ctx.drawImage(img, x, y, largura / escala, altura / escala, 0, 0, largura, altura);
      return c.toDataURL("image/png");
    }, {
      imagem, escala,
      x: origemRef[0] + rx - folhaTela[0] / escala, y: origemRef[1] + ry - folhaTela[1] / escala,
      largura: Math.round(recorte.width), altura: Math.round(Math.max(recorte.height, (rh + MARGEM * 2) * escala)),
    });
    const imagens = await medidor.evaluate(comporNaPagina, { referencia: recorteRef, tela: imagemTela });
    for (const [nome, conteudo] of [["lado-a-lado", imagens.ladoALado], ["sobreposicao", imagens.sobreposicao], ["diferenca", imagens.diferenca]]) {
      await writeFile(join(destino, `${nome}.png`), Buffer.from(conteudo.split(",")[1], "base64"));
    }
    await writeFile(join(destino, "tela.png"), captura);

    // Relatório.
    linhas.push("# Fidelidade da aba Personalidade", "",
      `Janela de ${janela} px; folha com ${largura.toFixed(1)} px na tela e ${gabarito.largura_da_folha} px na referência.`,
      `Folha medida pela tinta: ${arred(folhaTela).join(" × ")} (referência: ${refFolha.caixa.join(" × ")}).`, "",
      "Tolerâncias: " + Object.entries(TOLERANCIAS).map(([t, v]) => `${t} ±${v.posicao} px e ${Math.round(v.tamanho * 100)}%`).join("; ") + ".", "",
      "| Âncora | Tipo | Esperada (x, y, l, a) | Medida | Δx | Δy | Δl | Δa | |", "|---|---|---|---|---|---|---|---|---|");
    for (const ancora of gabarito.ancoras) {
      const esperada = ancora.caixa ?? ancora.caixa_manual;
      let medida;
      if (ancora.nome === "folha") medida = [0, 0, folhaTela[2], folhaTela[3]];
      else if (ancora.tipo === "area") medida = elementos[ancora.nome];
      else medida = tintas[ancora.nome] && [tintas[ancora.nome][0] - folhaTela[0], tintas[ancora.nome][1] - folhaTela[1], tintas[ancora.nome][2], tintas[ancora.nome][3]];
      const ausente = !elementos[ancora.nome];
      if (!medida || ausente) {
        falhas++;
        linhas.push(`| ${ancora.nome} | ${ancora.tipo} | ${esperada.join(", ")} | ${ausente ? "elemento ausente" : "sem tinta"} | | | | | ✗ |`);
        continue;
      }
      const r = comparar(esperada, medida, ancora.tipo, ancora.tolerancia);
      if (!r.ok) falhas++;
      const pct = (v) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
      linhas.push(`| ${ancora.nome} | ${ancora.tipo} | ${esperada.join(", ")} | ${arred(medida).join(", ")} | ${Math.round(r.dx)} | ${Math.round(r.dy)} | ${pct(r.dw)} | ${pct(r.dh)} | ${r.ok ? "✓" : "✗"}${ancora.tolerancia ? " (tolerância própria)" : ""} |`);
    }
    linhas.push("", falhas ? `**${falhas} âncora(s) fora da tolerância.**` : "**Todas as âncoras dentro da tolerância.**", "");
    await writeFile(join(destino, "relatorio.md"), linhas.join("\n"));
    await contexto.close();
  } finally {
    await navegador.close();
  }
  console.log(linhas.join("\n"));
  console.log(`Imagens em ${destino}`);
  if (falhas) process.exitCode = 1;
}

const [modo, ...opcoes] = process.argv.slice(2);
if (modo === "medir") await modoMedir(opcoes.includes("--conferir"));
else await modoComparar();
