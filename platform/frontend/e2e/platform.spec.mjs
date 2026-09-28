/* global window, document, innerWidth, getComputedStyle */
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
  // O cabeçalho com o retrato aparece fora do Resumo (aba-resumo-da-ficha).
  const jogador = await abrir(browser, "jogador-1", `/mesas/${m}/personagens/${lia}?secao=informacoes`);
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

for (const [tela, viewport] of [["desktop", { width: 1440, height: 900 }], ["celular", { width: 360, height: 800 }]]) {
  test(`Resumo (${tela}): abre a ficha, recebe a ilustração e mostra a História escrita na Personalidade`, async ({ browser }) => {
    const { m, lia } = await semear();
    const jogador = await abrir(browser, "jogador-1", `/mesas/${m}/personagens/${lia}`, { viewport });
    const pagina = jogador.pagina;
    try {
      await expect(pagina.getByRole("tab", { name: "Resumo", selected: true })).toBeVisible();
      await expect(pagina.getByRole("heading", { level: 1, name: "Lia Andarilha" })).toBeVisible();
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
      await pagina.getByTestId("upload-ilustracao").setInputFiles({ name: "corpo.png", mimeType: "image/png", buffer: png });
      await expect(pagina.getByRole("status").filter({ hasText: "Imagem de ilustração atualizada." })).toBeVisible();
      await expect(pagina.getByRole("img", { name: "Ilustração de Lia Andarilha" })).toHaveAttribute("src", /^data:image\/webp;base64,/);
      await expect(pagina.getByRole("button", { name: "Trocar ilustração" })).toBeVisible();

      await pagina.getByRole("tab", { name: "Personalidade" }).click();
      // O popover abre por foco ou hover; um clique logo depois do hover o fecharia.
      await pagina.getByRole("button", { name: "Editar História" }).focus();
      const editor = pagina.getByRole("group", { name: "Editar História" });
      await editor.getByLabel("História", { exact: true }).fill("Veio do norte.\n\nPerdeu tudo na travessia.");
      await expect(editor.getByText("41 de 4.000 caracteres")).toBeVisible();
      await editor.getByRole("button", { name: "Salvar" }).click();
      await expect(pagina.getByRole("tabpanel", { name: "Personalidade" }).getByText("Veio do norte.")).toBeVisible();

      await pagina.getByRole("tab", { name: "Resumo" }).click();
      const historia = pagina.getByRole("region", { name: "História" });
      await expect(historia.locator("p")).toHaveText(["Veio do norte.", "Perdeu tudo na travessia."]);
      expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await verificarAxe(pagina, `resumo (${tela})`);
      const ficha = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${lia}/ficha`);
      expect(ficha.ficha.personalidade.historia).toBe("Veio do norte.\n\nPerdeu tudo na travessia.");
      expect(ficha.ficha.personagem.ilustracao_ativo).toMatch(new RegExp(`^mesas/${m}/personagens/${lia}/imagens/`));
    } finally {
      await jogador.contexto.close();
    }
  });
}

test("fonte bloqueada: texto visível na alternativa serifada do sistema", async ({ browser }) => {
  const contexto = await browser.newContext();
  await contexto.route("**/fonts/**", (rota) => rota.abort());
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(`${APP}/preview/tema`);
    const titulo = pagina.getByRole("heading", { level: 1 });
    await expect(titulo).toBeVisible();
    await pagina.evaluate(() => document.fonts.ready);
    const estado = await titulo.evaluate((el) => {
      const estilo = getComputedStyle(el);
      const caixa = el.getBoundingClientRect();
      return { familia: estilo.fontFamily, cor: estilo.color, largura: caixa.width, altura: caixa.height,
        carregada: document.fonts.check(`16px "Cormorant Garamond"`) && [...document.fonts].some((f) => f.family.includes("Cormorant") && f.status === "loaded") };
    });
    expect(estado.carregada).toBe(false);
    expect(estado.familia).toMatch(/Georgia, serif$/);
    expect(estado.cor).not.toMatch(/rgba\(.*, 0\)$|transparent/);
    expect(estado.largura).toBeGreaterThan(50);
    expect(estado.altura).toBeGreaterThan(10);
    const corpo = await pagina.locator("p").first().evaluate((el) => getComputedStyle(el).fontFamily);
    expect(corpo).toMatch(/sans-serif$/);
  } finally {
    await contexto.close();
  }
});

// ------------------------------------------------------------------ assistente de criação

const ATRIBUTOS_MAGO = { Vigor: 2, "Força": 1, Destreza: 2, Carisma: 1, "Manipulação": 1, "Propósito": 2, "Percepção": 1, "Inteligência": 3, "Raciocínio": 2 };
const PERICIAS_MAGO = { Arcanismo: 3, "Acadêmicos": 2, "Investigação": 2, "Prontidão": 2, Ocultismo: 1, "Linguística": 1, Medicina: 1, Esquiva: 1 };

async function semRolagemHorizontal(pagina) {
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

/** Ativa um botão só pelo teclado: foco nele e Enter. */
async function teclar(pagina, nome) {
  await pagina.getByRole("button", { name: nome, exact: true }).focus();
  await pagina.keyboard.press("Enter");
}

async function escolherValores(pagina, valores) {
  for (const [nome, valor] of Object.entries(valores)) {
    const radio = pagina.getByRole("group", { name: nome, exact: true }).getByRole("radio", { name: String(valor), exact: true });
    await radio.focus();
    await pagina.keyboard.press("Space");
    await expect(radio).toBeChecked();
  }
}

async function preencherAteAtributos(pagina, nome, { altura = "1,70", maisAlto = false } = {}) {
  await expect(pagina.getByRole("heading", { level: 2, name: "Conceito" })).toBeVisible();
  await teclar(pagina, "Avançar");
  await expect(pagina.getByRole("heading", { level: 2, name: "Identidade" })).toBeFocused();
  await pagina.getByLabel("Nome (obrigatório)").focus();
  await pagina.keyboard.type(nome);
  await pagina.getByLabel("Idade (opcional)").focus();
  await pagina.keyboard.type("112");
  await teclar(pagina, "Avançar");
  const elfo = pagina.getByRole("radio", { name: /^Elfo/ });
  await elfo.focus();
  await pagina.keyboard.press("Space");
  await expect(pagina.getByText("Não há habilidades registradas para esta raça no catálogo.")).toBeVisible();
  if (maisAlto) {
    const alto = pagina.getByRole("radio", { name: /Mais alto que a média/ });
    await alto.focus();
    await pagina.keyboard.press("Space");
    await expect(pagina.getByText(/o Tamanho passa a Grande/)).toBeVisible();
  }
  await pagina.getByLabel("Altura em metros (opcional)").focus();
  await pagina.keyboard.type(altura);
  await teclar(pagina, "Avançar");
  await expect(pagina.getByRole("status").filter({ hasText: "Etapa 4 de 8" })).toHaveCount(1);
  const mago = pagina.getByRole("radio", { name: /^Mago/ });
  await mago.focus();
  await pagina.keyboard.press("Space");
  const mutante = pagina.getByRole("radio", { name: /^Mutante Arcano/ });
  await mutante.focus();
  await pagina.keyboard.press("Space");
  await teclar(pagina, "Avançar");
  await expect(pagina.getByRole("heading", { level: 2, name: "Atributos" })).toBeFocused();
}

async function concluirDeAtributos(pagina) {
  await escolherValores(pagina, ATRIBUTOS_MAGO);
  await semRolagemHorizontal(pagina);
  await teclar(pagina, "Avançar");
  await escolherValores(pagina, PERICIAS_MAGO);
  await semRolagemHorizontal(pagina);
  await teclar(pagina, "Avançar");
  await expect(pagina.getByRole("heading", { level: 2, name: "Personalidade" })).toBeFocused();
  await teclar(pagina, "Avançar");
  const previa = pagina.getByRole("region", { name: "PV, PP e Escalas calculados pelo servidor" });
  await expect(previa.getByText("14", { exact: true })).toBeVisible();
  await expect(previa.getByText("10", { exact: true })).toBeVisible();
  await semRolagemHorizontal(pagina);
  await verificarAxe(pagina, "conferência do assistente");
}

async function conferirCriado(m, antes, nome, { altura = 1.7, tamanho } = {}) {
  const lista = await chamar("jogador-1", "GET", `/mesas/${m}/personagens`);
  expect(lista.length).toBe(antes + 1);
  const criado = lista.find((p) => p.nome === nome);
  const ficha = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${criado.id}/ficha`);
  expect(ficha.ficha.personagem).toMatchObject({ nome, nivel: 1, raca: "Elfo", classe: "Mago", arquetipo: "Mutante Arcano", idade: 112, altura });
  expect(ficha.ficha.personagem.tamanho).toBe(tamanho);
  const grade = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${criado.id}/inventario/grade`);
  expect(grade.tamanho).toBe(tamanho ? "grande" : "medio");
  expect(ficha.ficha.recursos.pv.atual).toBe(14);
  const cartas = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${criado.id}/cartas`);
  expect(cartas.filter((c) => c.estado === "aprendida").length).toBeGreaterThan(0);
  return criado;
}

for (const [rotulo, viewport] of [["desktop", { width: 1280, height: 900 }], ["celular", { width: 360, height: 780 }]]) {
  test(`assistente (${rotulo}): Mago Elfo criado só pelo teclado até a ficha aberta`, async ({ browser }) => {
    const { m } = await semear();
    const antes = (await chamar("jogador-1", "GET", `/mesas/${m}/personagens`)).length;
    const { contexto, pagina } = await abrir(browser, "jogador-1", `/mesas/${m}?painel=character`, { viewport, hasTouch: rotulo === "celular" });
    try {
      await teclar(pagina, "Criar personagem");
      await expect(pagina).toHaveURL(/criar-personagem/);
      if (rotulo === "celular") await expect(pagina.locator(".assistente__progresso")).toHaveText("Etapa 1 de 8");
      await preencherAteAtributos(pagina, `Nara ${rotulo}`);
      // Movimento reduzido: a troca de etapa não anima.
      expect(await pagina.locator(".assistente__folha-conteudo").evaluate((el) => getComputedStyle(el).animationDuration)).toBe("0s");
      expect((await chamar("jogador-1", "GET", `/mesas/${m}/personagens`)).length).toBe(antes);
      await concluirDeAtributos(pagina);
      expect((await chamar("jogador-1", "GET", `/mesas/${m}/personagens`)).length).toBe(antes);
      await teclar(pagina, "Criar personagem");
      await expect(pagina.getByText(/foi criado no nível 1/)).toBeVisible();
      await expect(pagina.getByRole("heading", { level: 1, name: `Nara ${rotulo}` })).toBeVisible();
      await conferirCriado(m, antes, `Nara ${rotulo}`);
      expect(await pagina.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("cursed:rascunho-personagem")))).toEqual([]);
    } finally {
      await contexto.close();
    }
  });
}

