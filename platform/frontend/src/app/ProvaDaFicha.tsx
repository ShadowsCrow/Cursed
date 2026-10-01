import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { CharacterSheetPage } from "./characters/sheet/CharacterSheetPage";
import type { Tamanho } from "./inventory/gridEngine";
import {
  criarApiDaFichaDemonstracao, MESA_FICHA, PERSONAGEM_FICHA, type OpcoesFichaDemonstracao,
} from "./plataforma/fichaCompletaDemonstracao";

const ROTULO_TAMANHO: Record<Tamanho, string> = {
  minusculo: "Minúsculo", pequeno: "Pequeno", medio: "Médio", grande: "Grande", enorme: "Enorme", colossal: "Colossal",
};
const TAMANHOS = Object.keys(ROTULO_TAMANHO) as Tamanho[];

function opcoesDaUrl(params: URLSearchParams): OpcoesFichaDemonstracao {
  const tamanho = params.get("tamanho");
  const forca = Number(params.get("forca") ?? 3);
  const papel = params.get("papel");
  return {
    tamanho: (TAMANHOS as readonly string[]).includes(tamanho ?? "") ? (tamanho as Tamanho) : "medio",
    forca: Number.isInteger(forca) && forca >= 1 && forca <= 7 ? forca : 3,
    mochila: params.get("mochila") === "1",
    papel: papel === "narrador" || papel === "leitura" ? papel : "jogador",
    nome: params.get("nome")?.slice(0, 80) || undefined,
    personalidadeVazia: params.get("vazia") === "1",
    pericias: params.get("pericias") === "referencia" ? "referencia" : undefined,
    cartas: params.get("cartas") === "referencia" || params.get("cartas") === "imagem" ? (params.get("cartas") as "referencia" | "imagem") : undefined,
  };
}

/**
 * Prova visual da ficha (reformular-visual-da-ficha, 5A.1): a página real da ficha com um personagem de
 * exemplo. Tamanho, Força, mochila e papel vêm da URL, para capturar a matriz de tamanhos da grade.
 */
export function ProvaDaFicha() {
  const [params, setParams] = useSearchParams();
  const opcoes = opcoesDaUrl(params);
  const chave = `${opcoes.tamanho}-${opcoes.forca}-${opcoes.mochila}-${opcoes.papel}-${opcoes.nome ?? ""}-${opcoes.personalidadeVazia}-${opcoes.pericias ?? ""}-${opcoes.cartas ?? ""}`;
  // Cada combinação tem API e cache próprios: trocar o tamanho remonta a ficha do zero.
  const { api, queryClient } = useMemo(() => ({
    api: criarApiDaFichaDemonstracao(opcoes),
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chave]);
  const mudar = (campo: string, valor: string) => {
    const proximos = new URLSearchParams(params);
    proximos.set(campo, valor);
    setParams(proximos);
  };

  return (
    <div className="prova-ficha">
      <form className="prova-ficha__controles" aria-label="Opções da prévia" onSubmit={(e) => e.preventDefault()}>
        <strong>Prévia da ficha</strong>
        <label>Tamanho
          <select value={opcoes.tamanho} onChange={(e) => mudar("tamanho", e.target.value)}>
            {TAMANHOS.map((t) => <option key={t} value={t}>{ROTULO_TAMANHO[t]}</option>)}
          </select>
        </label>
        <label>Força
          <select value={opcoes.forca} onChange={(e) => mudar("forca", e.target.value)}>
            {[1, 2, 3, 4, 5].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={opcoes.mochila} onChange={(e) => mudar("mochila", e.target.checked ? "1" : "0")} />
          Mochila equipada
        </label>
        <label>Papel
          <select value={opcoes.papel} onChange={(e) => mudar("papel", e.target.value)}>
            <option value="jogador">Jogador (dono)</option><option value="narrador">Narrador</option><option value="leitura">Só leitura</option>
          </select>
        </label>
      </form>
      <QueryClientProvider key={chave} client={queryClient}>
        <main className="page page--ficha">
          <CharacterSheetPage api={api} mesaId={MESA_FICHA} personagemId={PERSONAGEM_FICHA} userId="voce" onBack={() => undefined} />
        </main>
      </QueryClientProvider>
    </div>
  );
}
