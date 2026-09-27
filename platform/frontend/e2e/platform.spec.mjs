/* global window, document, innerWidth */
import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

import { chamar, semear } from "./screenshots.mjs";

const APP = process.env.E2E_APP_URL;
const AXE = resolve("node_modules/axe-core/axe.min.js");

async function verificarAxe(pagina, superficie) {
  await pagina.addScriptTag({ path: AXE });
  const resultado = await pagina.evaluate(async () => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
  }));
  expect(resultado.violations.map((item) => ({ superficie, regra: item.id, impacto: item.impact,
    elementos: item.nodes.map((node) => node.target) }))).toEqual([]);
}

async function abrir(browser, usuario, rota, opcoes = {}) {
  const contexto = await browser.newContext(opcoes);
  await contexto.addInitScript((id) => localStorage.setItem("cursed-dev-identidade", id), usuario);
  const pagina = await contexto.newPage();
  await pagina.goto(`${APP}${rota}`);
  return { contexto, pagina };
}

test("mesa, ficha, auditoria e segredos em contextos separados", async ({ browser }) => {
  const { m, lia } = await semear();
  const narrador = await abrir(browser, "narrador", `/mesas/${m}?painel=character`);
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}?painel=character`, { hasTouch: true });
  try {
    await expect(narrador.pagina.getByRole("heading", { name: "O elenco da mesa" })).toBeVisible();
    await expect(jogador.pagina.getByRole("heading", { name: "Seu personagem em foco" })).toBeVisible();
    await expect(narrador.pagina.getByText("Rainha Velada")).toBeVisible();
    await expect(jogador.pagina.getByText("Rainha Velada")).toHaveCount(0);
    await jogador.pagina.goto(`${APP}/mesas/${m}/personagens/${lia}`);
    await expect(jogador.pagina.getByRole("heading", { name: "Lia Andarilha" })).toBeVisible();
    await jogador.pagina.getByRole("tab", { name: "Efeitos" }).click();
    await expect(jogador.pagina.getByRole("tabpanel", { name: "Efeitos" }).getByRole("button", { name: "Envenenado", exact: true })).toBeVisible();
    await verificarAxe(jogador.pagina, "ficha");
    await jogador.pagina.setViewportSize({ width: 320, height: 700 });
    expect(await jogador.pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await jogador.pagina.getByRole("tabpanel", { name: "Efeitos" }).getByRole("button", { name: "Envenenado", exact: true }).tap();
    await expect(jogador.pagina.getByText("Picada da aranha")).toBeVisible();
    await narrador.pagina.goto(`${APP}/mesas/${m}?painel=activity`);
    await expect(narrador.pagina.getByRole("heading", { name: "História das mudanças" })).toBeVisible();
    const descanso = narrador.pagina.getByRole("button", { name: "Preparar descanso" }).locator("visible=true").first();
    await descanso.click();
    await expect(narrador.pagina.getByRole("dialog", { name: "Preparar descanso" })).toBeVisible();
    await verificarAxe(narrador.pagina, "diálogo de descanso");
    expect(await narrador.pagina.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);
    await narrador.pagina.keyboard.press("Escape");
    await expect(narrador.pagina.getByRole("dialog", { name: "Preparar descanso" })).toHaveCount(0);
    await expect(descanso).toBeFocused();
    const segredo = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${lia}/ficha`);
    expect(segredo.ficha.personagem.nome).toBe("Lia Andarilha");
    const respostaOculta = await fetch(`${process.env.E2E_API_URL}/mesas/${m}/entidades`, {
      headers: { Authorization: "Bearer dev:jogador-1" },
    });
    expect(JSON.stringify(await respostaOculta.json())).not.toContain("Rainha Velada");
  } finally {
    await narrador.contexto.close();
    await jogador.contexto.close();
  }
});

