import type { ApiClient } from "../characters/types";
import { useEstadoCatalogo } from "../characters/sheet/catalogoApi";

/**
 * Aviso ao Narrador quando o JSON do catálogo foi salvo com erro: a mesa continua com a última
 * versão válida até o arquivo ser corrigido.
 */
export function CatalogStatusNotice({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const estado = useEstadoCatalogo(api, mesaId, true);
  const erro = estado.data?.erro;
  if (!erro) return null;
  return (
    <p className="field-warning catalog-status" role="alert">
      O catálogo do sistema tem um erro em <code>{erro.arquivo}</code>: {erro.motivo} A mesa continua usando a última versão válida
      até o arquivo ser corrigido.
    </p>
  );
}
