import { useState } from "react";

import { Dialog } from "../../ui/primitives";
import { usePersonagens, usePreviaDescanso, useConfirmarDescanso } from "./api";
import type { ApiClient, AlvoDescanso, PersonagemResumo, ResultadoDescansoPersonagem, ResultadoDescansoResumo } from "./types";

type Foco = "pv" | "pp" | "exaustao" | "estresse";
type AjusteChave = "pv" | "pp" | "exaustao" | "estresse";

interface AlvoFormState {
  foco: Foco | "";
  ajustes: Record<AjusteChave, string>;
}

const focoOptions: { value: Foco; label: string }[] = [
  { value: "pv", label: "+½ Escala de PV" },
  { value: "pp", label: "+½ Escala de PP" },
  { value: "exaustao", label: "-1 Exaustão" },
  { value: "estresse", label: "-1 Estresse" },
];

const notaTexto: { conforto: string; seguranca: string }[] = [
  { conforto: "Exposição ou privação impede repouso restaurador.", seguranca: "Sem proteção; uma ameaça pode alcançar o grupo diretamente." },
  { conforto: "Dá para dormir, mas falta algo importante.", seguranca: "Só uma precaução improvisada, fácil de contornar." },
  { conforto: "Abrigo básico: evita o pior, mas limita sono e cuidados.", seguranca: "Alguma vigília ou barreira, mas uma aproximação relevante ainda passa." },
  { conforto: "Água, comida, temperatura e lugar para dormir adequados; falta algo.", seguranca: "Aviso e acessos defendidos, mas uma falha relevante ainda permite a aproximação." },
  { conforto: "Necessidades relevantes do grupo atendidas, sem privação significativa.", seguranca: "Proteção, aviso e resposta confiáveis contra ameaças comuns." },
];

const recursoLabel: Record<string, string> = { pv: "PV", pp: "PP" };
const trilhaLabel: Record<string, string> = { exaustao: "Exaustão", estresse: "Estresse" };

function emptyAlvoState(): AlvoFormState {
  return { foco: "", ajustes: { pv: "", pp: "", exaustao: "", estresse: "" } };
}

