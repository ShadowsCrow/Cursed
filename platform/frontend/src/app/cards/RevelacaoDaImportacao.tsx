import { useState } from "react";

import { MolduraOrnamentada } from "../../ui/Ornamentos";
import { Dialog } from "../../ui/primitives";
import { useCatalogoFramework } from "../characters/sheet/catalogoApi";
import { dadosDoConteudo, type Dado } from "../characters/sheet/cartas/dadosDoGrimorio";
import { IconeDoDado } from "../characters/sheet/cartas/grimorio";
import type { ApiClient } from "../characters/types";
import { useImportarCarta, usePreviaImportacaoCarta } from "./api";
import { CardFace } from "./cardView";
import { ehNatureza } from "./criacao";
import type { ProblemaValidacao } from "./types";
import { ancoraDoProblema, rotuloDaAncora } from "./usoDosProblemas";
import "./revelacao.css";

/*
 * Pré-visualização da importação como revelação da carta (adaptar-cartas-ao-framework, 9.2), pelo conceito
 * escolhido (`arte/conceito-previa.png` da mudança): a carta grande e inclinada, com brilho, à esquerda; à
 * direita, o painel com os destaques do Framework, os demais campos, os avisos e as ações. Antes da prévia, só o
 * campo do código. Moldura, círculo, brasas e selo são SVG/CSS; nenhuma pintura é necessária.
 */

/** Os três valores que viram medalhões, na ordem do conceito. */
const DESTAQUES = ["Grau", "Custo de uso", "Potência de uso"] as const;
const ROTULO_DO_DESTAQUE: Record<(typeof DESTAQUES)[number], string> = {
  Grau: "Grau", "Custo de uso": "Custo de uso", "Potência de uso": "Potência",
};

const rotuloDoProblema = (campo: string) => rotuloDaAncora(ancoraDoProblema(campo));

function valorDoDestaque(dado: Dado): string {
  const valor = typeof dado.valor === "string" ? dado.valor : "";
  if (!valor || valor.startsWith("Não definid")) return "—";
  return dado.rotulo === "Custo de uso" ? `${valor} PP` : valor;
}

