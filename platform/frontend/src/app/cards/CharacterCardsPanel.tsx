import { useState } from "react";

import { Confirmation, Dialog } from "../../ui/primitives";
import type { ApiClient } from "../characters/types";
import {
  useCartasDoPersonagem, useCatalogo, useConcederCarta, useMigrarCarta, usePreviaMigracao, useTransicaoCarta,
  useVersoesCarta,
} from "./api";
import { CardFace } from "./cardView";
import { ROTULO_TIPO, type AcaoCarta, type CartaPersonagemResumo, type EstadoCarta } from "./types";

const GRUPOS: { estados: EstadoCarta[]; titulo: string; nota?: string }[] = [
  { estados: ["disponivel"], titulo: "Disponíveis para aprender",
    nota: "Selecionar uma habilidade ou magia não a torna aprendida: o aprendizado segue as regras da mesa." },
  { estados: ["em_aprendizado"], titulo: "Em aprendizado" },
  { estados: ["aprendida"], titulo: "Aprendidas" },
  { estados: ["no_inventario"], titulo: "Itens recebidos" },
  { estados: ["aplicada"], titulo: "Efeitos de cartas" },
];

const ACOES_JOGADOR: Partial<Record<EstadoCarta, { acao: AcaoCarta; rotulo: string }[]>> = {
  disponivel: [{ acao: "iniciar_aprendizado", rotulo: "Iniciar aprendizado" }],
  em_aprendizado: [{ acao: "interromper_aprendizado", rotulo: "Interromper aprendizado" }],
};
const ACOES_NARRADOR: Partial<Record<EstadoCarta, { acao: AcaoCarta; rotulo: string }[]>> = {
  em_aprendizado: [{ acao: "concluir_aprendizado", rotulo: "Concluir aprendizado" }],
};

function ConcederDialog({ api, mesaId, personagemId, versao, onClose }: {
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
        {escolhida && <CardFace tipo={escolhida.tipo} conteudo={escolhida.conteudo} numero={escolhida.numero} />}
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

function MigrarDialog({ api, mesaId, personagemId, carta, versao, onClose }: {
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

export interface CharacterCardsPanelProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
  papel: "narrador" | "jogador";
  podeEditar: boolean;
}

/** Cartas da ficha: ciclos distintos por tipo e ações conforme o papel (9.4, 9.6, 9.7 e 9.9). */
export function CharacterCardsPanel({ api, mesaId, personagemId, versao, papel, podeEditar }: CharacterCardsPanelProps) {
  const cartas = useCartasDoPersonagem(api, mesaId, personagemId);
  const transicao = useTransicaoCarta(api, mesaId, personagemId);
  const [concedendo, setConcedendo] = useState(false);
  const [migrando, setMigrando] = useState<CartaPersonagemResumo | null>(null);
  const [removendo, setRemovendo] = useState<CartaPersonagemResumo | null>(null);
  const narrador = papel === "narrador";

  function acoes(carta: CartaPersonagemResumo) {
    const jogador = narrador || podeEditar ? ACOES_JOGADOR[carta.estado] ?? [] : [];
    return [...jogador, ...(narrador ? ACOES_NARRADOR[carta.estado] ?? [] : [])];
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div><span className="eyebrow">CARTAS</span><h2>Habilidades, magias, itens e efeitos</h2></div>
        {narrador && <button type="button" className="button" onClick={() => setConcedendo(true)}>Conceder carta</button>}
      </div>
      {cartas.isError && <p role="alert">{cartas.error.message}</p>}
      {transicao.isError && <p role="alert">{transicao.error.message}</p>}
      {cartas.isSuccess && cartas.data.length === 0 && <p>Este personagem ainda não possui cartas.</p>}
      {GRUPOS.map((grupo) => {
        const doGrupo = (cartas.data ?? []).filter((c) => grupo.estados.includes(c.estado));
        if (!doGrupo.length) return null;
        return (
          <section key={grupo.titulo} className="card-group" aria-label={grupo.titulo}>
            <h3>{grupo.titulo}</h3>
            {grupo.nota && <p className="card-group__note">{grupo.nota}</p>}
            <ul className="card-group__list">
              {doGrupo.map((carta) => (
                <li key={carta.id} className="card-group__item">
                  <CardFace tipo={carta.carta.tipo} conteudo={carta.carta.conteudo} numero={carta.carta.numero} />
                  {carta.excecao_aprendizado && <p className="tag tag--accent">Concedida como aprendida (exceção)</p>}
                  <div className="card-group__actions">
                    {acoes(carta).map(({ acao, rotulo }) => (
                      <button key={acao} type="button" className="button button--secondary" disabled={transicao.isPending}
                        onClick={() => transicao.mutate({ cartaId: carta.id, acao, versao })}>
                        {rotulo}
                      </button>
                    ))}
                    {narrador && carta.versao_mais_recente && carta.versao_mais_recente > carta.carta.numero && (
                      <button type="button" className="button button--ghost" onClick={() => setMigrando(carta)}>
                        Migrar para a versão {carta.versao_mais_recente}
                      </button>
                    )}
                    {narrador && (
                      <button type="button" className="button button--ghost" onClick={() => setRemovendo(carta)}>Remover</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {concedendo && <ConcederDialog api={api} mesaId={mesaId} personagemId={personagemId} versao={versao} onClose={() => setConcedendo(false)} />}
      {migrando && <MigrarDialog api={api} mesaId={mesaId} personagemId={personagemId} carta={migrando} versao={versao} onClose={() => setMigrando(null)} />}
      <Confirmation
        open={removendo !== null}
        title="Remover carta?"
        description={removendo?.tipo === "item"
          ? "O item sai do inventário e seus efeitos são encerrados."
          : removendo?.tipo === "efeito" ? "O efeito é encerrado." : "A carta deixa de estar disponível para o personagem."}
        confirmLabel="Remover"
        tone="danger"
        onConfirm={() => { if (removendo) transicao.mutate({ cartaId: removendo.id, acao: "remover", versao }); setRemovendo(null); }}
        onCancel={() => setRemovendo(null)}
      />
    </section>
  );
}
