import { chaveDerivada } from "../characters/sheet/sheetCatalog";
import type { ApiClient } from "../characters/types";
import { FICHA_DEMONSTRACAO, VALORES_DEMONSTRACAO } from "./fichaDemonstracao";

/*
 * Cliente da API em memória para a prévia `/preview/plataforma` e para os testes da navegação.
 * Responde só às rotas que estas telas usam, com dados ilustrativos. Nada é enviado a servidor algum.
 */

type Resposta = { data?: unknown; error?: unknown; response: { status: number } };
type Parametros = { params?: { path?: Record<string, string>; query?: Record<string, unknown> }; body?: unknown };

export interface EstadoDemonstracao {
  usuarioId: string;
  perfil: { apelido: string | null; apelido_sugerido: string; tem_foto: boolean; email: string | null; provedor: string | null; foto?: { tipo: string; base64: string } };
  mesas: { id: string; nome: string; papel: "narrador" | "jogador"; sinopse: string | null; capa_objeto: string | null; sistema: "cursed"; permitir_criacao_propria: boolean }[];
  participantes: Record<string, { usuario_id: string; papel: "narrador" | "jogador"; nome: string; tem_foto: boolean }[]>;
  personagens: {
    id: string; mesa_id: string; nome: string; tipo: "personagem" | "npc" | "monstro"; visibilidade: "mesa" | "narrador";
    proprietario_id: string | null; classe?: string; arquetipo?: string; raca?: string; nivel?: number;
    /** Atributos gravados na ficha, quando diferentes da ficha de demonstração. */
    atributos?: Record<string, number>;
  }[];
}

export function estadoDeDemonstracao(usuarioId = "voce"): EstadoDemonstracao {
  return {
    usuarioId,
    perfil: { apelido: "Corvo", apelido_sugerido: "Corvo", tem_foto: false, email: "voce@exemplo.com", provedor: "email" },
    mesas: [
      { id: "vigrad", nome: "Sombras de Vigrad", papel: "narrador", sistema: "cursed", capa_objeto: null, permitir_criacao_propria: true,
        sinopse: "Em Vigrad, a noite nunca é silenciosa. Entre intrigas da nobreza e ameaças antigas que despertam sob as ruas, o grupo precisa escolher em quem confiar." },
      { id: "ceynar", nome: "A Queda de Ceynar", papel: "narrador", sistema: "cursed", capa_objeto: null, permitir_criacao_propria: true, sinopse: null },
      { id: "ordem", nome: "Ordem: Fragmentos", papel: "jogador", sistema: "cursed", capa_objeto: null, permitir_criacao_propria: true,
        sinopse: "Uma ordem de caçadores juntando os pedaços de um selo quebrado." },
    ],
    participantes: {
      vigrad: [
        { usuario_id: usuarioId, papel: "narrador", nome: "Corvo", tem_foto: false },
        { usuario_id: "ana", papel: "jogador", nome: "Ana", tem_foto: false },
        { usuario_id: "bruno", papel: "jogador", nome: "Bruno", tem_foto: false },
      ],
      ceynar: [{ usuario_id: usuarioId, papel: "narrador", nome: "Corvo", tem_foto: false }],
      ordem: [
        { usuario_id: "mestra", papel: "narrador", nome: "Mestra Íris", tem_foto: false },
        { usuario_id: usuarioId, papel: "jogador", nome: "Corvo", tem_foto: false },
      ],
    },
    personagens: [
      { id: "caelren", mesa_id: "ordem", nome: "Caelren", tipo: "personagem", visibilidade: "mesa", proprietario_id: usuarioId,
        classe: "Mago", arquetipo: "Mutante Arcano", raca: "Elfo", nivel: 3 },
      { id: "lia", mesa_id: "vigrad", nome: "Lia Andarilha", tipo: "personagem", visibilidade: "mesa", proprietario_id: "ana",
        classe: "Ocultista", raca: "Humano", nivel: 2 },
      { id: "barqueiro", mesa_id: "vigrad", nome: "Velho Barqueiro", tipo: "npc", visibilidade: "mesa", proprietario_id: null },
      { id: "rainha", mesa_id: "vigrad", nome: "Rainha Velada", tipo: "npc", visibilidade: "narrador", proprietario_id: null },
      { id: "lobo", mesa_id: "ceynar", nome: "Lobo Cinzento", tipo: "monstro", visibilidade: "narrador", proprietario_id: null },
    ],
  };
}

function ok(data: unknown, status = 200): Resposta {
  return { data, response: { status } };
}

function erro(status: number, detail: string): Resposta {
  return { error: { detail }, response: { status } };
}

