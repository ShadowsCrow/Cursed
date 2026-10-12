/* global document */
/**
 * Capturas da aba Atributos (redesenhar-aba-atributos, 5.2) em 1448, 1024 e 375 px, para comparar com a
 * referência do usuário.
 *
 *   E2E_APP_URL=http://localhost:5182 node e2e/capturas-atributos.mjs [largura...]
 *
 * As imagens vão para `.screenshots/atributos/` na raiz do repositório: a página inteira e só a folha.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const APP = process.env.E2E_APP_URL ?? "http://localhost:5179";
const destino = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.screenshots/atributos");
const larguras = process.argv.slice(2).map(Number).filter(Boolean);

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch();
for (const largura of larguras.length ? larguras : [1448, 1024, 375]) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 1090 }, locale: "pt-BR", reducedMotion: "reduce" });
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/preview/ficha?secao=atributos&nome=Lion`);
  const folha = pagina.locator(".atributos-folha");
  await folha.waitFor();
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(400);
  const rola = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await pagina.screenshot({ path: join(destino, `atributos-${largura}.png`), fullPage: true });
  await folha.screenshot({ path: join(destino, `atributos-folha-${largura}.png`) });
  console.log(`${largura}px${rola ? " — ROLAGEM HORIZONTAL" : ""}`);
  await contexto.close();
}
await navegador.close();
