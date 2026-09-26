/* global window */
// Capturas de tela das principais telas, em desktop e celular, com dados de exemplo.
// Uso: node e2e/screenshots.mjs  (requer API em API_URL e Vite em APP_URL, ambos em modo dev)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const API = process.env.API_URL ?? "http://127.0.0.1:8001";
const APP = process.env.APP_URL ?? "http://localhost:5174";
const SAIDA = process.env.SAIDA ?? ".screenshots";
const SOMENTE = process.env.SOMENTE ? new Set(process.env.SOMENTE.split(",")) : null;

async function chamar(usuario, metodo, caminho, corpo) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer dev:${usuario}`, "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`${metodo} ${caminho} → ${resposta.status}: ${texto}`);
  return texto ? JSON.parse(texto) : null;
}
const versao = async (m, p) => (await chamar("narrador", "GET", `/mesas/${m}/personagens/${p}/ficha`)).versao;

async function publicar(m, tipo, rascunho) {
  const definicao = await chamar("narrador", "POST", `/mesas/${m}/cartas`, { tipo, rascunho });
  return chamar("narrador", "POST", `/mesas/${m}/cartas/${definicao.id}/publicacao`, { versao_esperada: 0 });
}

async function semear() {
  const mesa = await chamar("narrador", "POST", "/mesas", { nome: "O Véu de Aram" });
  const m = mesa.id;
  for (const jogador of ["jogador-1", "jogador-2"]) {
    const { codigo } = await chamar("narrador", "POST", `/mesas/${m}/convites`, { validade_dias: 7 });
    await chamar(jogador, "POST", "/convites/aceitar", { codigo });
  }
  await chamar("narrador", "PUT", `/mesas/${m}/politicas`, {
    permitir_criacao_propria: true, permitir_edicao_propria: true, permitir_exclusao_propria: false,
    campos_bloqueados: [], campos_exigem_aprovacao: ["personagem.nivel"],
  });
  const lia = (await chamar("jogador-1", "POST", `/mesas/${m}/personagens`, { ficha: {
    personagem: { nome: "Lia Andarilha", raca: "Elfa", classe: "Feiticeira", arquetipo: "Arcano", idade: 112, nivel: 3,
      habilidades: [{ nome: "Rajada de Energia", tipo: "Ativa", dano: "1d10" }] },
    personalidade: { alinhamento: "Caótico | Bom", pecado: "Orgulho", meu_lema: "A magia encontra uma saída." },
    atributos: { valores: { "Força": 1, Destreza: 3, Vigor: 2, Carisma: 2, "Manipulação": 1, Proposito: 3, "Percepção": 2, "Inteligência": 4, "Raciocínio": 3 }, ajustes: { "Inteligência": 1 } },
    pericias: { valores: { Arcanismo: 4, Furtividade: 2, Esquiva: 2, "Investigação": 3, Ocultismo: 3 }, ajustes: { Arcanismo: 1 } },
    recursos: { pv: { atual: 9, maximo: 14, escala: 8 }, pp: { atual: 3, maximo: 10, escala: 6 } },
    desgaste: { exaustao: 9, estresse: 5 },
  } })).personagem_id;
  const bram = (await chamar("jogador-2", "POST", `/mesas/${m}/personagens`, { ficha: {
    personagem: { nome: "Bram Ferro-Velho", raca: "Anão", classe: "Sentinela" },
    recursos: { pv: { atual: 18, maximo: 18, escala: 10 }, pp: { atual: 4, maximo: 6, escala: 4 } },
  } })).personagem_id;

  const magias = [];
  for (const [titulo, texto, escola, grau, custos] of [
    ["Bola de Fogo", "Uma esfera flamejante explode num raio de 6 m.", "Evocação", 2, [3, 1, 4, 2]],
    ["Passo Nebuloso", "Teleporta você até 9 m para um ponto que possa ver.", "Conjuração", 1, [2, 1, 2, 1]],
    ["Escudo Arcano", "Reação: +2 na Defesa até o início do seu turno.", "Abjuração", 1, [2, 0, 1, 1]],
    ["Sussurros do Véu", "Ouve pensamentos superficiais de uma criatura próxima.", "Adivinhação", 2, [null, null, null, null]],
  ]) {
    const [custo_aprendizado, descansos_minimos, potencia_uso, custo_uso] = custos;
    magias.push(await publicar(m, "magia", { titulo, texto, escola, grau, custo_aprendizado, descansos_minimos, potencia_uso, custo_uso,
      ...(custos[0] === null ? { custo_legado: "2 PP por cena" } : {}) }));
  }
  const espada = await publicar(m, "item", { titulo: "Lâmina Rúnica", texto: "Aço antigo gravado com runas que brilham no escuro.",
    item_tipo: "arma", dados: { dano: "1d8", peso: 2 }, efeitos: [{ nome: "Runas despertas", descricao: "+1 em Arcanismo enquanto empunhada.",
      modificadores: [{ alvo: "pericia:arcanismo", valor: 1 }] }] });
  await publicar(m, "efeito", { titulo: "Abençoado", texto: "+1 em testes de Vontade.", duracao_rodadas: 3 });

  await chamar("narrador", "POST", `/mesas/${m}/personagens/${lia}/cartas`, { versao_id: espada.id, excecao_aprendizado: false, versao_esperada: await versao(m, lia) });
  await chamar("narrador", "POST", `/mesas/${m}/personagens/${lia}/cartas`, { versao_id: magias[2].id, excecao_aprendizado: true, motivo: "Treinada no Colégio", versao_esperada: await versao(m, lia) });
  await chamar("narrador", "POST", `/mesas/${m}/personagens/${lia}/efeitos`, { nome: "Envenenado", descricao: "−1 em Furtividade enquanto durar.",
    modificadores: [{ alvo: "pericia:furtividade", valor: -1 }], duracao_rodadas: 3, origem: "Picada da aranha", versao_esperada: await versao(m, lia) });
  await chamar("narrador", "POST", `/mesas/${m}/ofertas`, { titulo: "Grimório do Mago Errante",
    versao_ids: magias.map((v) => v.id), personagem_ids: [lia, bram], min_escolhas: 2, max_escolhas: 2, expira_em: null });
  await chamar("narrador", "POST", `/mesas/${m}/entidades`, { tipo: "npc", visibilidade: "narrador",
    revelacao: { nome_publico: "Figura encapuzada", imagem: false }, ficha: { personagem: { nome: "Rainha Velada" } } });
  const ficha = await chamar("jogador-1", "GET", `/mesas/${m}/personagens/${lia}/ficha`);
  await chamar("jogador-1", "PUT", `/mesas/${m}/personagens/${lia}/ficha`, {
    id: "cmd-nivel", mesa_id: m, personagem_id: lia, ator_id: "jogador-1", versao_esperada: ficha.versao,
    ficha: { ...ficha.ficha, personagem: { ...ficha.ficha.personagem, nivel: 4 } },
  });
  return { m, lia, bram };
}

const TELAS = ({ m, lia }) => [
  ["narrador", "01-inicio", "/"],
  ["narrador", "02-visao-geral", `/mesas/${m}`],
  ["narrador", "03-personagens", `/mesas/${m}?painel=character`],
  ["narrador", "04-biblioteca", `/mesas/${m}?painel=cards`],
  ["narrador", "05-registro", `/mesas/${m}?painel=activity`],
  ["narrador", "06-ficha-informacoes", `/mesas/${m}/personagens/${lia}`],
  ["narrador", "07-ficha-atributos", `/mesas/${m}/personagens/${lia}?secao=atributos`],
  ["narrador", "08-ficha-efeitos", `/mesas/${m}/personagens/${lia}?secao=efeitos`],
  ["narrador", "09-ficha-cartas", `/mesas/${m}/personagens/${lia}?secao=cartas`],
  ["jogador-1", "10-jogador-grupo", `/mesas/${m}?painel=overview`],
  ["jogador-1", "11-jogador-ficha", `/mesas/${m}/personagens/${lia}?secao=inventario`],
  ["jogador-1", "12-jogador-biblioteca", `/mesas/${m}?painel=cards`],
];

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, celular: { width: 390, height: 844 } };

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  const dados = await semear();
  const navegador = await chromium.launch();
  for (const [nomeViewport, viewport] of Object.entries(VIEWPORTS)) {
    for (const [usuario, nome, rota] of TELAS(dados)) {
      if (SOMENTE && !SOMENTE.has(nome)) continue;
      const contexto = await navegador.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR" });
      await contexto.addInitScript((id) => window.localStorage.setItem("cursed-dev-identidade", id), usuario);
      const pagina = await contexto.newPage();
      const erros = [];
      pagina.on("pageerror", (erro) => erros.push(erro.message));
      await pagina.goto(`${APP}${rota}`, { waitUntil: "networkidle" });
      await pagina.waitForTimeout(400);
      await pagina.screenshot({ path: `${SAIDA}/${nomeViewport}-${nome}.png`, fullPage: true });
      if (nome === "12-jogador-biblioteca") {
        await pagina.getByRole("button", { name: "Escolher cartas" }).first().click();
        await pagina.waitForTimeout(300);
        await pagina.screenshot({ path: `${SAIDA}/${nomeViewport}-13-jogador-escolha.png`, fullPage: false });
      }
      if (erros.length) console.warn(`${nome}: erros no navegador:`, erros);
      await contexto.close();
    }
  }
  await navegador.close();
  console.log(`Capturas salvas em ${SAIDA}/`);
}

main().catch((erro) => { console.error(erro); process.exit(1); });
