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
    await expect(jogador.pagina.getByRole("tabpanel", { name: "Efeitos" }).getByRole("button", { name: "Envenenado" })).toBeVisible();
    await verificarAxe(jogador.pagina, "ficha");
    await jogador.pagina.setViewportSize({ width: 320, height: 700 });
    expect(await jogador.pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await jogador.pagina.getByRole("tabpanel", { name: "Efeitos" }).getByRole("button", { name: "Envenenado" }).tap();
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
