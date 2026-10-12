/* global document, Image */
/**
 * Fidelidade do editor de cartas ao conceito aprovado (simplificar-criacao-de-cartas, tarefa 6.4).
 *
 *   E2E_APP_URL=http://localhost:5193 E2E_MESA=<id da mesa> node e2e/fidelidade-editor.mjs [--sem-pinturas] [--celular]
 *
 * Precisa do ambiente local com API (a carta é criada de verdade). Entra como o Narrador de teste (`narrador`),
 * abre "Nova carta" na biblioteca da mesa e refaz a carta do conceito: Item, "Mochila de Viajante", Mochila,
 * a bolsa ampliada em 2 × 3 e a descrição. Grava em `.screenshots/editor/`:
 * - `editor-1536.png`: o diálogo na largura do conceito;
 * - `comparacao.png`: o conceito à esquerda e o editor à direita, no mesmo tamanho;
 * - `sobreposicao.png`: os dois a 50%;
 * - `editor-celular-1.png` e `-2.png` (com `--celular`): o editor em 375 px, no alto e mais abaixo.
 * Sem pinturas (`--sem-pinturas`), as imagens de `/arte/cartas/` são recusadas, para conferir o desenho em CSS.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "../../..");
const APP = process.env.E2E_APP_URL ?? "http://localhost:5193";
const MESA = process.env.E2E_MESA;
if (!MESA) throw new Error("Informe a mesa em E2E_MESA.");
const semPinturas = process.argv.includes("--sem-pinturas");
const celular = process.argv.includes("--celular");
const destino = join(raiz, ".screenshots", "editor");
const conceito = join(raiz, "openspec", "changes", "simplificar-criacao-de-cartas", "referencia", "conceito-editor-mochila.png");

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch();
const sufixo = semPinturas ? "-sem-pinturas" : "";

async function abrirEditor(largura, altura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, locale: "pt-BR", reducedMotion: "reduce" });
  if (semPinturas) await contexto.route("**/arte/cartas/**", (rota) => rota.abort());
  await contexto.addInitScript(() => localStorage.setItem("cursed-dev-identidade", "narrador"));
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}/mesas/${MESA}?painel=cards`);
  await pagina.getByRole("button", { name: "Nova carta" }).click();
  const dialogo = pagina.getByRole("dialog", { name: "Nova carta" });
  await dialogo.waitFor();
  await dialogo.getByRole("radio", { name: "Item" }).check({ force: true });
  await dialogo.getByLabel("Título").fill("Mochila de Viajante");
  await dialogo.getByRole("radio", { name: "Mochila" }).check({ force: true });
  await dialogo.getByLabel("Linhas a mais").fill("2");
  await dialogo.getByLabel("Colunas a mais").fill("3");
  await dialogo.getByLabel("Descrição").fill("Couro curtido e fivelas de latão. Aguenta a estrada e a chuva.");
  await pagina.getByText("Rascunho salvo").waitFor({ timeout: 10_000 });
  await pagina.evaluate(() => document.fonts.ready);
  // Preencher a descrição rola o formulário: a comparação é com o alto dele, como no conceito.
  await pagina.evaluate(() => { document.activeElement?.blur(); document.querySelector(".editor-formulario")?.scrollTo(0, 0); });
  await pagina.waitForTimeout(800);
  return { contexto, pagina, dialogo };
}

const { contexto, pagina, dialogo } = await abrirEditor(1720, 1180);
const captura = await dialogo.screenshot();
await writeFile(join(destino, `editor-1536${sufixo}.png`), captura);
const ref = `data:image/png;base64,${(await readFile(conceito)).toString("base64")}`;
const [juntas, sobre] = await pagina.evaluate(async ({ ref, cap }) => {
  const carregar = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
  const [a, b] = await Promise.all([carregar(ref), carregar(cap)]);
  const W = a.width;
  const H = a.height;
  const lado = document.createElement("canvas");
  lado.width = W * 2 + 12; lado.height = H;
  const c1 = lado.getContext("2d");
  c1.imageSmoothingQuality = "high";
  c1.fillStyle = "#c00"; c1.fillRect(0, 0, lado.width, lado.height);
  c1.drawImage(a, 0, 0, W, H);
  c1.drawImage(b, W + 12, 0, W, H);
  const meio = document.createElement("canvas");
  meio.width = W; meio.height = H;
  const c2 = meio.getContext("2d");
  c2.drawImage(a, 0, 0, W, H);
  c2.globalAlpha = .5;
  c2.drawImage(b, 0, 0, W, H);
  return [lado.toDataURL("image/png"), meio.toDataURL("image/png")];
}, { ref, cap: `data:image/png;base64,${captura.toString("base64")}` });
const salvar = (nome, dados) => writeFile(join(destino, nome), Buffer.from(dados.split(",")[1], "base64"));
await salvar(`comparacao${sufixo}.png`, juntas);
await salvar(`sobreposicao${sufixo}.png`, sobre);
await contexto.close();

if (celular) {
  const telefone = await abrirEditor(375, 812);
  // No celular o corpo do diálogo rola: uma captura no alto e outra mais abaixo.
  await telefone.pagina.screenshot({ path: join(destino, `editor-celular-1${sufixo}.png`) });
  await telefone.pagina.evaluate(() => document.querySelector(".grimorio .dialog__body")?.scrollBy(0, 700));
  await telefone.pagina.screenshot({ path: join(destino, `editor-celular-2${sufixo}.png`) });
  await telefone.contexto.close();
}
await navegador.close();
console.log(`Capturas em ${destino}`);