export function ImportarCartaDialog({ api, mesaId, onClose }: { api: ApiClient; mesaId: string; onClose: () => void }) {
  const [codigo, setCodigo] = useState("");
  const previa = usePreviaImportacaoCarta(api, mesaId);
  const importar = useImportarCarta(api, mesaId);
  const framework = useCatalogoFramework(api, mesaId).data;
  const erro = (importar.error ?? previa.error) as (Error & { problemas?: ProblemaValidacao[] }) | null;
  const dados = previa.data
    ? dadosDoConteudo(previa.data.tipo, previa.data.rascunho, true, { calculados: previa.data.calculados, framework })
    : [];
  const destaques = previa.data && ehNatureza(previa.data.tipo)
    ? DESTAQUES.map((rotulo) => dados.find((d) => d.rotulo === rotulo)).filter((d): d is Dado => Boolean(d))
    : [];
  const linhas = dados.filter((d) => !(DESTAQUES as readonly string[]).includes(d.rotulo));
  const problemas = previa.data?.validacao.problemas ?? [];
  const avisos = [...(previa.data?.validacao.revisao_pendente ?? []), ...(previa.data?.avisos ?? [])];
  const formato = codigo.trim().split(":", 1)[0] || "Código";

  return (
    <Dialog open title="Importar carta por código" onClose={onClose} className={`revelacao${previa.data ? " revelacao--aberta" : ""}`}>
      {!previa.data ? (
        <MolduraOrnamentada fundo="vazio" className="revelacao__entrada">
          <label className="revelacao__rotulo">Código CR1, E1, E2, EQ1 ou EQ2
            <textarea className="revelacao__codigo-campo" value={codigo} rows={5} placeholder="Cole aqui o código da carta"
              onChange={(e) => { setCodigo(e.target.value); previa.reset(); }} />
          </label>
          {erro && <p role="alert" className="revelacao__erro">{erro.message}</p>}
          {erro?.problemas?.length ? (
            <ul className="revelacao__erro">{erro.problemas.map((p) => <li key={p.campo}>{rotuloDoProblema(p.campo)}: {p.mensagem}</li>)}</ul>
          ) : null}
          <div className="revelacao__acoes">
            <button type="button" className="revelacao__botao revelacao__botao--fantasma" onClick={onClose}>Cancelar</button>
            <button type="button" className="revelacao__botao revelacao__botao--ouro" disabled={!codigo.trim() || previa.isPending}
              onClick={() => previa.mutate(codigo.trim())}>
              {previa.isPending ? "Lendo o código…" : "Pré-visualizar"}
            </button>
          </div>
        </MolduraOrnamentada>
      ) : (
        <div className="revelacao__palco">
          <div className="revelacao__cena">
            <CirculoMagico />
            <span className="revelacao__brasas" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</span>
            <div className="revelacao__carta">
              <CardFace tipo={previa.data.tipo} conteudo={previa.data.rascunho} api={api} mesaId={mesaId} narrador
                rodape="Rascunho a criar" />
            </div>
          </div>

          <MolduraOrnamentada as="section" tipo="painel" fundo="vazio" className="revelacao__painel" aria-labelledby="revelacao-titulo">
            <p className="revelacao__colado">
              <IconeDoDado nome="legado" />
              <span>Código colado</span>
              <span aria-hidden="true">·</span>
              <button type="button" className="revelacao__trocar" onClick={() => previa.reset()}>Trocar código</button>
            </p>
            <h3 id="revelacao-titulo" className="revelacao__titulo">
              Prévia da importação
              <span className="revelacao__formato">{formato}</span>
            </h3>

            {destaques.length > 0 && (
              <dl className="revelacao__destaques" aria-label="Valores calculados">
                {destaques.map((dado) => (
                  <div key={dado.rotulo} className="revelacao__medalhao">
                    <IconeDoDado nome={dado.icone} />
                    <dt>{ROTULO_DO_DESTAQUE[dado.rotulo as (typeof DESTAQUES)[number]]}</dt>
                    <dd>{valorDoDestaque(dado)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {linhas.length > 0 && (
              <dl className="revelacao__dados" aria-label="Dados da carta">
                {linhas.map((dado) => (
                  <div key={dado.rotulo} className="revelacao__linha">
                    <IconeDoDado nome={dado.icone} />
                    <dt>{dado.rotulo}</dt>
                    <dd>{dado.valor}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="revelacao__estado" role="status">
              {problemas.length > 0 ? (
                <ul className="revelacao__problemas">
                  {problemas.map((p) => <li key={p.campo}><strong>{rotuloDoProblema(p.campo)}:</strong> {p.mensagem}</li>)}
                </ul>
              ) : avisos.length > 0 ? (
                <ul className="revelacao__avisos">{avisos.map((aviso) => <li key={aviso}>⚠ {aviso}</li>)}</ul>
              ) : (
                <p className="revelacao__valido"><IconeValido /> Código válido · nenhum aviso</p>
              )}
              {problemas.length > 0 && avisos.length > 0 && (
                <ul className="revelacao__avisos">{avisos.map((aviso) => <li key={aviso}>⚠ {aviso}</li>)}</ul>
              )}
            </div>
            {erro && <p role="alert" className="revelacao__erro">{erro.message}</p>}

            <p className="revelacao__nota">A carta será criada como rascunho; publicar continua sendo uma decisão sua.</p>
            <div className="revelacao__acoes">
              <button type="button" className="revelacao__botao revelacao__botao--fantasma" onClick={onClose}>Cancelar</button>
              <button type="button" className="revelacao__botao revelacao__botao--selo" disabled={!previa.data.validacao.valida || importar.isPending}
                onClick={() => importar.mutate(codigo.trim(), { onSuccess: onClose })}>
                <SeloDeCera />
                <span>{importar.isPending ? "Criando…" : "Criar rascunho"}</span>
              </button>
            </div>
          </MolduraOrnamentada>
        </div>
      )}
    </Dialog>
  );
}

/** Círculo de runas sob a carta, como o chão do conceito. */
function CirculoMagico() {
  return (
    <svg className="revelacao__circulo" viewBox="0 0 400 120" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="60" rx="190" ry="52" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="200" cy="60" rx="160" ry="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 7" />
      <ellipse cx="200" cy="60" rx="122" ry="31" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="200" cy="60" rx="80" ry="20" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="12 5 2 5" />
    </svg>
  );
}

/** Selo de cera do botão principal, com a estrela do grimório. */
function SeloDeCera() {
  return (
    <svg className="revelacao__selo" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 2.5c2.4 0 3.4 2 5.6 2.6 2.3.6 4.3-.6 5.9 1 1.6 1.7.4 3.7 1 6 .6 2.2 2.6 3.3 2.6 5.6s-2 3.4-2.6 5.6c-.6 2.3.6 4.3-1 6-1.6 1.6-3.6.4-5.9 1-2.2.6-3.2 2.6-5.6 2.6s-3.4-2-5.6-2.6c-2.3-.6-4.3.6-5.9-1-1.6-1.7-.4-3.7-1-6-.6-2.2-2.6-3.3-2.6-5.6s2-3.4 2.6-5.6c.6-2.3-.6-4.3 1-6 1.6-1.6 3.6-.4 5.9-1C16.6 4.5 17.6 2.5 20 2.5Z" fill="#8f1d14" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke="#e7b86b" strokeWidth="1.2" opacity=".75" />
      <path d="M20 10.5l2.3 6.3 6.6.2-5.2 4.1 1.9 6.4L20 23.7l-5.6 3.8 1.9-6.4-5.2-4.1 6.6-.2Z" fill="#e7b86b" opacity=".9" />
    </svg>
  );
}

/** Círculo com o visto (Lucide circle-check, licença ISC). */
function IconeValido() {
  return (
    <svg className="revelacao__icone-valido" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}
