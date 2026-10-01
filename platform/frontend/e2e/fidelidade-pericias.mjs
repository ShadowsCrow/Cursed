/* global document, Image */
/**
 * Fidelidade da aba Perícias à imagem de referência (redesenhar-aba-pericias, D9).
 *
 *   E2E_APP_URL=http://localhost:5182 node e2e/fidelidade-pericias.mjs [largura...]
 *
 * Abre `/preview/ficha?secao=pericias&pericias=referencia` (as perícias da imagem: Prontidão 3 + 3 e as
 * demais bases dela) e grava em `.screenshots/pericias/`:
 * - `pericias-<largura>.png`: a página inteira, para ver rolagem e empilhamento;
 * - `comparacao-1448.png`: a folha da referência em cima e a da prévia embaixo, na mesma largura;
 * - `sobreposicao-1448.png`: as duas a 50%, para achar desvios de posição.
 * Sem pinturas (`?sem-pinturas`), as imagens de `/arte/pericias/` são recusadas, para conferir o desenho em SVG/CSS.
 */
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "../../..");
const APP = process.env.E2E_APP_URL ?? "http://localhost:5179";
const destino = join(raiz, ".screenshots", "pericias");
const referencia = join(raiz, "openspec", "changes", "redesenhar-aba-pericias", "referencia", "pericias.webp");
/** Folha na referência (1448 × 1086): da borda dourada de cima até o pé da imagem, que corta a folha. */
const FOLHA_NA_REFERENCIA = { x: 8, y: 418, largura: 1432, altura: 668 };
const semPinturas = process.argv.includes("--sem-pinturas");
const larguras = process.argv.slice(2).map(Number).filter(Boolean);

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch();

async function abrir(largura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 1086 }, locale: "pt-BR", reducedMotion: "reduce" });
  if (semPinturas) await contexto.route("**/arte/pericias/**", (rota) => rota.abort());
  // Com FIDELIDADE_SEM_PERSONALIDADE=1, a aba Personalidade vira um módulo vazio: outra sessão pode estar no
  // meio da edição dela, e um erro de compilação ali derruba a ficha inteira. A aba Perícias não depende dela.
  if (process.env.FIDELIDADE_SEM_PERSONALIDADE) {
    await contexto.route("**/sheet/PersonalityPanel.tsx*", (rota) => rota.fulfill({
      contentType: "text/javascript", body: "export function PersonalityPanel() { return null; }",
    }));
  }
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=pericias&pericias=referencia&nome=Lion`);
  const folha = pagina.locator(".pericias-folha");
  await folha.waitFor();
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(500);
  return { contexto, pagina, folha };
}

const sufixo = semPinturas ? "-sem-pinturas" : "";
for (const largura of larguras.length ? larguras : [1448, 1024, 375]) {
  const { contexto, pagina, folha } = await abrir(largura);
  const rola = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await pagina.screenshot({ path: join(destino, `pericias-${largura}${sufixo}.png`), fullPage: true });
  console.log(`${largura}px${rola ? " — ROLAGEM HORIZONTAL" : ""}`);

  if (largura === 1448) {
    // A folha da prévia inteira; a página da prévia a limita a ~1376 px, e a composição a escala até a
    // largura da folha na referência (1432 px), para comparar proporções e posições.
    const caixa = await folha.boundingBox();
    const captura = await pagina.screenshot({ clip: caixa, fullPage: true });
    const ref = await readFile(referencia);
    const composta = await pagina.evaluate(async ({ ref, cap, folhaRef }) => {
      const carregar = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
      const [a, b] = await Promise.all([carregar(ref), carregar(cap)]);
      const { x, y, largura: w, altura: h } = folhaRef;
      const empilhada = document.createElement("canvas");
      empilhada.width = w; empilhada.height = h * 2 + 6;
      const c1 = empilhada.getContext("2d");
      c1.fillStyle = "#c00"; c1.fillRect(0, 0, w, empilhada.height);
      c1.drawImage(a, x, y, w, h, 0, 0, w, h);
      const escala = w / b.width;
      c1.drawImage(b, 0, 0, b.width, h / escala, 0, h + 6, w, h);
      const sobre = document.createElement("canvas");
      sobre.width = w; sobre.height = h;
      const c2 = sobre.getContext("2d");
      c2.drawImage(a, x, y, w, h, 0, 0, w, h);
      c2.globalAlpha = .5;
      c2.drawImage(b, 0, 0, b.width, h / escala, 0, 0, w, h);
      return [empilhada.toDataURL("image/png"), sobre.toDataURL("image/png")];
    }, {
      ref: `data:image/webp;base64,${ref.toString("base64")}`,
      cap: `data:image/png;base64,${captura.toString("base64")}`,
      folhaRef: FOLHA_NA_REFERENCIA,
    });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(destino, `comparacao-1448${sufixo}.png`), Buffer.from(composta[0].split(",")[1], "base64"));
    await writeFile(join(destino, `sobreposicao-1448${sufixo}.png`), Buffer.from(composta[1].split(",")[1], "base64"));
  }
  await contexto.close();
}
await navegador.close();
