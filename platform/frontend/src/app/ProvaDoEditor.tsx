import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { CardEditor } from "./cards/CardEditor";
import type { CartaDefinicaoResumo, TipoCarta } from "./cards/types";
import type { ApiClient } from "./characters/types";
import { CATALOGO_ITENS } from "./inventory/catalogoItensTeste";

/*
 * Prova visual do editor de cartas (simplificar-criacao-de-cartas, tarefas 6.2 e 6.3): o editor real, sem API,
 * com uma carta em memória. `?carta=mochila` abre a carta do conceito; sem ela, "Nova carta". A validação imita a
 * do servidor no que a prova precisa: descrição obrigatória e item sem formato.
 */

type Resposta = { data?: unknown; error?: unknown; response: { status: number } };
type Parametros = { params?: { path?: Record<string, string> }; body?: unknown };
const ok = (data: unknown, status = 200): Resposta => ({ data, response: { status } });

const MOCHILA: CartaDefinicaoResumo = {
  id: "mochila", tipo: "item", versao: 3, versao_publicada: null, publicada: null, arquivada: false, procedencia_rascunho: {},
  rascunho: {
    tipo: "item", titulo: "Mochila de Viajante", item_tipo: "outro",
    texto: "Couro curtido e fivelas de latão. Aguenta a estrada e a chuva.",
    formato: { subtipo: "mochila", largura: 2, altura: 2, raridade: "comum", mochila: { linhas: 2, colunas: 3, requisito_forca: 2 } },
  },
};

function criarApi(): ApiClient {
  const cartas = new Map<string, CartaDefinicaoResumo>([[MOCHILA.id, MOCHILA]]);
  const validar = (carta: CartaDefinicaoResumo) => {
    const conteudo = (carta.rascunho ?? {}) as Record<string, unknown>;
    const problemas = [
      ...(typeof conteudo.texto === "string" && conteudo.texto.trim() ? [] : [{ campo: "texto", mensagem: "Preencha este campo." }]),
      ...(carta.tipo === "item" && !conteudo.formato ? [{ campo: "formato", mensagem: "Defina o tipo e a dimensão do item na grade antes de publicar." }] : []),
    ];
    return { valida: problemas.length === 0, problemas, revisao_pendente: [] };
  };
  const rotas: Record<string, (p: Parametros) => Resposta> = {
    "GET /mesas/{mesa_id}/cartas": () => ok([...cartas.values()]),
    "GET /mesas/{mesa_id}/catalogos/itens": () => ok(CATALOGO_ITENS),
    "GET /mesas/{mesa_id}/cartas/{carta_id}/versoes": () => ok([]),
    "POST /mesas/{mesa_id}/cartas": ({ body }) => {
      const { tipo, rascunho } = body as { tipo: TipoCarta; rascunho: Record<string, unknown> };
      const nova: CartaDefinicaoResumo = { ...MOCHILA, id: `nova-${cartas.size}`, tipo, versao: 0, rascunho: { ...rascunho, tipo } };
      cartas.set(nova.id, nova);
      return ok(nova, 201);
    },
    "PUT /mesas/{mesa_id}/cartas/{carta_id}/rascunho": ({ params, body }) => {
      const atual = cartas.get(params?.path?.carta_id ?? "")!;
      const { rascunho, tipo } = body as { rascunho: Record<string, unknown>; tipo?: TipoCarta };
      const salva = { ...atual, tipo: tipo ?? atual.tipo, versao: atual.versao + 1, rascunho: { ...rascunho, tipo: tipo ?? atual.tipo } };
      cartas.set(salva.id, salva);
      return ok(salva);
    },
    "POST /mesas/{mesa_id}/cartas/{carta_id}/validacao": ({ params }) => ok(validar(cartas.get(params?.path?.carta_id ?? "")!)),
  };
  const chamar = (metodo: string) => async (caminho: string, opcoes: Parametros = {}) => {
    const rota = rotas[`${metodo} ${caminho}`];
    return rota ? rota(opcoes) : { error: { detail: "Indisponível na prova." }, response: { status: 404 } };
  };
  return { GET: chamar("GET"), POST: chamar("POST"), PUT: chamar("PUT"), DELETE: chamar("DELETE") } as unknown as ApiClient;
}

export function ProvaDoEditor() {
  const [params] = useSearchParams();
  const carta = params.get("carta") === "mochila" ? MOCHILA : null;
  const { api, queryClient } = useMemo(() => ({
    api: criarApi(),
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
  }), []);
  return (
    <QueryClientProvider client={queryClient}>
      <main className="page">
        <CardEditor api={api} mesaId="mesa" definicao={carta} onClose={() => undefined} />
      </main>
    </QueryClientProvider>
  );
}