function ResultTable({ resultado, titulo }: { resultado: ResultadoDescansoResumo; titulo: string }) {
  return (
    <div className="rest-results">
      <p className="eyebrow">{titulo}</p>
      {resultado.resultados.map((item: ResultadoDescansoPersonagem) => (
        <article key={item.personagem_id} className="rest-results__personagem">
          <header>
            <strong>{item.nome}</strong>
            {!item.altera && <span className="tag">Sem alterações</span>}
            {item.foco && <span className="tag tag--accent">Foco: {focoOptions.find((option) => option.value === item.foco)?.label ?? item.foco}</span>}
          </header>
          {item.recursos.length > 0 && (
            <div className="rest-table-wrap">
              <table className="rest-table">
                <caption className="sr-only">Recursos de {item.nome}</caption>
                <thead>
                  <tr><th scope="col">Recurso</th><th scope="col">Antes</th><th scope="col">Máximo</th><th scope="col">Calculado</th><th scope="col">Aplicado</th><th scope="col">Depois</th></tr>
                </thead>
                <tbody>
                  {item.recursos.map((recurso) => (
                    <tr key={recurso.recurso}>
                      <th scope="row">{recursoLabel[recurso.recurso] ?? recurso.recurso}</th>
                      <td>{recurso.antes ?? "—"}</td>
                      <td>{recurso.maximo ?? "—"}</td>
                      <td>{recurso.calculado ?? "—"}</td>
                      <td>{recurso.aplicado}</td>
                      <td>{recurso.depois ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {item.recursos.filter((r) => r.aviso).map((r) => <p key={r.recurso} className="preview-note">{r.aviso}</p>)}
            </div>
          )}
          {item.trilhas.length > 0 && (
            <div className="rest-table-wrap">
              <table className="rest-table">
                <caption className="sr-only">Trilhas de {item.nome}</caption>
                <thead>
                  <tr><th scope="col">Trilha</th><th scope="col">Antes</th><th scope="col">Calculado</th><th scope="col">Aplicado</th><th scope="col">Depois</th><th scope="col">Faixa</th></tr>
                </thead>
                <tbody>
                  {item.trilhas.map((trilha) => (
                    <tr key={trilha.trilha}>
                      <th scope="row">{trilhaLabel[trilha.trilha] ?? trilha.trilha}</th>
                      <td>{trilha.antes}</td>
                      <td>{trilha.calculado}</td>
                      <td>{trilha.aplicado}</td>
                      <td>{trilha.depois}</td>
                      <td>{trilha.faixa_antes} → {trilha.faixa_depois}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(item.avisos ?? []).length > 0 && (
            <div role="alert"><ul>{(item.avisos ?? []).map((aviso, index) => <li key={index}>{aviso}</li>)}</ul></div>
          )}
        </article>
      ))}
    </div>
  );
}

export interface RestDialogProps {
  api: ApiClient;
  mesaId: string;
}

/**
 * Ferramenta de descanso do Narrador (8.4/8.5): seleciona alvos e parâmetros,
 * pré-visualiza os resultados calculados pelo servidor (nada é gravado nessa
 * etapa) e só grava ao confirmar, enviando as versões vistas na prévia. Um
 * 409 indica que alguma ficha mudou desde então; a interface mostra o motivo
 * e oferece refazer a prévia antes de tentar de novo.
 */
export function RestDialog({ api, mesaId }: RestDialogProps) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"curto" | "longo">("curto");
  const [conforto, setConforto] = useState(2);
  const [seguranca, setSeguranca] = useState(2);
  const [motivo, setMotivo] = useState("");
  const [alvos, setAlvos] = useState<Record<string, AlvoFormState>>({});
  const [previewResult, setPreviewResult] = useState<ResultadoDescansoResumo | null>(null);
  const [appliedResult, setAppliedResult] = useState<ResultadoDescansoResumo | null>(null);

  const personagens = usePersonagens(api, mesaId, false, { enabled: open });
  const previaMutation = usePreviaDescanso(api, mesaId);
  const confirmarMutation = useConfirmarDescanso(api, mesaId);

  const permiteFoco = previewResult?.permite_foco === true;

  function reset() {
    setTipo("curto");
    setConforto(2);
    setSeguranca(2);
    setMotivo("");
    setAlvos({});
    setPreviewResult(null);
    setAppliedResult(null);
    previaMutation.reset();
    confirmarMutation.reset();
  }

  function close() {
    setOpen(false);
    reset();
  }

  function toggleAlvo(personagemId: string) {
    setPreviewResult(null);
    setAppliedResult(null);
    setAlvos((prev) => {
      const next = { ...prev };
      if (next[personagemId]) delete next[personagemId];
      else next[personagemId] = emptyAlvoState();
      return next;
    });
  }

  function updateAlvo(personagemId: string, patch: Partial<AlvoFormState>) {
    setAlvos((prev) => ({ ...prev, [personagemId]: { ...(prev[personagemId] ?? emptyAlvoState()), ...patch } }));
  }

  function buildAlvos(): AlvoDescanso[] {
    return Object.entries(alvos).map(([personagemId, estado]) => {
      const ajustes: Record<string, number> = {};
      for (const chave of ["pv", "pp", "exaustao", "estresse"] as AjusteChave[]) {
        const valor = estado.ajustes[chave];
        if (valor.trim() !== "" && Number.isFinite(Number(valor))) ajustes[chave] = Number(valor);
      }
      const alvo: AlvoDescanso = { personagem_id: personagemId };
      if (permiteFoco && estado.foco) alvo.foco = estado.foco;
      if (Object.keys(ajustes).length > 0) alvo.ajustes = ajustes;
      return alvo;
    });
  }

  async function handlePreview() {
    setAppliedResult(null);
    try {
      const resultado = await previaMutation.mutateAsync({
        tipo,
        conforto: tipo === "longo" ? conforto : null,
        seguranca: tipo === "longo" ? seguranca : null,
        alvos: buildAlvos(),
      });
      setPreviewResult(resultado);
    } catch {
      setPreviewResult(null);
    }
  }

  async function handleConfirm() {
    if (!previewResult) return;
    const versoes = Object.fromEntries(previewResult.resultados.map((item) => [item.personagem_id, item.versao]));
    try {
      const resultado = await confirmarMutation.mutateAsync({
        tipo,
        conforto: tipo === "longo" ? conforto : null,
        seguranca: tipo === "longo" ? seguranca : null,
        alvos: buildAlvos(),
        versoes,
        motivo: motivo.trim() || undefined,
      });
      setAppliedResult(resultado);
      setPreviewResult(null);
    } catch {
      // erro exposto via confirmarMutation.error abaixo; nada foi gravado.
    }
  }

  const alvoIds = Object.keys(alvos);

  return (
    <>
      <button type="button" className="button button--secondary" onClick={() => setOpen(true)}>
        Preparar descanso
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Preparar descanso"
        description="Escolha os alvos e os parâmetros. Nada é gravado até você confirmar a prévia."
      >
        <fieldset>
          <legend>Tipo de descanso</legend>
          <label>
            <input type="radio" name="descanso-tipo" checked={tipo === "curto"} onChange={() => { setTipo("curto"); setPreviewResult(null); }} /> Descanso curto
          </label>
          <label>
            <input type="radio" name="descanso-tipo" checked={tipo === "longo"} onChange={() => { setTipo("longo"); setPreviewResult(null); }} /> Descanso longo
          </label>
        </fieldset>

        {tipo === "longo" && (
          <div className="rest-notas">
            <label htmlFor="descanso-conforto">Conforto</label>
            <select id="descanso-conforto" value={conforto} onChange={(event) => { setConforto(Number(event.target.value)); setPreviewResult(null); }}>
              {[0, 1, 2, 3, 4].map((nota) => <option key={nota} value={nota}>{nota}</option>)}
            </select>
            <p className="preview-note">{notaTexto[conforto]?.conforto}</p>

            <label htmlFor="descanso-seguranca">Segurança</label>
            <select id="descanso-seguranca" value={seguranca} onChange={(event) => { setSeguranca(Number(event.target.value)); setPreviewResult(null); }}>
              {[0, 1, 2, 3, 4].map((nota) => <option key={nota} value={nota}>{nota}</option>)}
            </select>
            <p className="preview-note">{notaTexto[seguranca]?.seguranca}</p>
          </div>
        )}

        <fieldset>
          <legend>Alvos</legend>
          {personagens.isPending && <p>Carregando personagens…</p>}
          {personagens.isError && <p role="alert">{personagens.error.message}</p>}
          {personagens.isSuccess && personagens.data.length === 0 && <p className="preview-note">Nenhum personagem disponível.</p>}
          {personagens.isSuccess && personagens.data.map((personagem: PersonagemResumo) => {
            const selecionado = alvos[personagem.id];
            return (
              <div key={personagem.id} className="rest-alvo">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(selecionado)}
                    onChange={() => toggleAlvo(personagem.id)}
                  /> {personagem.nome}
                </label>
                {selecionado && (
                  <div className="rest-alvo__detalhes">
                    <label htmlFor={`foco-${personagem.id}`}>Foco de Repouso</label>
                    <select
                      id={`foco-${personagem.id}`}
                      value={selecionado.foco}
                      disabled={!permiteFoco}
                      onChange={(event) => updateAlvo(personagem.id, { foco: event.target.value as Foco | "" })}
                    >
                      <option value="">Nenhum</option>
                      {focoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {!permiteFoco && <small className="preview-note">Disponível só com Conforto 4 e Segurança 4, após a prévia.</small>}

                    <span className="eyebrow">Ajustes manuais (opcional)</span>
                    <div className="rest-alvo__ajustes">
                      {(["pv", "pp", "exaustao", "estresse"] as AjusteChave[]).map((chave) => (
                        <label key={chave} htmlFor={`ajuste-${chave}-${personagem.id}`}>
                          {recursoLabel[chave] ?? trilhaLabel[chave]}
                          <input
                            id={`ajuste-${chave}-${personagem.id}`}
                            type="number"
                            min={0}
                            value={selecionado.ajustes[chave]}
                            onChange={(event) => updateAlvo(personagem.id, { ajustes: { ...selecionado.ajustes, [chave]: event.target.value } })}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>

        {previaMutation.isError && <p role="alert">{previaMutation.error.message}</p>}
        {previewResult && <ResultTable resultado={previewResult} titulo="Prévia (nada foi gravado)" />}

        {confirmarMutation.isError && (
          <>
            <p role="alert">{confirmarMutation.error.message}</p>
            <button type="button" className="button button--secondary" onClick={() => { void handlePreview(); }} disabled={previaMutation.isPending}>
              Refazer prévia
            </button>
          </>
        )}
        {appliedResult && <ResultTable resultado={appliedResult} titulo="Descanso aplicado" />}

        <label htmlFor="descanso-motivo">Motivo (opcional)</label>
        <input id="descanso-motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} />

        <div className="confirmation__actions">
          <button type="button" className="button button--ghost" onClick={close}>Cancelar</button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => { void handlePreview(); }}
            disabled={alvoIds.length === 0 || previaMutation.isPending}
          >
            {previaMutation.isPending ? "Calculando…" : "Pré-visualizar"}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => { void handleConfirm(); }}
            disabled={!previewResult || confirmarMutation.isPending}
          >
            {confirmarMutation.isPending ? "Confirmando…" : "Confirmar"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
