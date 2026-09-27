import { useState, type CSSProperties, type SyntheticEvent } from "react";

import type { components } from "../../api/generated/schema";
import { useAssetImage } from "../assets/useAssetImage";
import type { ApiClient } from "../characters/types";
import type { Subtipo } from "./gridEngine";
import "./inventory.css";

/** Formato do item na grade, definido na criação (carga-por-espacos 5.2). */
// O cliente gerado marca como obrigatório todo booleano com padrão; aqui `versatil` fica opcional.
export type FormatoItem = Omit<components["schemas"]["FormatoItemGrade"], "versatil"> & { versatil?: boolean };
type SubtipoCriavel = Exclude<Subtipo, "moedas" | "criatura">;


const GRUPOS: Array<[string, Array<[SubtipoCriavel, string]>]> = [
  ["Armadura", [["peitoral", "Peitoral"], ["capacete", "Capacete"], ["luvas", "Luvas"], ["botas", "Botas"]]],
  ["Armas", [["uma_mao", "Uma mão"], ["duas_maos", "Duas mãos"]]],
  ["Escudo", [["escudo", "Escudo"]]],
  ["Acessórios", [["mochila", "Mochila"], ["aljava", "Aljava"]]],
  ["Outros", [["outro", "Outros (não se equipa, mas ocupa espaço)"]]],
];

/** Dimensões de referência aprovadas na calibração (docs/regras/calibracao-carga-em-grade.md); o Narrador ajusta à vontade. */
const SUGESTAO: Record<SubtipoCriavel, FormatoItem> = {
  peitoral: { subtipo: "peitoral", largura: 2, altura: 3 },
  capacete: { subtipo: "capacete", largura: 1, altura: 1 },
  luvas: { subtipo: "luvas", largura: 1, altura: 1 },
  botas: { subtipo: "botas", largura: 1, altura: 2 },
  uma_mao: { subtipo: "uma_mao", largura: 1, altura: 3 },
  duas_maos: { subtipo: "duas_maos", largura: 1, altura: 4 },
  escudo: { subtipo: "escudo", largura: 2, altura: 2 },
  mochila: { subtipo: "mochila", largura: 2, altura: 2, mochila: { linhas: 1, colunas: 0, requisito_forca: 2 } },
  aljava: { subtipo: "aljava", largura: 1, altura: 2, aljava: { capacidade_flechas: 20 } },
  outro: { subtipo: "outro", largura: 1, altura: 1, maos: 0, pilha_max: 1 },
};

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

function Previa({ formato, nome, api, mesaId, arte }: {
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
}

export function ItemFormatEditor({ valor, onChange, nome, idPrefix, api, mesaId, arte }: ItemFormatEditorProps) {
  const formato = valor ?? null;
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
      <label htmlFor={`${idPrefix}-subtipo`}>Tipo na grade</label>
      <select
        id={`${idPrefix}-subtipo`}
        value={formato?.subtipo ?? ""}
        onChange={(e) => {
          const subtipo = e.target.value as SubtipoCriavel | "";
          onChange(subtipo ? { ...SUGESTAO[subtipo], ...(formato?.icone_grade ? { icone_grade: formato.icone_grade } : {}) } : null);
        }}
      >
        <option value="">Escolha…</option>
        {GRUPOS.map(([grupo, opcoes]) => (
          <optgroup key={grupo} label={grupo}>
            {opcoes.map(([valorOpcao, rotulo]) => <option key={valorOpcao} value={valorOpcao}>{rotulo}</option>)}
          </optgroup>
        ))}
      </select>
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
          <label>Ícone de grade (imagem no armazenamento da mesa, na proporção da dimensão)
            <input value={formato.icone_grade ?? ""} placeholder={mesaId ? `mesas/${mesaId}/mesa/icone.png` : ""}
              onChange={(e) => alterar({ icone_grade: e.target.value.trim() || null })} />
          </label>
          <Previa formato={formato} nome={nome} api={api} mesaId={mesaId} arte={arte} />
        </>
      )}
    </fieldset>
  );
}