export function criarApiDeDemonstracao(estado: EstadoDemonstracao = estadoDeDemonstracao()) {
  const eu = estado.usuarioId;
  const mesa = (id: string) => estado.mesas.find((m) => m.id === id);
  const resumoMesa = (m: EstadoDemonstracao["mesas"][number]) => ({
    id: m.id, nome: m.nome, papel: m.papel, sistema: m.sistema, sinopse: m.sinopse, capa_objeto: m.capa_objeto,
  });
  const perfil = () => ({
    usuario_id: eu, apelido: estado.perfil.apelido, apelido_sugerido: estado.perfil.apelido_sugerido,
    nome_exibido: estado.perfil.apelido ?? estado.perfil.apelido_sugerido, tem_foto: estado.perfil.tem_foto,
    email: estado.perfil.email, provedor: estado.perfil.provedor, confirmado: estado.perfil.apelido !== null,
  });
  const legiveis = (mesaId: string) => {
    const papel = mesa(mesaId)?.papel;
    return estado.personagens.filter((p) => p.mesa_id === mesaId && (papel === "narrador" || p.proprietario_id === eu));
  };
  const acervo = (colecao: string) => estado.personagens.filter((p) => {
    const m = mesa(p.mesa_id);
    if (!m) return false;
    if (colecao === "meus") return p.tipo === "personagem" && p.proprietario_id === eu;
    return m.papel === "narrador" && p.tipo === (colecao === "npcs" ? "npc" : "monstro");
  }).map((p) => ({
    mesa_id: p.mesa_id, mesa_nome: mesa(p.mesa_id)?.nome ?? "", personagem_id: p.id, tipo: p.tipo, nome: p.nome,
    visibilidade: p.visibilidade, classe: p.classe ?? null, arquetipo: p.arquetipo ?? null, raca: p.raca ?? null,
    nivel: p.nivel ?? null, retrato_objeto: null,
  }));

  const rotas: Record<string, (opcoes: Parametros) => Resposta | Promise<Resposta>> = {
    "GET /perfil": () => ok(perfil()),
    "PUT /perfil": ({ body }) => {
      const apelido = String((body as { apelido: string }).apelido).trim().replace(/\s+/g, " ");
      if (apelido.length < 2 || apelido.length > 40) return erro(422, "O apelido precisa ter de 2 a 40 caracteres.");
      estado.perfil.apelido = apelido;
      return ok(perfil());
    },
    "PUT /perfil/foto": async ({ body }) => {
      // Guarda a imagem em memória, como o servidor guardaria no armazenamento privado.
      const arquivo = body instanceof FormData ? body.get("arquivo") : null;
      if (!(arquivo instanceof Blob)) return erro(422, "Envie uma imagem PNG, JPEG ou WEBP.");
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      let binario = "";
      for (const byte of bytes) binario += String.fromCharCode(byte);
      estado.perfil.foto = { tipo: arquivo.type || "image/png", base64: btoa(binario) };
      estado.perfil.tem_foto = true;
      return ok({ destino: "foto", alvo: eu });
    },
    "DELETE /perfil/foto": () => { estado.perfil.tem_foto = false; delete estado.perfil.foto; return ok({ destino: "foto", alvo: eu }); },
    "GET /perfis/{usuario_id}/foto": ({ params }) =>
      params?.path?.usuario_id === eu && estado.perfil.foto ? ok(estado.perfil.foto) : erro(404, "Imagem não encontrada."),
    "GET /mesas": () => ok(estado.mesas.map(resumoMesa)),
    "POST /mesas": ({ body }) => {
      const nome = String((body as { nome: string }).nome).trim();
      const nova = { id: `mesa-${estado.mesas.length + 1}`, nome, papel: "narrador" as const, sistema: "cursed" as const,
        sinopse: null, capa_objeto: null, permitir_criacao_propria: true };
      estado.mesas.push(nova);
      estado.participantes[nova.id] = [{ usuario_id: eu, papel: "narrador", nome: perfil().nome_exibido, tem_foto: false }];
      return ok(resumoMesa(nova), 201);
    },
    "GET /mesas/{mesa_id}": ({ params }) => {
      const m = mesa(params?.path?.mesa_id ?? "");
      return m ? ok({ ...resumoMesa(m), participantes: estado.participantes[m.id] ?? [] }) : erro(404, "Mesa não encontrada.");
    },
    "PUT /mesas/{mesa_id}": ({ params, body }) => {
      const m = mesa(params?.path?.mesa_id ?? "");
      if (!m) return erro(404, "Mesa não encontrada.");
      if (m.papel !== "narrador") return erro(403, "Ação reservada ao Narrador.");
      const pedido = body as { nome: string; sinopse: string | null };
      m.nome = pedido.nome.trim();
      m.sinopse = pedido.sinopse?.trim() || null;
      return ok(resumoMesa(m));
    },
    "GET /mesas/{mesa_id}/personagens": ({ params }) => ok(legiveis(params?.path?.mesa_id ?? "").map((p) => ({
      id: p.id, mesa_id: p.mesa_id, nome: p.nome, tipo: p.tipo, visibilidade: p.visibilidade, proprietario_id: p.proprietario_id,
      versao: 0, retrato_objeto: null,
    }))),
    "GET /mesas/{mesa_id}/politicas": ({ params }) => {
      const m = mesa(params?.path?.mesa_id ?? "");
      return m ? ok({ permitir_edicao_propria: true, permitir_criacao_propria: m.permitir_criacao_propria,
        permitir_exclusao_propria: true, campos_bloqueados: [], campos_exigem_aprovacao: [] }) : erro(404, "Mesa não encontrada.");
    },
    "POST /mesas/{mesa_id}/convites": () => ok({ codigo: "VIGRAD-7Q2K", expira_em: new Date(Date.now() + 7 * 864e5).toISOString() }, 201),
    "POST /convites/aceitar": ({ body }) => {
      if (String((body as { codigo: string }).codigo).trim().toUpperCase() !== "CONVITE-VALIDO") return erro(410, "Convite indisponível.");
      const nova = { id: "sala-convite", nome: "Mesa do Convite", papel: "jogador" as const, sistema: "cursed" as const,
        sinopse: null, capa_objeto: null, permitir_criacao_propria: true };
      if (!mesa(nova.id)) estado.mesas.push(nova);
      estado.participantes[nova.id] = [{ usuario_id: eu, papel: "jogador", nome: perfil().nome_exibido, tem_foto: false }];
      return ok(resumoMesa(nova));
    },
    "GET /acervo/personagens": ({ params }) => ok(acervo(String(params?.query?.colecao ?? "meus"))),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/valores-derivados": ({ params }) => {
      const p = estado.personagens.find((item) => item.id === params?.path?.personagem_id && item.mesa_id === params?.path?.mesa_id);
      if (!p) return erro(404, "Personagem não encontrado.");
      // Demonstração: os totais são os números da ficha de exemplo, como o servidor os devolveria.
      const valor = (chave: string, rotulo: string, grupo: string, total: number | null) => ({
        chave, rotulo, grupo, calculavel: total !== null, motivo: total === null ? "Sem valor na ficha." : null, total, fontes: [], situacionais: [],
      });
      const atributos = p.atributos ?? FICHA_DEMONSTRACAO.atributos.valores;
      return ok([
        ...Object.entries(atributos).map(([nome, total]) => valor(chaveDerivada("atributo", nome), nome, "atributo", total)),
        ...Object.entries(FICHA_DEMONSTRACAO.pericias.valores).map(([nome, total]) => valor(chaveDerivada("pericia", nome), nome, "pericia", total)),
        ...VALORES_DEMONSTRACAO.map(([chave, rotulo, grupo, total]) => valor(chave, rotulo, grupo, total)),
      ]);
    },
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/inventario": () => ok([]),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/cartas": () => ok([]),
    "GET /mesas/{mesa_id}/catalogos/classes": () => ok([]),
    "GET /mesas/{mesa_id}/personagens/{personagem_id}/ficha": ({ params }) => {
      const p = estado.personagens.find((item) => item.id === params?.path?.personagem_id && item.mesa_id === params?.path?.mesa_id);
      if (!p) return erro(404, "Personagem não encontrado.");
      const ficha = {
        ...FICHA_DEMONSTRACAO,
        personagem: { ...FICHA_DEMONSTRACAO.personagem, nome: p.nome, classe: p.classe, arquetipo: p.arquetipo, raca: p.raca, nivel: p.nivel },
        atributos: { valores: p.atributos ?? FICHA_DEMONSTRACAO.atributos.valores },
      };
      return ok({ mesa_id: p.mesa_id, personagem_id: p.id, versao: 0, tipo: p.tipo, ficha, avisos: [] });
    },
    "GET /mesas/{mesa_id}/catalogos/listas-ficha": () => ok({
      sexos: [], alinhamentos: [], pecados: [], faixas_de_altura: [],
      campos_personalidade: [{ chave: "vivo_para", rotulo: "Vivo para", dica: "" }, { chave: "meu_lema", rotulo: "Meu lema", dica: "" }],
    }),
    "POST /mesas/{mesa_id}/personagens/copias": ({ params, body }) => {
      const destino = mesa(params?.path?.mesa_id ?? "");
      if (!destino) return erro(404, "Mesa não encontrada.");
      if (destino.papel !== "narrador") return erro(403, "Só o Narrador da campanha recebe cópias.");
      const pedido = body as { mesa_origem_id: string; personagem_origem_id: string };
      const origem = estado.personagens.find((p) => p.id === pedido.personagem_origem_id && p.mesa_id === pedido.mesa_origem_id);
      if (!origem) return erro(404, "Personagem não encontrado.");
      const copia = { ...origem, id: `${origem.id}-copia-${estado.personagens.length}`, mesa_id: destino.id,
        tipo: origem.tipo === "monstro" ? "monstro" as const : "npc" as const, visibilidade: "narrador" as const, proprietario_id: null };
      estado.personagens.push(copia);
      return ok({ id: copia.id, mesa_id: copia.mesa_id, nome: copia.nome, tipo: copia.tipo, visibilidade: copia.visibilidade,
        proprietario_id: null, versao: 0 }, 201);
    },
  };

  const chamar = (metodo: string) => async (caminho: string, opcoes: Parametros = {}) => {
    const rota = rotas[`${metodo} ${caminho}`];
    return rota ? rota(opcoes) : erro(404, `Sem dados de demonstração para ${metodo} ${caminho}.`);
  };
  return {
    estado,
    api: { GET: chamar("GET"), POST: chamar("POST"), PUT: chamar("PUT"), DELETE: chamar("DELETE") } as unknown as ApiClient,
  };
}
