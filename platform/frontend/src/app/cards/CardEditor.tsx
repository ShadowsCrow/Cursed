import { useState } from "react";

import { Confirmation, Dialog } from "../../ui/primitives";
import { ModifiersEditor } from "../characters/sheet/EffectsPanel";
import type { ApiClient, ModificadorResumo } from "../characters/types";
import { usePublicarCarta, useSalvarRascunho, useValidarCarta, useVersoesCarta } from "./api";
import { inteiroOuNulo } from "./cardFormat";
import { CardFace } from "./cardView";
import { ROTULO_TIPO, type CartaDefinicaoResumo, type ProblemaValidacao, type TipoCarta, type ValidacaoCarta } from "./types";

type Rascunho = Record<string, unknown>;

const CAMPOS_CUSTO: [string, string][] = [
  ["custo_aprendizado", "Custo de Aprendizado (PP)"],
  ["descansos_minimos", "Descansos Mínimos"],
  ["potencia_uso", "Potência de Uso"],
  ["custo_uso", "Custo de Uso"],
];
const DADOS_ITEM: [string, string][] = [["dano", "Dano"], ["armadura", "Armadura"], ["rdb", "RDB"], ["peso", "Peso (kg)"]];

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function numeroOuVazio(valor: unknown): string {
  return typeof valor === "number" ? String(valor) : "";
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : [];
}

function Problemas({ validacao, erro }: { validacao?: ValidacaoCarta | null; erro?: { message: string; problemas: ProblemaValidacao[] } | null }) {
  const problemas = erro?.problemas.length ? erro.problemas : validacao?.problemas ?? [];
  return (
    <>
      {erro && <p role="alert">{erro.message}</p>}
      {problemas.length > 0 && (
        <div role="status" className="card-editor__problems">
          <strong>Corrija antes de publicar:</strong>
          <ul>{problemas.map((p) => <li key={`${p.campo}-${p.mensagem}`}><code>{p.campo}</code>: {p.mensagem}</li>)}</ul>
        </div>
      )}
      {validacao?.valida && problemas.length === 0 && <p role="status">A carta está pronta para publicação.</p>}
      {(validacao?.revisao_pendente ?? []).map((aviso) => <p key={aviso} className="card-editor__review" role="note">⚠ {aviso}</p>)}
    </>
  );
}