test("assistente no celular: abandona em Atributos, recarrega e retoma o rascunho", async ({ browser }) => {
  const { m } = await semear();
  const antes = (await chamar("jogador-1", "GET", `/mesas/${m}/personagens`)).length;
  const { contexto, pagina } = await abrir(browser, "jogador-1", `/mesas/${m}/criar-personagem`, { viewport: { width: 360, height: 780 }, hasTouch: true });
  try {
    await preencherAteAtributos(pagina, "Tarsila", { altura: "2,20", maisAlto: true });
    await escolherValores(pagina, { Vigor: 2 });
    await teclar(pagina, "Sair e guardar rascunho");
    await expect(pagina).toHaveURL(/painel=character/);
    await pagina.reload();
    expect((await chamar("jogador-1", "GET", `/mesas/${m}/personagens`)).length).toBe(antes);
    await teclar(pagina, "Criar personagem");
    await expect(pagina.getByText(/Tarsila, parado na etapa 5 de 8/)).toBeVisible();
    await teclar(pagina, "Continuar rascunho");
    await expect(pagina.getByRole("heading", { level: 2, name: "Atributos" })).toBeVisible();
    await expect(pagina.getByRole("group", { name: "Vigor", exact: true }).getByRole("radio", { name: "2", exact: true })).toBeChecked();
    await concluirDeAtributos(pagina);
    await expect(pagina.getByText(/Elfo · Grande \(fora da média, mais alto\) · 2,20 m/)).toBeVisible();
    await teclar(pagina, "Criar personagem");
    await expect(pagina.getByText(/foi criado no nível 1/)).toBeVisible();
    await conferirCriado(m, antes, "Tarsila", { altura: 2.2, tamanho: "Grande" });
  } finally {
    await contexto.close();
  }
});