test("oferta de cartas exige escolha confirmada pelo jogador", async ({ browser }) => {
  const { m } = await semear();
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}?painel=cards`);
  try {
    await expect(jogador.pagina.getByRole("heading", { name: "Suas cartas" })).toBeVisible();
    await jogador.pagina.getByRole("button", { name: "Escolher cartas" }).first().click();
    await expect(jogador.pagina.getByText("Escolhidas 0 de 2")).toBeVisible();
    await verificarAxe(jogador.pagina, "oferta de cartas");
    await jogador.pagina.getByRole("button", { name: /Bola de Fogo/ }).focus();
    await jogador.pagina.keyboard.press("Enter");
    await jogador.pagina.getByRole("button", { name: /Passo Nebuloso/ }).focus();
    await jogador.pagina.keyboard.press("Space");
    await expect(jogador.pagina.getByText("Escolhidas 2 de 2")).toBeVisible();
    await jogador.pagina.getByRole("button", { name: "Confirmar escolha" }).click();
    await jogador.pagina.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(jogador.pagina.getByText("Nenhuma oferta aguardando sua escolha.")).toBeVisible();
  } finally {
    await jogador.contexto.close();
  }
});

test("sala recupera snapshot após desconexão sem revelar token oculto", async ({ browser }) => {
  const { m } = await semear();
  await chamar("narrador", "PUT", `/mesas/${m}/modulos`, { sala: true });
  const cena = (await chamar("narrador", "POST", `/mesas/${m}/sala/cenas`, {
    nome: "Ponte", colunas: 20, linhas: 15,
  })).cena;
  if (!cena.ativa) await chamar("narrador", "POST", `/mesas/${m}/sala/cenas/${cena.id}/ativacao`);
  const camada = cena.camadas.find((item) => item.visibilidade === "mesa");
  const visivel = await chamar("narrador", "POST", `/mesas/${m}/sala/cenas/${cena.id}/tokens`, {
    camada_id: camada.id, rotulo: "Sentinela", x: 1, y: 2, tamanho: 1, oculto: false,
  });
  await chamar("narrador", "POST", `/mesas/${m}/sala/cenas/${cena.id}/tokens`, {
    camada_id: camada.id, rotulo: "Espião", x: 5, y: 5, tamanho: 1, oculto: true,
  });
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}?painel=room`);
  const narrador = await abrir(browser, "narrador", `/mesas/${m}?painel=room`);
  try {
    await expect(jogador.pagina.getByRole("heading", { name: "Cena compartilhada" })).toBeVisible();
    await expect(jogador.pagina.getByRole("button", { name: "Sentinela (1, 2)" })).toBeVisible();
    await expect(jogador.pagina.getByText("Espião")).toHaveCount(0);
    await expect(narrador.pagina.getByRole("button", { name: "Espião (5, 5)" })).toBeVisible();
    await verificarAxe(jogador.pagina, "grid");
    await narrador.pagina.getByRole("button", { name: "Espião (5, 5)" }).focus();
    await narrador.pagina.keyboard.press("Enter");
    await narrador.pagina.getByLabel("Coluna de destino").fill("6");
    await narrador.pagina.getByLabel("Linha de destino").fill("6");
    await narrador.pagina.getByRole("button", { name: "Confirmar movimento" }).click();
    await expect(narrador.pagina.getByRole("button", { name: "Espião (6, 6)" })).toBeVisible();
    await jogador.contexto.setOffline(true);
    await chamar("narrador", "POST", `/mesas/${m}/sala/tokens/${visivel.id}/movimento`, {
      x: 3, y: 4, versao_esperada: visivel.versao,
    });
    await jogador.contexto.setOffline(false);
    await jogador.pagina.reload();
    await expect(jogador.pagina.getByRole("button", { name: "Sentinela (3, 4)" })).toBeVisible();
    await expect(jogador.pagina.getByText("Espião")).toHaveCount(0);
  } finally {
    await jogador.contexto.close();
    await narrador.contexto.close();
  }
});

test("inventário em grade: colocar, girar e equipar", async ({ browser }) => {
  const { m, lia } = await semear();
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}/personagens/${lia}?secao=inventario`);
  try {
    const painel = jogador.pagina.getByRole("tabpanel", { name: "Inventário" });
    const grade = painel.getByRole("region", { name: "Inventário em grade" });
    await expect(grade).toBeVisible();
    await grade.getByRole("region", { name: "Fora da grade" }).getByRole("button", { name: /Lâmina Rúnica/ }).click();
    await grade.locator(".grade-inventario__celula").nth(0).click();
    const lamina = grade.getByRole("button", { name: /^Lâmina Rúnica, arma de uma mão, 1 por 3, coluna 1, linha 1/ });
    await expect(lamina).toBeVisible();
    await expect(lamina).toHaveAttribute("aria-pressed", "true");
    await grade.getByRole("button", { name: "Girar" }).click();
    await expect(grade.getByRole("button", { name: /^Lâmina Rúnica, arma de uma mão, 3 por 1, coluna 1, linha 1/ })).toBeVisible();
    await grade.getByRole("button", { name: "Equipar" }).click();
    await expect(grade.getByRole("button", { name: /^Lâmina Rúnica.*, equipado/ })).toBeVisible();
    await verificarAxe(jogador.pagina, "inventário em grade");
    await expect.poll(async () => {
      const servidor = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${lia}/inventario/grade`);
      const item = servidor.itens.find((i) => i.nome === "Lâmina Rúnica");
      return item && [item.coluna, item.linha, item.girado, item.equipado];
    }, { timeout: 5000 }).toEqual([0, 0, true, true]);
  } finally {
    await jogador.contexto.close();
  }
});