function CamposPorTipo({ tipo, rascunho, alterar }: { tipo: TipoCarta; rascunho: Rascunho; alterar: (patch: Rascunho) => void }) {
  if (tipo === "habilidade" || tipo === "magia") {
    const adicionais = Array.isArray(rascunho.custos_adicionais) ? (rascunho.custos_adicionais as Rascunho[]) : [];
    return (
      <>
        {tipo === "magia" && (
          <div className="form-row">
            <label>Escola<input value={texto(rascunho.escola)} onChange={(e) => alterar({ escola: e.target.value || null })} /></label>
            <label>Grau<input type="number" min={0} value={numeroOuVazio(rascunho.grau)} onChange={(e) => alterar({ grau: inteiroOuNulo(e.target.value) })} /></label>
          </div>
        )}
        <label>Ativação
          <select value={texto(rascunho.ativacao)} onChange={(e) => alterar({ ativacao: e.target.value || null })}>
            <option value="">Não definida</option><option value="ativa">Ativa</option><option value="passiva">Passiva</option>
          </select>
        </label>
        <fieldset className="card-editor__costs">
          <legend>Custos (deixe em branco o que ainda não foi definido)</legend>
          {CAMPOS_CUSTO.map(([campo, rotulo]) => (
            <label key={campo}>{rotulo}
              <input type="number" min={0} value={numeroOuVazio(rascunho[campo])} onChange={(e) => alterar({ [campo]: inteiroOuNulo(e.target.value) })} />
            </label>
          ))}
          {adicionais.map((adicional, indice) => (
            <div key={indice} className="form-row">
              <label>Recurso adicional<input value={texto(adicional.recurso)} onChange={(e) => alterar({
                custos_adicionais: adicionais.map((a, i) => (i === indice ? { ...a, recurso: e.target.value } : a)),
              })} /></label>
              <label>Valor<input type="number" min={0} value={numeroOuVazio(adicional.valor)} onChange={(e) => alterar({
                custos_adicionais: adicionais.map((a, i) => (i === indice ? { ...a, valor: inteiroOuNulo(e.target.value) } : a)),
              })} /></label>
              <button type="button" className="button button--ghost" onClick={() => alterar({ custos_adicionais: adicionais.filter((_, i) => i !== indice) })}>Remover</button>
            </div>
          ))}
          <button type="button" className="button button--secondary" onClick={() => alterar({ custos_adicionais: [...adicionais, { recurso: "", valor: null }] })}>
            Adicionar custo adicional
          </button>
        </fieldset>
        <label>Custo legado (texto histórico; não preenche os campos acima)
          <input value={texto(rascunho.custo_legado)} onChange={(e) => alterar({ custo_legado: e.target.value || null })} />
        </label>
      </>
    );
  }
  if (tipo === "item") {
    const dados = rascunho.dados && typeof rascunho.dados === "object" ? (rascunho.dados as Rascunho) : {};
    const efeitos = Array.isArray(rascunho.efeitos) ? (rascunho.efeitos as Rascunho[]) : [];
    return (
      <>
        <div className="form-row">
          <label>Tipo de item
            <select value={texto(rascunho.item_tipo)} onChange={(e) => alterar({ item_tipo: e.target.value })}>
              <option value="">Escolha…</option><option value="arma">Arma</option><option value="armadura">Armadura</option><option value="outro">Outro</option>
            </select>
          </label>
          <label>Quantidade<input type="number" min={1} value={numeroOuVazio(rascunho.quantidade) || "1"} onChange={(e) => alterar({ quantidade: inteiroOuNulo(e.target.value) ?? 1 })} /></label>
        </div>
        <div className="form-row">
          {DADOS_ITEM.map(([campo, rotulo]) => (
            <label key={campo}>{rotulo}
              <input value={dados[campo] === undefined ? "" : String(dados[campo])} onChange={(e) => {
                const valor = e.target.value.trim();
                const numero = Number(valor);
                const proximo = { ...dados };
                if (!valor) delete proximo[campo];
                else proximo[campo] = campo === "dano" || Number.isNaN(numero) ? valor : numero;
                alterar({ dados: proximo });
              }} />
            </label>
          ))}
        </div>
        {efeitos.map((efeito, indice) => (
          <fieldset key={indice} className="card-editor__effect">
            <legend>Efeito do item {indice + 1}</legend>
            <label>Nome<input value={texto(efeito.nome)} onChange={(e) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, nome: e.target.value } : x)) })} /></label>
            <label>Descrição<textarea value={texto(efeito.descricao)} onChange={(e) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, descricao: e.target.value } : x)) })} /></label>
            <label>Ativação
              <select value={texto(efeito.ativacao) || "enquanto_equipado"} onChange={(e) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, ativacao: e.target.value } : x)) })}>
                <option value="enquanto_equipado">Enquanto equipado</option><option value="manual">Manual</option>
              </select>
            </label>
            <ModifiersEditor
              idPrefix={`item-efeito-${indice}`}
              value={(efeito.modificadores as ModificadorResumo[] | undefined) ?? []}
              onChange={(modificadores) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, modificadores } : x)) })}
            />
            <button type="button" className="button button--ghost" onClick={() => alterar({ efeitos: efeitos.filter((_, i) => i !== indice) })}>Remover efeito</button>
          </fieldset>
        ))}
        <button type="button" className="button button--secondary" onClick={() => alterar({ efeitos: [...efeitos, { nome: "", descricao: "", modificadores: [], ativacao: "enquanto_equipado" }] })}>
          Adicionar efeito ao item
        </button>
      </>
    );
  }
  return (
    <>
      <label>Duração (rodadas)<input type="number" min={1} value={numeroOuVazio(rascunho.duracao_rodadas)} onChange={(e) => alterar({ duracao_rodadas: inteiroOuNulo(e.target.value) })} /></label>
      <ModifiersEditor idPrefix="efeito" value={(rascunho.modificadores as ModificadorResumo[] | undefined) ?? []} onChange={(modificadores) => alterar({ modificadores })} />
    </>
  );
}

export interface CardEditorProps {
  api: ApiClient;
  mesaId: string;
  definicao: CartaDefinicaoResumo;
  onClose: () => void;
}