// ---------------------------------------------------------------- navegação inicial (navegacao-inicial-e-perfil)

async function confirmarPerfil(pagina, sugerido, apelido) {
  await expect(pagina.getByRole("heading", { name: "Como o seu grupo vai chamar você?" })).toBeVisible();
  await expect(pagina.getByRole("textbox", { name: /Apelido/ })).toHaveValue(sugerido);
  if (apelido) await pagina.getByRole("textbox", { name: /Apelido/ }).fill(apelido);
  await pagina.getByRole("button", { name: "Confirmar e entrar" }).click();
  await expect(pagina.getByRole("heading", { level: 1, name: "Histórias vivem aqui" })).toBeVisible();
}

test("navegação: primeiro acesso, campanha, convite, sinopse, participantes e Biblioteca", async ({ browser }) => {
  const sufixo = Date.now().toString(36);
  const narradora = await abrir(browser, `ines-${sufixo}`, "/");
  const jogador = await abrir(browser, `davi-${sufixo}`, "/campanhas", { viewport: { width: 360, height: 780 }, hasTouch: true });
  try {
    await confirmarPerfil(narradora.pagina, `Ines ${sufixo.charAt(0).toUpperCase()}${sufixo.slice(1)}`, "Inês");
    await verificarAxe(narradora.pagina, "início");
    await narradora.pagina.getByRole("button", { name: /Criar campanha/ }).click();
    await narradora.pagina.getByRole("dialog", { name: "Criar campanha" }).getByRole("textbox", { name: "Nome da campanha" }).fill("Cinzas do Norte");
    await narradora.pagina.getByRole("dialog", { name: "Criar campanha" }).getByRole("button", { name: "Criar campanha" }).click();
    await expect(narradora.pagina.getByRole("heading", { level: 1, name: "Cinzas do Norte" })).toBeVisible();
    await expect(narradora.pagina).toHaveURL(/\/campanhas\/[0-9a-f]+$/);
    await expect(narradora.pagina.getByRole("button", { name: /Narrando/ })).toHaveAttribute("aria-pressed", "true");
    await narradora.pagina.getByRole("button", { name: /Editar campanha/ }).click();
    await narradora.pagina.getByRole("textbox", { name: /Sinopse/ }).fill("O reino caiu numa noite sem lua.");
    await narradora.pagina.getByRole("button", { name: "Gravar" }).click();
    await expect(narradora.pagina.getByText("O reino caiu numa noite sem lua.")).toBeVisible();
    await narradora.pagina.getByRole("button", { name: /Convidar jogadores/ }).click();
    const codigo = (await narradora.pagina.locator(".campanha__convite code").textContent()).trim();
    await verificarAxe(narradora.pagina, "campanha do Narrador");

    // Jogador no celular: primeiro acesso leva ao Início; Campanhas abre em Jogando, sem campanhas ainda.
    await confirmarPerfil(jogador.pagina, `Davi ${sufixo.charAt(0).toUpperCase()}${sufixo.slice(1)}`, "Davi");
    await semRolagemHorizontal(jogador.pagina);
    await jogador.pagina.getByRole("button", { name: /Seções/ }).click();
    await jogador.pagina.getByRole("navigation", { name: "Seções da plataforma" }).getByRole("link", { name: "Campanhas" }).click();
    await jogador.pagina.getByRole("button", { name: /Jogando/ }).click();
    await expect(jogador.pagina.getByText(/Você ainda não joga em nenhuma campanha/)).toBeVisible();
    await jogador.pagina.getByRole("button", { name: /Entrar com convite/ }).click();
    await jogador.pagina.getByRole("textbox", { name: "Código do convite" }).fill("codigo-que-nao-existe");
    await jogador.pagina.getByRole("button", { name: "Entrar na campanha" }).click();
    await expect(jogador.pagina.getByRole("dialog", { name: "Entrar com convite" }).getByRole("alert")).toContainText("Convite");
    await jogador.pagina.getByRole("textbox", { name: "Código do convite" }).fill(codigo);
    await jogador.pagina.getByRole("button", { name: "Entrar na campanha" }).click();
    await expect(jogador.pagina.getByRole("heading", { level: 1, name: "Cinzas do Norte" })).toBeVisible();
    await expect(jogador.pagina.getByText("O reino caiu numa noite sem lua.")).toBeVisible();
    await expect(jogador.pagina.getByRole("link", { name: "Criar personagem" })).toBeVisible();
    await expect(jogador.pagina.locator(".campanha__participantes").getByText("Inês")).toBeVisible();
    await semRolagemHorizontal(jogador.pagina);
    await verificarAxe(jogador.pagina, "campanha do jogador no celular");

    // A narradora vê o apelido do jogador entre os participantes.
    await narradora.pagina.reload();
    await expect(narradora.pagina.locator(".campanha__participantes").getByText("Davi")).toBeVisible();

    // Biblioteca: Visão geral e uma regra com tabela, também no celular.
    await jogador.pagina.getByRole("button", { name: /Seções/ }).click();
    await jogador.pagina.getByRole("navigation", { name: "Seções da plataforma" }).getByRole("link", { name: "Biblioteca" }).click();
    await expect(jogador.pagina.getByRole("heading", { level: 1, name: "Visão geral do Cursed" })).toBeVisible();
    await jogador.pagina.getByRole("link", { name: "Carga", exact: true }).first().click();
    await expect(jogador.pagina.getByRole("heading", { level: 1, name: "Carga e Transporte" })).toBeVisible();
    await expect(jogador.pagina.getByRole("region", { name: "Tabela" }).first().locator("table")).toBeVisible();
    await semRolagemHorizontal(jogador.pagina);
    await verificarAxe(jogador.pagina, "regra de Carga no celular");

    // Sair devolve à entrada.
    await narradora.pagina.getByRole("button", { name: /Conta de Inês/ }).click();
    await narradora.pagina.getByRole("menuitem", { name: "Sair" }).click();
    await expect(narradora.pagina.getByText(/modo de desenvolvimento/)).toBeVisible();
  } finally {
    await narradora.contexto.close();
    await jogador.contexto.close();
  }
});

