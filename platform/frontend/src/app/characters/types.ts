import type { components } from "../../api/generated/schema";
import type { createPlatformClients } from "../clients";

export type Clients = ReturnType<typeof createPlatformClients>;
export type ApiClient = Clients["api"];

export type PersonagemResumo = components["schemas"]["PersonagemResumo"];
export type FichaSnapshot = components["schemas"]["FichaSnapshot"];
export type FichaContrato = components["schemas"]["FichaContrato"];
export type PermissoesFicha = components["schemas"]["PermissoesFicha"];
export type ItemInventarioResumo = components["schemas"]["ItemInventarioResumo"];
export type EfeitoResumo = components["schemas"]["EfeitoResumo"];
export type ModificadorResumo = components["schemas"]["ModificadorResumo"];
export type FonteEfeitoResumo = components["schemas"]["FonteEfeitoResumo"];
export type ValorDerivadoResumo = components["schemas"]["ValorDerivadoResumo"];
export type FonteValorResumo = components["schemas"]["FonteValorResumo"];
export type SituacionalResumo = components["schemas"]["SituacionalResumo"];
export type PreviaImportacaoResumo = components["schemas"]["PreviaImportacaoResumo"];
export type ImportacaoResultado = components["schemas"]["ImportacaoResultado"];
export type ParticipanteResumo = components["schemas"]["ParticipanteResumo"];
export type PoliticaMesaContrato = components["schemas"]["PoliticaMesaContrato"];
export type PedidoAlteracaoResumo = components["schemas"]["PedidoAlteracaoResumo"];
export type AtualizarFichaComando = components["schemas"]["AtualizarFichaComando"];
export type EfeitoComandoResposta = components["schemas"]["EfeitoComandoResposta"];
export type EntidadePublica = components["schemas"]["EntidadePublica"];
export type RevelacaoContrato = components["schemas"]["RevelacaoContrato"];
export type AlvoDescanso = components["schemas"]["AlvoDescanso"];
export type ResultadoDescansoResumo = components["schemas"]["ResultadoDescansoResumo"];
export type ResultadoDescansoPersonagem = components["schemas"]["ResultadoDescansoPersonagem"];
export type ResultadoRecursoDescanso = components["schemas"]["ResultadoRecursoDescanso"];
export type ResultadoTrilhaDescanso = components["schemas"]["ResultadoTrilhaDescanso"];

/**
 * Extrai uma mensagem legível de um erro devolvido pelo cliente HTTP gerado.
 * O corpo real de um `HTTPException` do FastAPI traz `detail` como texto simples
 * (403/404/409/410); a validação (422) traz uma lista de `ValidationError`. Os
 * dois formatos passam pelo mesmo campo `detail`, então tratamos ambos aqui.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => (item && typeof item === "object" && "msg" in item ? String((item as { msg: unknown }).msg) : null))
        .filter((msg): msg is string => Boolean(msg));
      if (messages.length > 0) return messages.join(" ");
    }
  }
  return fallback;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Retratos trafegam como Base64 puro (`personagem.imagem_base64`, ou o campo
 * `imagem` de `EntidadePublica`), sem tipo MIME associado. Seguimos a mesma
 * convenção da interface legada (`app_streamlit/app/sections/retrato.py`) e
 * assumimos PNG ao montar a URL de dados.
 */
export function imagemDataUrl(base64: string | null | undefined): string | undefined {
  return base64 ? `data:image/png;base64,${base64}` : undefined;
}