/** Editor do Narrador (9.3): rascunho, validação, publicação e prévia fiel ao que os jogadores verão. */
export function CardEditor({ api, mesaId, definicao, onClose }: CardEditorProps) {
  const tipo = definicao.tipo;
  const [rascunho, setRascunho] = useState<Rascunho>(() => {
    const { tipo: _tipo, ...resto } = (definicao.rascunho ?? {}) as Rascunho;
    void _tipo;
    return resto;
  });
  const [versao, setVersao] = useState(definicao.versao);
  const [alterado, setAlterado] = useState(false);
  const [confirmarPublicacao, setConfirmarPublicacao] = useState(false);
  const salvar = useSalvarRascunho(api, mesaId);
  const validar = useValidarCarta(api, mesaId);
  const publicar = usePublicarCarta(api, mesaId);
  const versoes = useVersoesCarta(api, mesaId, definicao.id);

  function alterar(patch: Rascunho) {
    setRascunho((atual) => ({ ...atual, ...patch }));
    setAlterado(true);
  }

  async function salvarRascunho(): Promise<number> {
    const salvo = await salvar.mutateAsync({ cartaId: definicao.id, rascunho, versao });
    setVersao(salvo.versao);
    setAlterado(false);
    return salvo.versao;
  }

  async function validarAgora() {
    if (alterado) await salvarRascunho();
    await validar.mutateAsync(definicao.id);
  }

  async function publicarAgora() {
    setConfirmarPublicacao(false);
    const atual = alterado ? await salvarRascunho() : versao;
    const publicada = await publicar.mutateAsync({ cartaId: definicao.id, versao: atual });
    setVersao(atual + 1);
    return publicada;
  }

  const erroPublicacao = publicar.error as (Error & { problemas?: ProblemaValidacao[] }) | null;
  return (
    <Dialog open title={`Editar ${ROTULO_TIPO[tipo].toLowerCase()}`} onClose={onClose} className="card-editor">
      <div className="card-editor__layout">
        <form className="card-editor__form" onSubmit={(e) => { e.preventDefault(); void salvarRascunho().catch(() => undefined); }}>
          <label>Título<input value={texto(rascunho.titulo)} onChange={(e) => alterar({ titulo: e.target.value })} /></label>
          <label>Texto<textarea value={texto(rascunho.texto)} onChange={(e) => alterar({ texto: e.target.value })} /></label>
          <label>Requisitos (um por linha)
            <textarea value={lista(rascunho.requisitos).join("\n")} onChange={(e) => alterar({ requisitos: e.target.value.split("\n").map((r) => r.trim()).filter(Boolean) })} />
          </label>
          <label>Tags (separadas por vírgula)
            <input value={lista(rascunho.tags).join(", ")} onChange={(e) => alterar({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
          </label>
          <CamposPorTipo tipo={tipo} rascunho={rascunho} alterar={alterar} />
          {salvar.isError && <p role="alert">{salvar.error.message}</p>}
          <div className="dialog__actions">
            <button type="submit" className="button button--secondary" disabled={salvar.isPending}>{alterado ? "Salvar rascunho" : "Rascunho salvo"}</button>
            <button type="button" className="button button--ghost" onClick={() => void validarAgora().catch(() => undefined)} disabled={validar.isPending}>Validar</button>
            <button type="button" className="button" onClick={() => setConfirmarPublicacao(true)} disabled={publicar.isPending}>Publicar nova versão</button>
          </div>
          <Problemas validacao={validar.data} erro={erroPublicacao ? { message: erroPublicacao.message, problemas: erroPublicacao.problemas ?? [] } : null} />
          {publicar.isSuccess && <p role="status">Versão {publicar.data.numero} publicada. Personagens existentes continuam na versão que já possuem.</p>}
        </form>
        <aside className="card-editor__preview" aria-label="Prévia da carta">
          <span className="eyebrow">COMO OS JOGADORES VERÃO</span>
          <CardFace tipo={tipo} conteudo={rascunho} />
          <h3>Versões publicadas</h3>
          {versoes.data && versoes.data.length > 0 ? (
            <ol className="card-editor__versions">
              {versoes.data.map((v) => <li key={v.id}>Versão {v.numero} — {new Date(v.publicado_em).toLocaleString("pt-BR")}{v.revisao_pendente?.length ? " · revisão pendente" : ""}</li>)}
            </ol>
          ) : <p>Nenhuma versão publicada ainda.</p>}
        </aside>
      </div>
      <Confirmation
        open={confirmarPublicacao}
        title="Publicar nova versão?"
        description="A versão publicada não pode ser alterada. Personagens que já possuem a carta continuam na versão atual até uma migração explícita."
        confirmLabel="Publicar"
        onConfirm={() => void publicarAgora().catch(() => undefined)}
        onCancel={() => setConfirmarPublicacao(false)}
      />
    </Dialog>
  );
}
