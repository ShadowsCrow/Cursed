import { createServer } from "vite";
import { chromium } from "@playwright/test";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const inicio = Date.now();
  await page.goto(`${server.resolvedUrls.local[0]}bench-room.html`);
  const canvas = page.locator(".room-canvas__surface canvas");
  await canvas.waitFor();
  await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
  const dimensoes = await canvas.evaluate((elemento) => ({ largura: elemento.width, altura: elemento.height }));
  if (dimensoes.largura < 600 || dimensoes.altura < 300) throw new Error("Canvas sem área útil.");
  const tempo = Date.now() - inicio;
  if (errors.length) throw new Error(errors.join("\n"));
  if (tempo > 5000) throw new Error(`Cena com 300 tokens demorou ${tempo} ms.`);
  console.log(`Cena com 300 tokens: ${tempo} ms até a renderização inicial.`);
  await page.getByRole("button", { name: "Ampliar mapa" }).click();
  if (!(await page.getByText("120%").isVisible())) throw new Error("Zoom não respondeu.");
  const antes = await canvas.screenshot();
  const area = await canvas.boundingBox();
  await page.mouse.move(area.x + 180, area.y + 180);
  await page.mouse.down();
  await page.mouse.move(area.x + 300, area.y + 240, { steps: 5 });
  await page.mouse.up();
  const depois = await canvas.screenshot();
  if (antes.equals(depois)) throw new Error("Deslocamento do mapa não alterou o canvas.");
  await page.getByRole("button", { name: "Centralizar" }).click();
  await page.mouse.move(0, 700);
  await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
  const confirmado = await canvas.screenshot();
  await page.mouse.move(area.x + 24, area.y + 24);
  await page.mouse.down();
  await page.mouse.move(area.x + 120, area.y + 72, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  const contadores = await page.evaluate(() => globalThis.__benchRoom);
  if (!contadores.arrastes || !contadores.cancelamentos || contadores.conclusoes) {
    throw new Error("Prévia de arraste não foi cancelada corretamente.");
  }
  await page.mouse.move(0, 700);
  await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
  if (!confirmado.equals(await canvas.screenshot())) throw new Error("Arraste cancelado alterou o grid confirmado.");
} finally {
  await browser.close();
  await server.close();
}
