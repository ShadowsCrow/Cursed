import { useState } from "react";

import { Dialog } from "../../ui/primitives";
import type { ApiClient } from "../characters/types";
import { useCatalogo, useConcederCarta, useMigrarCarta, usePreviaMigracao, useVersoesCarta } from "./api";
import { CardFace } from "./cardView";
import { ROTULO_TIPO, type CartaPersonagemResumo } from "./types";

/*
 * Diálogos das cartas do personagem (9.4 e 9.9), usados pela aba Cartas da ficha (redesenhar-aba-cartas):
 * conceder uma carta e migrar para a versão mais recente.
 */

export function ConcederDialog({ api, mesaId, personagemId, versao, onClose }: {
  api: ApiClient; mesaId: string; personagemId: string; versao: number; onClose: () => void;
}) {
  const catalogo = useCatalogo(api, mesaId);
  const conceder = useConcederCarta(api, mesaId, personagemId);
  const publicadas = (catalogo.data ?? []).map((d) => d.publicada).filter((v): v is NonNullable<typeof v> => Boolean(v));
  const [versaoId, setVersaoId] = useState("");
  const [excecao, setExcecao] = useState(false);
  const [motivo, setMotivo] = useState("");
  const escolhida = publicadas.find((v) => v.id === versaoId);
  const aprendizavel = escolhida?.tipo === "habilidade" || escolhida?.tipo === "magia";
  return (
    <Dialog open title="Conceder carta" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        conceder.mutate({ versao_id: versaoId, excecao_aprendizado: aprendizavel && excecao, motivo: motivo.trim() || null, versao_esperada: versao },
          { onSuccess: onClose });
      }}>
        <label>Carta publicada
          <select value={versaoId} onChange={(e) => { setVersaoId(e.target.value); setExcecao(false); }}>
            <option value="">Escolha…</option>
            {publicadas.map((v) => <option key={v.id} value={v.id}>{String(v.conteudo.titulo)} ({ROTULO_TIPO[v.tipo]}, v{v.numero})</option>)}
          </select>
        </label>
        {escolhida && <CardFace tipo={escolhida.tipo} conteudo={escolhida.conteudo} numero={escolhida.numero} api={api} mesaId={mesaId} narrador />}
        {aprendizavel && (
          <label className="checkbox-row">
            <input type="checkbox" checked={excecao} onChange={(e) => setExcecao(e.target.checked)} />
            Conceder como aprendida (exceção ao aprendizado)
          </label>
        )}
        <label>Motivo (opcional)<input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
        {conceder.isError && <p role="alert">{conceder.error.message}</p>}
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button" disabled={!versaoId || conceder.isPending}>Conceder</button>
        </div>
      </form>
    </Dialog>
  );
}

export function MigrarDialog({ api, mesaId, personagemId, carta, versao, onClose }: {
  api: ApiClient; mesaId: string; personagemId: string; carta: CartaPersonagemResumo; versao: number; onClose: () => void;
}) {
  const versoes = useVersoesCarta(api, mesaId, carta.carta.definicao_id);
  const destino = (versoes.data ?? []).find((v) => v.numero === carta.versao_mais_recente);
  const previa = usePreviaMigracao(api, mesaId, personagemId, carta.id, destino?.id ?? null);
  const migrar = useMigrarCarta(api, mesaId, personagemId);
  return (
    <Dialog open title={`Migrar “${String(carta.carta.conteudo.titulo)}”`} onClose={onClose}>
      {previa.isPending && <p>Comparando versões…</p>}
      {previa.isError && <p role="alert">{previa.error.message}</p>}
      {previa.data && (
        <>
          <p>Da versão {previa.data.origem_numero} para a versão {previa.data.destino_numero}:</p>
          <table className="diff-table">
            <thead><tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead>
            <tbody>
              {previa.data.diferencas.map((d) => (
                <tr key={d.campo}><th scope="row">{d.campo}</th><td>{JSON.stringify(d.antes)}</td><td>{JSON.stringify(d.depois)}</td></tr>
              ))}
            </tbody>
          </table>
          {previa.data.observacao && <p role="note">{previa.data.observacao}</p>}
        </>
      )}
      {migrar.isError && <p role="alert">{migrar.error.message}</p>}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="button" disabled={!destino || !previa.data || migrar.isPending}
          onClick={() => destino && migrar.mutate({ cartaId: carta.id, versaoDestinoId: destino.id, versao }, { onSuccess: onClose })}>
          Migrar para a versão {carta.versao_mais_recente}
        </button>
      </div>
    </Dialog>
  );
}
