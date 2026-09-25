import { useRef, useState } from "react";

import { Dialog } from "../../../ui/primitives";
import { campoEditavel } from "../fieldPolicy";
import { usePreviaImportacao, useImportarCodigo } from "./sheetApi";
import type { ApiClient, ImportacaoResultado, PermissoesFicha, PreviaImportacaoResumo } from "../types";

function PreviewContent({ previa }: { previa: PreviaImportacaoResumo }) {
  return (
    <div className="import-preview">
      <p><strong>Tipo:</strong> {previa.tipo === "efeito" ? "Efeito" : "Equipamento"}</p>
      {previa.item && (
        <div>
          <p><strong>Item:</strong> {previa.item.nome} ({previa.item.tipo})</p>
        </div>
      )}
      {previa.efeitos.length > 0 && (
        <div>
          <p><strong>Efeitos incluídos:</strong></p>
          <ul>
            {previa.efeitos.map((efeito, index) => (
              <li key={index}>
                <strong>{efeito.nome}</strong> — {efeito.descricao}
                {efeito.modificadores && efeito.modificadores.length > 0 && (
                  <ul>
                    {efeito.modificadores.map((mod, i) => (
                      <li key={i}>{mod.alvo}: {mod.valor >= 0 ? `+${mod.valor}` : mod.valor}{mod.contexto ? ` (${mod.contexto})` : ""}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {previa.avisos && previa.avisos.length > 0 && (
        <ul role="alert">
          {previa.avisos.map((aviso, index) => <li key={index}>{aviso}</li>)}
        </ul>
      )}
    </div>
  );
}

export interface ImportDialogProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
  permissoes: PermissoesFicha | undefined;
  onImported: (result: ImportacaoResultado) => void;
}

/**
 * Importação de efeito ou equipamento a partir de um código portátil: o
 * código é apenas pré-visualizado (`/importacoes/previa`) sem gravar nada; só
 * "Confirmar" grava (`/importacoes`). "Cancelar" fecha sem jamais ter chamado
 * o endpoint de gravação.
 */
export function ImportDialog({ api, mesaId, personagemId, versao, permissoes, onImported }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [previa, setPrevia] = useState<PreviaImportacaoResumo | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const previaMutation = usePreviaImportacao(api, mesaId, personagemId);
  const importarMutation = useImportarCodigo(api, mesaId, personagemId);

  const podeImportar = campoEditavel("inventario", permissoes) || campoEditavel("efeitos", permissoes) || Boolean(permissoes?.editar);

  function close() {
    setOpen(false);
    setCodigo("");
    setPrevia(null);
    previaMutation.reset();
    importarMutation.reset();
  }

  async function handlePreview() {
    setPrevia(null);
    try {
      const resultado = await previaMutation.mutateAsync(codigo);
      setPrevia(resultado);
    } catch {
      // erro exposto via previaMutation.error abaixo.
    }
  }

  async function handleConfirm() {
    try {
      const resultado = await importarMutation.mutateAsync({ codigo, versaoEsperada: versao });
      onImported(resultado);
      close();
    } catch {
      // erro exposto via importarMutation.error abaixo; nada foi alterado.
    }
  }

  if (!podeImportar) return null;

  return (
    <>
      <button type="button" ref={triggerRef} className="button button--secondary" onClick={() => setOpen(true)}>
        Importar código
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Importar conteúdo portátil"
        description="Cole um código de efeito (E1/E2) ou de equipamento (EQ1/EQ2). Pré-visualize antes de confirmar."
      >
        <label htmlFor="import-codigo">Código</label>
        <textarea id="import-codigo" value={codigo} onChange={(event) => { setCodigo(event.target.value); setPrevia(null); }} />

        {previaMutation.isError && <p role="alert">{previaMutation.error.message}</p>}
        {previa && <PreviewContent previa={previa} />}
        {importarMutation.isError && <p role="alert">{importarMutation.error.message}</p>}

        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={close}>Cancelar</button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => { void handlePreview(); }}
            disabled={!codigo.trim() || previaMutation.isPending}
          >
            {previaMutation.isPending ? "Verificando…" : "Pré-visualizar"}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => { void handleConfirm(); }}
            disabled={!previa || importarMutation.isPending}
          >
            {importarMutation.isPending ? "Confirmando…" : "Confirmar"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