test("corpos padrão: o Narrador concede e o jogador carrega o que cabe", async ({ browser }) => {
  const { m, lia } = await semear();
  const narrador = await abrir(browser, "narrador", `/mesas/${m}/personagens/${lia}?secao=cartas`);
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}/personagens/${lia}?secao=inventario`);
  async function conceder(opcao) {
    await narrador.pagina.getByRole("button", { name: "Conceder carta" }).click();
    const dialogo = narrador.pagina.getByRole("dialog", { name: "Conceder carta" });
    await dialogo.getByLabel("Carta publicada").selectOption({ label: opcao });
    await dialogo.getByRole("button", { name: "Conceder" }).click();
    await expect(dialogo).toBeHidden();
  }
  try {
    await conceder("Corpo Médio (Item, v1)");
    await jogador.pagina.reload();
    const grade = jogador.pagina.getByRole("region", { name: "Inventário em grade" });
    const fora = grade.getByRole("region", { name: "Fora da grade" });
    // Lia é Média com Força 1: 4 colunas e 3 linhas, mais a linha vermelha. O corpo inteiro (4 x 5) não cabe.
    await fora.getByRole("button", { name: "Corpo Médio (4 x 5)" }).click();
    await grade.locator(".grade-inventario__celula").nth(0).click();
    await expect(grade.getByText(/Não dá para soltar Corpo Médio aí: fica fora da grade/)).toBeVisible();
    await conceder("Corpo Médio (com ajuda) (Item, v1)");
    await jogador.pagina.reload();
    await grade.getByRole("region", { name: "Fora da grade" }).getByRole("button", { name: "Corpo Médio (com ajuda) (4 x 3)" }).click();
    await grade.locator(".grade-inventario__celula").nth(0).click();
    await expect(grade.getByRole("button", { name: /^Corpo Médio \(com ajuda\), item, 4 por 3, coluna 1, linha 1/ })).toBeVisible();
    await expect.poll(async () => {
      const servidor = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${lia}/inventario/grade`);
      const corpo = servidor.itens.find((i) => i.nome === "Corpo Médio (com ajuda)");
      return corpo && [corpo.coluna, corpo.linha, servidor.celulas_ocupadas];
    }, { timeout: 5000 }).toEqual([0, 0, 12]);
  } finally {
    await narrador.contexto.close();
    await jogador.contexto.close();
  }
});

test("troca de retrato pelo jogador aparece no cabeçalho da ficha", async ({ browser }) => {
  const { m, lia } = await semear();
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}/personagens/${lia}`);
  try {
    await expect(jogador.pagina.getByRole("heading", { name: "Lia Andarilha" })).toBeVisible();
    // PNG 1 x 1 válido; o servidor confere o conteúdo, não a extensão.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await jogador.pagina.getByTestId("upload-retrato").setInputFiles({ name: "retrato.png", mimeType: "image/png", buffer: png });
    await expect(jogador.pagina.getByRole("status").filter({ hasText: "Imagem de retrato atualizada." })).toBeVisible();
    const retrato = jogador.pagina.getByRole("img", { name: "Retrato de Lia Andarilha" });
    await expect(retrato).toBeVisible();
    await expect(retrato).toHaveAttribute("src", /^data:image\/webp;base64,/);
    await expect(jogador.pagina.getByRole("button", { name: "Trocar retrato" })).toBeVisible();
    const falso = Buffer.from("isto nao e uma imagem");
    await jogador.pagina.getByTestId("upload-retrato").setInputFiles({ name: "falso.png", mimeType: "image/png", buffer: falso });
    await expect(jogador.pagina.getByRole("alert").filter({ hasText: "PNG, JPEG ou WEBP" })).toBeVisible();
    const registro = await chamar("narrador", "GET", `/mesas/${m}/auditoria`);
    expect(registro.eventos.some((e) => e.resumo === "Lia Andarilha: retrato alterado")).toBe(true);
  } finally {
    await jogador.contexto.close();
  }
});