test("navegação: acervo mostra a ficha e copia o personagem próprio como NPC", async ({ browser }) => {
  const { m, lia } = await semear();
  const { contexto, pagina } = await abrir(browser, "jogador-1", "/personagens");
  try {
    // Identidade de teste: o primeiro acesso sugere "Jogador 1".
    await expect(pagina).toHaveURL(/\/boas-vindas$/);
    await confirmarPerfil(pagina, "Jogador 1");
    await pagina.goto(`${APP}/personagens`);
    await expect(pagina).toHaveURL(new RegExp(`/personagens/meus/`));
    await pagina.goto(`${APP}/personagens/meus/${m}/${lia}`);
    // A vitrine é o Resumo da ficha, com os mesmos valores da aba Resumo.
    const resumo = pagina.getByRole("article", { name: "Resumo de Lia Andarilha" });
    await expect(resumo).toBeVisible();
    const atributos = resumo.getByRole("region", { name: "Atributos" });
    const linha = async (nome) => (await atributos.getByText(nome, { exact: true }).locator("xpath=ancestor::li[1]").textContent()).replace(/\s+/g, " ");
    await pagina.goto(`${APP}/mesas/${m}/personagens/${lia}?secao=resumo`);
    const naFicha = pagina.getByRole("article", { name: "Resumo de Lia Andarilha" }).getByRole("region", { name: "Atributos" });
    const esperado = {};
    for (const nome of ["Inteligência", "Propósito", "Destreza"]) {
      esperado[nome] = (await naFicha.getByText(nome, { exact: true }).locator("xpath=ancestor::li[1]").textContent()).replace(/\s+/g, " ");
    }
    await pagina.goto(`${APP}/personagens/meus/${m}/${lia}`);
    for (const nome of Object.keys(esperado)) expect(await linha(nome)).toBe(esperado[nome]);
    await resumo.getByRole("button", { name: "Abrir Atributos" }).click();
    await expect(pagina).toHaveURL(new RegExp(`/mesas/${m}/personagens/${lia}\\?secao=atributos`));
    await pagina.goto(`${APP}/personagens/meus/${m}/${lia}`);
    await verificarAxe(pagina, "vitrine de personagem");
    // Na campanha, o jogador vê o próprio personagem e não o NPC oculto do Narrador.
    await pagina.goto(`${APP}/campanhas/${m}`);
    await expect(pagina.locator(".campanha__pessoas").getByText("Lia Andarilha")).toBeVisible();
    await expect(pagina.getByText("Rainha Velada")).toHaveCount(0);
    await pagina.goto(`${APP}/personagens/meus/${m}/${lia}`);
    await pagina.getByRole("button", { name: /Copiar para campanha/ }).click();
    await expect(pagina.getByText(/você precisa narrar uma campanha/)).toBeVisible();
    await pagina.keyboard.press("Escape");

    const destino = await chamar("jogador-1", "POST", "/mesas", { nome: `Mesa da Lia ${Date.now()}` });
    await pagina.reload();
    await pagina.getByRole("button", { name: /Copiar para campanha/ }).click();
    const dialogo = pagina.getByRole("dialog", { name: "Copiar para campanha" });
    await dialogo.getByRole("radio", { name: destino.nome }).check();
    await dialogo.getByRole("button", { name: "Copiar" }).click();
    await expect(dialogo.getByText(/agora é NPC em/)).toBeVisible();
    const copias = (await chamar("jogador-1", "GET", `/mesas/${destino.id}/personagens`)).filter((p) => p.nome === "Lia Andarilha");
    expect(copias.map((p) => [p.tipo, p.visibilidade, p.proprietario_id])).toEqual([["npc", "narrador", null]]);
    await dialogo.getByRole("link", { name: "Abrir a campanha" }).click();
    await expect(pagina.getByRole("heading", { level: 1, name: destino.nome })).toBeVisible();
    await expect(pagina.getByText("NPC · oculto")).toBeVisible();
  } finally {
    await contexto.close();
  }
});
