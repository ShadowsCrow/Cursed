import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";

import { useAssetImage } from "../assets/useAssetImage";
import { useCatalogoItens } from "../characters/sheet/catalogoApi";
import type { ApiClient } from "../characters/types";
import { SUBTIPOS_EM_FILA, formatoDoSubtipo, type FormatoItem, type SubtipoCriavel } from "./formatoDoItem";
import { IconeSubtipo } from "./iconesItem";
import "./inventory.css";

export type { FormatoItem, SubtipoCriavel } from "./formatoDoItem";


export function SeletorDeSubtipo({ valor, onEscolher, rotulo, idPrefix, descricao }: {
  valor: SubtipoCriavel | null | undefined;
  onEscolher: (subtipo: SubtipoCriavel) => void;
  rotulo: string;
  idPrefix: string;
  /** Mensagens ligadas ao grupo (problemas de validação). */
  descricao?: string;
}) {
  return (
    <div className="seletor-subtipo" role="radiogroup" aria-labelledby={`${idPrefix}-subtipo-rotulo`} aria-describedby={descricao}>
      <span id={`${idPrefix}-subtipo-rotulo`} className="seletor-subtipo__rotulo">{rotulo}</span>
      <span className="seletor-subtipo__opcoes">
        {SUBTIPOS_EM_FILA.map(([subtipo, nome]) => (
          <label key={subtipo} className={`seletor-subtipo__opcao${valor === subtipo ? " seletor-subtipo__opcao--escolhida" : ""}`}
            title={nome.replace(/ \(.*\)$/, "")}>
            <input type="radio" name={`${idPrefix}-subtipo`} value={subtipo} checked={valor === subtipo}
              onChange={() => onEscolher(subtipo)} aria-label={nome} />
            {subtipo === "outro"
              ? <span className="seletor-subtipo__mais" aria-hidden="true">…</span>
              : <IconeSubtipo subtipo={subtipo} />}
          </label>
        ))}
      </span>
    </div>
  );
}

const inteiro = (texto: string, minimo: number, maximo: number) => {
  const numero = Math.trunc(Number(texto));
  return Number.isFinite(numero) ? Math.min(maximo, Math.max(minimo, numero)) : minimo;
};

function Icone({ api, mesaId, caminho, alt, onLoad }: {
  api: ApiClient; mesaId: string; caminho: string; alt: string; onLoad: (e: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const imagem = useAssetImage(api, mesaId, caminho);
  if (imagem.isError) return <span className="formato-item__falha">Imagem não encontrada</span>;
  if (!imagem.data) return null;
  return <img src={imagem.data} alt={alt} onLoad={onLoad} className="formato-item__icone" />;
}

export function Previa({ formato, nome, api, mesaId, arte }: {
  formato: FormatoItem; nome: string; api?: ApiClient; mesaId?: string; arte?: string | null;
}) {
  const [aviso, setAviso] = useState("");
  const caminho = formato.icone_grade || arte || null;
  const estilo = { "--w": formato.largura, "--h": formato.altura } as CSSProperties;
  function conferir(e: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!formato.icone_grade || !w || !h) return setAviso("");
    const esperado = formato.largura / formato.altura;
    setAviso(Math.abs(w / h - esperado) / esperado > 0.1
      ? `O ícone não está na proporção ${formato.largura}:${formato.altura}; ele será encaixado com moldura.`
      : "");
  }
  return (
    <figure className="formato-item__previa" aria-label={`Prévia na grade: ${formato.largura} por ${formato.altura}`}>
      <div className="formato-item__pegada" style={estilo}>
        {caminho && api && mesaId
          ? <Icone api={api} mesaId={mesaId} caminho={caminho} alt="" onLoad={conferir} />
          : <span className="formato-item__silhueta">{nome || "Item"}</span>}
      </div>
      <figcaption>{formato.largura} x {formato.altura} células{!formato.icone_grade && (arte ? " · usando a arte" : " · sem imagem: silhueta com o nome")}</figcaption>
      {aviso && <p className="formato-item__aviso" role="status">{aviso}</p>}
    </figure>
  );
}

export interface ItemFormatEditorProps {
  valor: FormatoItem | null | undefined;
  onChange: (formato: FormatoItem | null) => void;
  nome: string;
  idPrefix: string;
  api?: ApiClient;
  mesaId?: string;
  /** Arte do item, usada na prévia quando não há ícone de grade. */
  arte?: string | null;
  /**
   * Envio das duas imagens do item (ex.: no editor de cartas): a foto, que aparece na carta e no painel
   * "Item selecionado", e o ícone que ocupa as células do item dentro da bolsa.
   */
  imagens?: { foto: ReactNode; icone: ReactNode };
}

/** Foto do item (a arte), mostrada grande no painel do item e na carta. */
function FotoPrevia({ api, mesaId, caminho, nome }: { api?: ApiClient; mesaId?: string; caminho?: string | null; nome: string }) {
  return (
    <div className="formato-item__foto" aria-label={caminho ? `Foto de ${nome || "item"}` : "Sem foto"} role="img">
      {caminho && api && mesaId
        ? <Icone api={api} mesaId={mesaId} caminho={caminho} alt="" onLoad={() => undefined} />
        : <span className="formato-item__silhueta">Sem foto</span>}
    </div>
  );
}

export function ItemFormatEditor({ valor, onChange, nome, idPrefix, api, mesaId, arte, imagens }: ItemFormatEditorProps) {
  const formato = valor ?? null;
  const catalogo = useCatalogoItens(api, mesaId).data;
  const alterar = (patch: Partial<FormatoItem>) => formato && onChange({ ...formato, ...patch });
  const alterarMochila = (patch: { linhas?: number; colunas?: number; requisito_forca?: number | null }) => {
    const atual = formato?.mochila;
    alterar({ mochila: {
      linhas: patch.linhas ?? atual?.linhas ?? 0,
      colunas: patch.colunas ?? atual?.colunas ?? 0,
      requisito_forca: "requisito_forca" in patch ? patch.requisito_forca ?? null : atual?.requisito_forca ?? null,
    } });
  };
  return (
    <fieldset className="formato-item">
      <legend>Formato na grade</legend>
      {/* Trocar o tipo mantém ícone e raridade; a categoria só existe em Outros. */}
      <SeletorDeSubtipo valor={formato?.subtipo as SubtipoCriavel | undefined} rotulo="Tipo na grade" idPrefix={idPrefix}
        onEscolher={(subtipo) => onChange(formatoDoSubtipo(subtipo, formato))} />
      {!formato && <p className="formato-item__dica">Sem tipo e dimensão o item não entra na grade nem pode ser publicado como carta.</p>}
      {formato && (
        <>
          <div className="formato-item__linha">
            <label>Largura
              <input type="number" min={1} max={12} value={formato.largura} onChange={(e) => alterar({ largura: inteiro(e.target.value, 1, 12) })} />
            </label>
            <label>Altura
              <input type="number" min={1} max={12} value={formato.altura} onChange={(e) => alterar({ altura: inteiro(e.target.value, 1, 12) })} />
            </label>
            <button type="button" className="button button--secondary" onClick={() => alterar({ largura: formato.altura, altura: formato.largura })}>
              Girar
            </button>
          </div>
          {catalogo && (
            <div className="formato-item__linha">
              <label>Raridade
                <select value={formato.raridade ?? catalogo.raridades[0]?.id ?? ""} onChange={(e) => alterar({ raridade: e.target.value })}>
                  {catalogo.raridades.map((r) => <option key={r.id} value={r.id}>{r.rotulo}</option>)}
                </select>
              </label>
              {formato.subtipo === "outro" && (
                <label>Categoria
                  <select value={formato.categoria ?? catalogo.categorias.find((c) => c.padrao_outros)?.id ?? ""}
                    onChange={(e) => alterar({ categoria: e.target.value })}>
                    {catalogo.categorias.filter((c) => c.escolha_em_outros).map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          {formato.subtipo === "uma_mao" && (
            <label className="checkbox-row">
              <input type="checkbox" checked={formato.versatil === true}
                onChange={(e) => alterar({ versatil: e.target.checked })} />
              Versátil (o jogador alterna entre uma e duas mãos)
            </label>
          )}
          {formato.subtipo === "outro" && (
            <div className="formato-item__linha">
              <label>Ocupa mãos
                <select value={formato.maos ?? 0} onChange={(e) => alterar({ maos: Number(e.target.value) })}>
                  <option value={0}>Nenhuma</option><option value={1}>1 mão</option><option value={2}>2 mãos</option>
                </select>
              </label>
              <label>Empilha até (por célula)
                <input type="number" min={1} max={999} value={formato.pilha_max ?? 1} onChange={(e) => alterar({ pilha_max: inteiro(e.target.value, 1, 999) })} />
              </label>
            </div>
          )}
          {formato.subtipo === "mochila" && formato.mochila && (
            <div className="formato-item__linha">
              <label>Linhas a mais
                <input type="number" min={0} max={4} value={formato.mochila.linhas ?? 0}
                  onChange={(e) => alterarMochila({ linhas: inteiro(e.target.value, 0, 4) })} />
              </label>
              <label>Colunas a mais
                <input type="number" min={0} max={4} value={formato.mochila.colunas ?? 0}
                  onChange={(e) => alterarMochila({ colunas: inteiro(e.target.value, 0, 4) })} />
              </label>
              <label>Requisito de Força
                <input type="number" min={0} max={10} value={formato.mochila.requisito_forca ?? ""}
                  onChange={(e) => alterarMochila({ requisito_forca: e.target.value === "" ? null : inteiro(e.target.value, 0, 10) })} />
              </label>
            </div>
          )}
          {formato.subtipo === "aljava" && formato.aljava && (
            <label>Capacidade de flechas
              <input type="number" min={1} max={200} value={formato.aljava.capacidade_flechas}
                onChange={(e) => alterar({ aljava: { capacidade_flechas: inteiro(e.target.value, 1, 200) } })} />
            </label>
          )}
          {!imagens && <Previa formato={formato} nome={nome} api={api} mesaId={mesaId} arte={arte} />}
        </>
      )}
      {imagens && (
        <section className="formato-item__imagens" aria-label="Imagens do item">
          <div className="formato-item__imagem">
            <strong>Foto do item</strong>
            <small>Aparece na carta e no painel “Item selecionado”. Qualquer proporção.</small>
            <FotoPrevia api={api} mesaId={mesaId} caminho={arte} nome={nome} />
            {imagens.foto}
          </div>
          <div className="formato-item__imagem">
            <strong>Ícone na bolsa</strong>
            {formato ? (
              <>
                <small>
                  Ocupa {formato.largura} × {formato.altura} célula{formato.largura * formato.altura > 1 ? "s" : ""} da grade.
                  Use essa proporção (por exemplo, {formato.largura * 256} × {formato.altura * 256} px), de preferência com fundo transparente.
                  Sem ícone, a bolsa usa a foto.
                </small>
                <Previa formato={formato} nome={nome} api={api} mesaId={mesaId} arte={arte} />
                {imagens.icone}
              </>
            ) : <small>Escolha o tipo na grade para enviar o ícone: ele precisa da dimensão do item.</small>}
          </div>
        </section>
      )}
    </fieldset>
  );
}
