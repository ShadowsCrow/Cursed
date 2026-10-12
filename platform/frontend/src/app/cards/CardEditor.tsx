import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Confirmation } from "../../ui/primitives";
import { ModifiersEditor } from "../characters/sheet/EffectsPanel";
import { ImageUpload } from "../assets/ImageUpload";
import { useCatalogoFramework, useCatalogoItens, type CatalogoFramework, type CatalogoItens } from "../characters/sheet/catalogoApi";
import { categoriaDaCarta } from "../characters/sheet/cartas/apresentacao";
import { ArteDoGrimorio, CantosDoGrimorio, MolduraDoGrimorio } from "../characters/sheet/cartas/DetalheDaCarta";
import { EstrelaDoGrimorio } from "../characters/sheet/cartas/grimorio";
import {
  ARTE_DO_EDITOR, ARTE_DO_MARCADOR, ARTE_DO_MARCADOR_ATIVO, ARTE_DO_SELO, usePintura,
} from "../characters/sheet/cartas/pinturasDasCartas";
import "../characters/sheet/cartas/cartas.css";
import { Previa, SeletorDeSubtipo } from "../inventory/ItemFormatEditor";
import { formatoDoSubtipo, type FormatoItem, type SubtipoCriavel } from "../inventory/formatoDoItem";
import { IconeCategoria } from "../inventory/iconesItem";
import type { ApiClient, ModificadorResumo } from "../characters/types";
import { cardKeys, useCatalogo, usePublicarCarta, useVersoesCarta } from "./api";
import {
  CampoCalculado, CampoEscolha, CampoEscolhas, CampoEtiquetas, CampoInteiro, CampoTexto, CampoTextoLongo, Quadro, type PropsDoControle,
} from "./camposDoEditor";
import { calcular, ehNatureza, rotulo } from "./criacao";
import { IconeDoCampo } from "./iconesDosCampos";
import { MensagensDoCampo, ProvedorDeProblemas } from "./problemasDoEditor";
import { useProblemasDoCampo, useProblemasDoEditor } from "./usoDosProblemas";
import { useSalvamentoAutomatico, type SalvamentoAutomatico } from "./useSalvamentoAutomatico";
import { ROTULO_TIPO, TIPOS_CARTA, erroDaApi, type CartaDefinicaoResumo, type ProblemaValidacao, type TipoCarta } from "./types";
import "./editor.css";

/*
 * Editor de cartas do Narrador (simplificar-criacao-de-cartas): cópia fiel do conceito aprovado
 * (`referencia/conceito-editor-mochila.png`). Uma etapa só: o tipo nos marcadores do topo do livro, a carta ao
 * vivo na página esquerda (título editável e câmera na arte), os campos que se aplicam em quadros na direita e,
 * no pé, o estado do salvamento automático e o selo Publicar.
 */

type Rascunho = Record<string, unknown>;

/** Campos que todos os tipos têm: ficam ao trocar o tipo (D3). */
const CAMPOS_COMUNS = new Set(["titulo", "texto", "requisitos", "tags", "ativos", "ativos_privados"]);
/** Campos do Framework comuns a habilidades e magias: ficam ao trocar entre as duas (adaptar-cartas-ao-framework). */
const CAMPOS_DE_CRIACAO = new Set([
  "ativacao", "ativacao_legado", "lancamento", "combo", "persistencia", "alcance", "forma", "alvo_area", "impactos", "duracao",
  "efeito_principal", "efeitos_secundarios", "efeitos_condicionais", "teste", "componentes", "limitacoes", "escalonamento",
  "custo_aprendizado", "potencia_uso", "custo_uso", "custos_adicionais", "custo_legado",
]);
const ROTULO_DO_DESCARTE: Record<string, string> = { escola: "a Escola", disciplina: "a Disciplina" };
const EMBLEMA_DO_TIPO: Record<TipoCarta, string> = { habilidade: "habilidades", magia: "magias", item: "acessorios", efeito: "efeitos" };
const CATEGORIA_POR_SUBTIPO: Record<SubtipoCriavel, "arma" | "armadura" | "outro"> = {
  uma_mao: "arma", duas_maos: "arma",
  peitoral: "armadura", capacete: "armadura", luvas: "armadura", botas: "armadura", escudo: "armadura",
  mochila: "outro", aljava: "outro", outro: "outro",
};

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
const lista = (valor: unknown) => (Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : []);
const vazio = (valor: unknown) => valor === null || valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0);
const objeto = (valor: unknown): Rascunho => (valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Rascunho : {});

function ficaAoTrocar(chave: string, de: TipoCarta, para: TipoCarta): boolean {
  return CAMPOS_COMUNS.has(chave) || (ehNatureza(de) && ehNatureza(para) && CAMPOS_DE_CRIACAO.has(chave));
}

/** Os valores preenchidos que deixam de valer ao trocar o tipo da carta. */
function descartesDoTipo(rascunho: Rascunho, de: TipoCarta, para: TipoCarta): string[] {
  return Object.entries(rascunho).filter(([chave, valor]) => !ficaAoTrocar(chave, de, para) && !vazio(valor)
    && !(chave === "quantidade" && valor === 1)).map(([chave]) => chave);
}

/** Os campos preenchidos de `dados` que o subtipo novo não declara (D7). */
function descartesDoSubtipo(dados: Rascunho, subtipo: SubtipoCriavel, catalogo: CatalogoItens | undefined): string[] {
  const declarados = new Set((catalogo?.campos_por_subtipo?.[subtipo] ?? []).map((c) => c.campo));
  return Object.entries(dados).filter(([chave, valor]) => !declarados.has(chave) && !vazio(valor)).map(([chave]) => chave);
}

function rotuloDoCampo(chave: string, catalogo: CatalogoItens | undefined): string {
  return catalogo?.campos?.find((c) => c.id === chave)?.rotulo ?? chave.replaceAll("_", " ");
}

export interface CardEditorProps {
  api: ApiClient;
  mesaId: string;
  /** A carta a editar; `null` abre uma carta nova, criada só no primeiro salvamento. */
  definicao: CartaDefinicaoResumo | null;
  onClose: () => void;
}

/** Recarregar depois de um conflito remonta o editor com a carta como está no servidor. */
export function CardEditor({ api, mesaId, definicao, onClose }: CardEditorProps) {
  const [atual, setAtual] = useState({ definicao, chave: 0 });
  const queryClient = useQueryClient();
  async function recarregar(id: string) {
    const { data, error } = await api.GET("/mesas/{mesa_id}/cartas", { params: { path: { mesa_id: mesaId } } });
    if (error) throw erroDaApi(error, "Não foi possível recarregar a carta.");
    void queryClient.invalidateQueries({ queryKey: cardKeys.catalogo(mesaId) });
    const nova = (data ?? []).find((d) => d.id === id) ?? null;
    setAtual((a) => ({ definicao: nova, chave: a.chave + 1 }));
  }
  return <EditorDeCarta key={atual.chave} api={api} mesaId={mesaId} definicao={atual.definicao} onClose={onClose} onRecarregar={recarregar} />;
}

function EditorDeCarta({ api, mesaId, definicao, onClose, onRecarregar }: CardEditorProps & { onRecarregar: (id: string) => Promise<void> }) {
  const [tipo, setTipo] = useState<TipoCarta>(definicao?.tipo ?? "habilidade");
  const [rascunho, setRascunho] = useState<Rascunho>(() => {
    const { tipo: _tipo, ...resto } = objeto(definicao?.rascunho);
    void _tipo;
    return resto;
  });
  const estadoRef = useRef({ tipo, rascunho });
  const catalogo = useCatalogoItens(api, mesaId).data;
  const framework = useCatalogoFramework(api, mesaId).data;
  const cartasDaMesa = useCatalogo(api, mesaId).data;
  const salvamento = useSalvamentoAutomatico({ api, mesaId, inicial: definicao, ler: () => estadoRef.current });
  const publicar = usePublicarCarta(api, mesaId);
  const versoes = useVersoesCarta(api, mesaId, salvamento.definicao?.id ?? null);
  const [publicouAgora, setPublicouAgora] = useState(false);
  const [confirmar, setConfirmar] = useState<null | { titulo: string; descricao: string; rotulo: string; acao: () => void }>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function alterar(patch: Rascunho) {
    const novo = { ...estadoRef.current.rascunho, ...patch };
    estadoRef.current = { ...estadoRef.current, rascunho: novo };
    setRascunho(novo);
    setAviso(null);
    salvamento.marcarAlteracao();
  }
  /** Mudança vinda do servidor (imagem gravada direto no rascunho): não marca alteração. */
  function sincronizar(patch: Rascunho) {
    const novo = { ...estadoRef.current.rascunho, ...patch };
    estadoRef.current = { ...estadoRef.current, rascunho: novo };
    setRascunho(novo);
  }
  function aplicarTipo(novoTipo: TipoCarta) {
    const de = estadoRef.current.tipo;
    const mantidos = Object.fromEntries(Object.entries(estadoRef.current.rascunho).filter(([chave]) => ficaAoTrocar(chave, de, novoTipo)));
    estadoRef.current = { tipo: novoTipo, rascunho: mantidos };
    setTipo(novoTipo);
    setRascunho(mantidos);
    salvamento.marcarAlteracao();
  }
  function trocarTipo(novoTipo: TipoCarta) {
    if (novoTipo === tipo) return;
    const descartes = descartesDoTipo(rascunho, tipo, novoTipo);
    if (!descartes.length) return aplicarTipo(novoTipo);
    const entreCriacoes = ehNatureza(tipo) && ehNatureza(novoTipo);
    const nomes = descartes.map((c) => ROTULO_DO_DESCARTE[c] ?? c).join(" e ");
    setConfirmar({
      titulo: `Trocar para ${ROTULO_TIPO[novoTipo]}?`,
      descricao: entreCriacoes
        ? `${nomes.charAt(0).toUpperCase()}${nomes.slice(1)} será descartada. Os demais campos, os custos e a arte ficam.`
        : `Os campos próprios de ${ROTULO_TIPO[tipo].toLowerCase()} serão descartados. O título, a descrição, os requisitos, as marcações e a arte ficam.`,
      rotulo: "Trocar o tipo",
      acao: () => aplicarTipo(novoTipo),
    });
  }

  const tipoFixo = Boolean(salvamento.definicao?.versao_publicada) || publicouAgora;
  const validacao = salvamento.validacao;
  const erroPublicacao = publicar.error as (Error & { problemas?: ProblemaValidacao[] }) | null;
  const problemas = erroPublicacao?.problemas?.length ? erroPublicacao.problemas : validacao?.problemas ?? [];
  const uso = useProblemasDoEditor(problemas, validacao?.revisao_pendente ?? []);
  const formato = (rascunho.formato ?? null) as FormatoItem | null;
  const artesPrivadas = lista(rascunho.ativos_privados);
  const tags = useMemo(() => [...new Set((cartasDaMesa ?? []).flatMap((d) => lista(objeto(d.rascunho).tags)))].sort(), [cartasDaMesa]);

  async function aoPublicar() {
    if (uso.total > 0) {
      if (!uso.focarPrimeiro()) document.getElementById("editor-pendencias")?.focus();
      return;
    }
    const salva = await salvamento.salvarAgora();
    if (!salva) {
      setAviso(salvamento.definicao ? "Salve o rascunho antes de publicar." : "Escreva o título da carta antes de publicar.");
      return;
    }
    setConfirmar({
      titulo: "Publicar nova versão?",
      descricao: artesPrivadas.length > 0
        ? `A arte privada (${artesPrivadas.length} imagem(ns)) será copiada para o espaço compartilhado da mesa. A versão publicada não pode ser alterada.`
        : "A versão publicada não pode ser alterada. Personagens que já possuem a carta continuam na versão atual até uma migração explícita.",
      rotulo: "Publicar",
      acao: () => void publicar.mutateAsync({ cartaId: salva.id, versao: salva.versao, promoverAtivos: artesPrivadas.length > 0 })
        .then((versao) => {
          salvamento.ajustarVersao(salva.versao + 1);
          setPublicouAgora(true);
          setAviso(`Versão ${versao.numero} publicada. Personagens existentes continuam na versão que já possuem.`);
        }).catch(() => undefined),
    });
  }

  async function fechar() {
    if (salvamento.pendente) {
      const salva = await salvamento.salvarAgora();
      // Carta nova sem título não tem o que salvar; o resto que não salvou pede confirmação.
      if (!salva && (salvamento.definicao !== null || texto(rascunho.titulo).trim())) {
        setConfirmar({
          titulo: "Fechar sem salvar?",
          descricao: "As últimas alterações não foram salvas e serão perdidas.",
          rotulo: "Descartar e fechar",
          acao: onClose,
        });
        return;
      }
    }
    onClose();
  }

  const prepararEnvio = async () => {
    const salva = await salvamento.garantirSalva();
    return { versao: salva.versao, alvo: salva.id };
  };
  const prepararIcone = async () => {
    const salva = await salvamento.garantirSalva();
    return { versao: salva.versao, alvo: `carta:${salva.id}` };
  };
  const idCarta = salvamento.definicao?.id ?? "";
  const categoria = categoriaDaCarta({ id: idCarta || "nova", tipo, concedida_por: null, carta: { conteudo: rascunho } }, catalogo);
  const tituloDoDialogo = definicao ? `Editar ${ROTULO_TIPO[tipo].toLowerCase()}` : "Nova carta";

  return (
    <MolduraDoGrimorio titulo={tituloDoDialogo} onFechar={() => void fechar()} pintura={ARTE_DO_EDITOR} className="editor-carta">
      <ProvedorDeProblemas valor={uso.contexto}>
        <MarcadoresDeTipo tipo={tipo} fixo={tipoFixo} onTrocar={trocarTipo} />

        <div className="grimorio-pagina grimorio-pagina--esquerda editor-pagina-esquerda">
          <div className="editor-arte">
            <ArteDoGrimorio tipo={tipo} conteudo={rascunho} categoria={categoria} catalogo={catalogo} api={api} mesaId={mesaId} />
            {!definicao?.origem_sistema && (
              <ImageUpload api={api} mesaId={mesaId} destino="carta" alvo={idCarta} versao={salvamento.definicao?.versao}
                rotulo={tipo === "item" ? "foto do item" : "arte da carta"} aparencia="camera"
                temImagem={lista(rascunho.ativos).length + artesPrivadas.length > 0} prepararEnvio={prepararEnvio}
                onConcluido={(resposta) => {
                  if (resposta.versao != null) salvamento.ajustarVersao(resposta.versao);
                  sincronizar({ ativos: [], ativos_privados: resposta.objeto ? [resposta.objeto] : [] });
                }} />
            )}
          </div>
          <TituloEditavel tipo={tipo} titulo={texto(rascunho.titulo)} onMudar={(titulo) => alterar({ titulo })}
            raridade={tipo === "item" ? catalogo?.raridades.find((r) => r.id === (formato?.raridade ?? "comum"))?.rotulo : undefined} />
        </div>

        <div className="grimorio-pagina grimorio-pagina--direita editor-pagina-direita">
          <div className="editor-formulario" role="region" aria-label="Campos da carta" tabIndex={-1}>
            {(uso.soltos.length > 0 || uso.avisosSoltos.length > 0) && (
              <div id="editor-pendencias" className="editor-pendencias" role="status" tabIndex={-1}>
                {uso.soltos.map((p) => <p key={`${p.rotulo}-${p.mensagem}`}><strong>{p.rotulo}:</strong> {p.mensagem}</p>)}
                {uso.avisosSoltos.map((a) => <p key={a} className="editor-campo__aviso">⚠ {a}</p>)}
              </div>
            )}
            {tipo === "item" && (
              <CamposDoItem api={api} mesaId={mesaId} rascunho={rascunho} alterar={alterar} catalogo={catalogo}
                pedirConfirmacao={setConfirmar} idCarta={idCarta} versao={salvamento.definicao?.versao}
                prepararIcone={prepararIcone} origemSistema={Boolean(definicao?.origem_sistema)}
                aoEnviarIcone={(versao, objetoIcone) => {
                  if (versao != null) salvamento.ajustarVersao(versao);
                  sincronizar({ formato: { ...objeto(estadoRef.current.rascunho.formato), icone_grade: objetoIcone } });
                }} />
            )}
            {(tipo === "habilidade" || tipo === "magia") && <CamposDeHabilidade tipo={tipo} rascunho={rascunho} alterar={alterar} framework={framework} />}
            {tipo === "efeito" && <CamposDeEfeito rascunho={rascunho} alterar={alterar} />}
            <CamposComuns rascunho={rascunho} alterar={alterar} tags={tags} rotuloRequisitos={ehNatureza(tipo) ? "Acesso" : "Requisitos"} />
            {salvamento.definicao && (
              <details className="editor-versoes">
                <summary>Versões publicadas ({versoes.data?.length ?? 0})</summary>
                {versoes.data && versoes.data.length > 0 ? (
                  <ol>
                    {versoes.data.map((v) => <li key={v.id}>Versão {v.numero} — {new Date(v.publicado_em).toLocaleString("pt-BR")}{v.revisao_pendente?.length ? " · revisão pendente" : ""}</li>)}
                  </ol>
                ) : <p>Nenhuma versão publicada ainda.</p>}
              </details>
            )}
          </div>

          <PeDoEditor salvamento={salvamento} pendencias={uso.total} publicando={publicar.isPending} aviso={aviso}
            erro={erroPublicacao && !erroPublicacao.problemas?.length ? erroPublicacao.message : null}
            onPublicar={() => void aoPublicar()} onRecarregar={() => idCarta && void onRecarregar(idCarta)} />
        </div>
      </ProvedorDeProblemas>

      <Confirmation
        open={confirmar !== null}
        title={confirmar?.titulo ?? ""}
        description={confirmar?.descricao}
        confirmLabel={confirmar?.rotulo}
        onConfirm={() => { const acao = confirmar?.acao; setConfirmar(null); acao?.(); }}
        onCancel={() => setConfirmar(null)}
      />
    </MolduraDoGrimorio>
  );
}

/** Os quatro marcadores de couro do topo do livro: o tipo da carta (D1). Depois de publicada, o tipo fica. */
function MarcadoresDeTipo({ tipo, fixo, onTrocar }: { tipo: TipoCarta; fixo: boolean; onTrocar: (tipo: TipoCarta) => void }) {
  const comum = usePintura(ARTE_DO_MARCADOR) === "pronta";
  const ativo = usePintura(ARTE_DO_MARCADOR_ATIVO) === "pronta";
  return (
    <div className={`editor-marcadores${comum && ativo ? " editor-marcadores--pintados" : ""}`} role="radiogroup" aria-label="Tipo da carta">
      {TIPOS_CARTA.map((opcao) => {
        const escolhido = opcao === tipo;
        return (
          <label key={opcao} className={`editor-marcador${escolhido ? " editor-marcador--ativo" : ""}${fixo && !escolhido ? " editor-marcador--fixo" : ""}`}>
            <input type="radio" name="editor-tipo" value={opcao} checked={escolhido} disabled={fixo && !escolhido}
              onChange={() => onTrocar(opcao)} />
            {comum && ativo && <img className="editor-marcador__couro" src={escolhido ? ARTE_DO_MARCADOR_ATIVO : ARTE_DO_MARCADOR} alt="" />}
            <span className="editor-marcador__emblema" aria-hidden="true"><IconeCategoria icone={EMBLEMA_DO_TIPO[opcao]} /></span>
            <span className="editor-marcador__nome">{ROTULO_TIPO[opcao]}</span>
          </label>
        );
      })}
    </div>
  );
}

/** O cartucho do título, editável no lugar, como no conceito (a pena indica a edição). */
function TituloEditavel({ tipo, titulo, onMudar, raridade }: { tipo: TipoCarta; titulo: string; onMudar: (titulo: string) => void; raridade?: string }) {
  const { id, descricao, mensagens, avisos } = useProblemasDoCampo("titulo", "Título");
  // O título do conceito ("Mochila de Viajante") cabe numa linha no tamanho cheio; mais longo, diminui.
  const escala = Math.max(.55, Math.min(1, 18 / Math.max(titulo.length, 1)));
  return (
    <div id={id} className={`grimorio-titulo editor-titulo${mensagens.length ? " editor-quadro--problema" : ""}`}>
      <span className="grimorio-cantos" aria-hidden="true"><CantosDoGrimorio /></span>
      <span className="grimorio-titulo__estrela grimorio-titulo__estrela--alto" aria-hidden="true"><EstrelaDoGrimorio /></span>
      <p className="grimorio-titulo__tipo">{ROTULO_TIPO[tipo]}</p>
      <span className="editor-titulo__linha">
        <input className="grimorio-titulo__nome editor-titulo__entrada" value={titulo} aria-label="Título" placeholder="Título da carta"
          aria-describedby={descricao} aria-invalid={mensagens.length > 0 || undefined}
          style={{ "--titulo-escala": escala } as CSSProperties} onChange={(e) => onMudar(e.target.value)} />
        <span className="editor-titulo__pena" aria-hidden="true"><IconePena /></span>
      </span>
      {raridade && <span className="editor-titulo__raridade">{raridade}</span>}
      <MensagensDoCampo id={descricao} mensagens={mensagens} avisos={avisos} />
      <span className="grimorio-titulo__estrela grimorio-titulo__estrela--pe" aria-hidden="true"><EstrelaDoGrimorio /></span>
    </div>
  );
}

/** Pena do Lucide (feather, licença ISC). */
function IconePena() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z" />
      <path d="M16 8 2 22" /><path d="M17.5 15H9" />
    </svg>
  );
}

/** Pé da página direita: o estado do salvamento à esquerda e o selo de cera de Publicar à direita. */
function PeDoEditor({ salvamento, pendencias, publicando, aviso, erro, onPublicar, onRecarregar }: {
  salvamento: SalvamentoAutomatico; pendencias: number; publicando: boolean; aviso: string | null; erro: string | null;
  onPublicar: () => void; onRecarregar: () => void;
}) {
  const selo = usePintura(ARTE_DO_SELO) === "pronta";
  const { estado, definicao, pendente } = salvamento;
  let mensagem: ReactNode;
  if (estado === "conflito") {
    mensagem = <>A carta foi alterada em outro lugar. <button type="button" className="editor-pe__acao" onClick={onRecarregar}>Recarregar a carta</button></>;
  } else if (estado === "falha") {
    mensagem = <>{salvamento.erro ?? "Não foi possível salvar."} <button type="button" className="editor-pe__acao" onClick={() => void salvamento.salvarAgora()}>Tentar de novo</button></>;
  } else if (estado === "salvando") mensagem = "Salvando…";
  else if (!definicao) mensagem = "Escreva o título para salvar o rascunho.";
  else if (pendente) mensagem = "Alterações a salvar…";
  else mensagem = <><span className="editor-pe__check" aria-hidden="true">✓</span> Rascunho salvo</>;
  const rotulo = publicando ? "Publicando…" : "Publicar";
  return (
    <div className="editor-pe">
      <p className={`editor-pe__estado editor-pe__estado--${estado}`} role="status">{mensagem}</p>
      {(aviso || erro) && <p className={`editor-pe__aviso${erro ? " editor-pe__aviso--erro" : ""}`} role={erro ? "alert" : "status"}>{erro ?? aviso}</p>}
      <button type="button" className={`editor-selo${selo ? " editor-selo--pintado" : ""}`} onClick={onPublicar}
        aria-disabled={pendencias > 0 || publicando || undefined} aria-describedby={pendencias > 0 ? "editor-selo-pendencias" : undefined}>
        {selo && <img className="editor-selo__cera" src={ARTE_DO_SELO} alt="" />}
        <span className="editor-selo__rotulo">{rotulo}</span>
        {pendencias > 0 && <span id="editor-selo-pendencias" className="editor-selo__pendencias">{pendencias === 1 ? "1 pendência" : `${pendencias} pendências`}</span>}
      </button>
    </div>
  );
}

function Descricao({ rascunho, alterar }: { rascunho: Rascunho; alterar: (patch: Rascunho) => void }) {
  return (
    <Quadro ancora="texto" rotulo="Descrição" icone="texto" largo className="editor-quadro--descricao">
      {(c) => <textarea id={c.id} className="editor-descricao" value={texto(rascunho.texto)} aria-describedby={c.descricao}
        aria-invalid={c.invalido || undefined} placeholder="O que a carta faz, na ficção e na mesa." onChange={(e) => alterar({ texto: e.target.value })} />}
    </Quadro>
  );
}

function CamposComuns({ rascunho, alterar, tags, rotuloRequisitos }: {
  rascunho: Rascunho; alterar: (patch: Rascunho) => void; tags: string[];
  /** "Acesso" em habilidades e magias: o Acesso do Framework usa os requisitos da carta. */
  rotuloRequisitos: string;
}) {
  return (
    <div className="editor-quadros">
      <Quadro ancora="requisitos" rotulo={rotuloRequisitos} icone="requisitos" largo grupo>
        {(c) => <CampoEtiquetas controle={c} rotulo={rotuloRequisitos} valor={rascunho.requisitos} onMudar={(requisitos) => alterar({ requisitos })} />}
      </Quadro>
      <Quadro ancora="tags" rotulo="Marcações" icone="marcacoes" largo grupo>
        {(c) => <CampoEtiquetas controle={c} rotulo="Marcações" valor={rascunho.tags} sugestoes={tags} onMudar={(t) => alterar({ tags: t })} />}
      </Quadro>
    </div>
  );
}

/** Textos curtos do Framework, na ordem da ficha de criação (adaptar-cartas-ao-framework, D8). */
/* Os textos que costumam ser longos ocupam a largura toda (`largo`); os curtos ficam em pares. */
const TEXTOS_DO_FRAMEWORK = [
  { campo: "lancamento", rotulo: "Lançamento", icone: "duracao", exemplo: "Uma ação" },
  { campo: "combo", rotulo: "Combo", icone: "versatil", exemplo: "Bloqueio → Ataque Leve → Ataque Leve", largo: true },
  { campo: "persistencia", rotulo: "Persistência", icone: "pilha", exemplo: "Ao receber 4 ataques do mesmo inimigo", largo: true },
];
const TEXTOS_DE_ALVO = [
  { campo: "alvo_area", rotulo: "Alvo ou Área", icone: "pericia", exemplo: "Área de 5 metros", largo: true },
  { campo: "impactos", rotulo: "Impactos", icone: "quantidade", exemplo: "Três" },
  { campo: "duracao", rotulo: "Duração", icone: "duracao", exemplo: "Uma rodada", largo: true },
];
const EFEITOS_DO_FRAMEWORK = [
  { campo: "efeito_principal", rotulo: "Efeito principal" },
  { campo: "efeitos_secundarios", rotulo: "Efeitos secundários" },
  { campo: "efeitos_condicionais", rotulo: "Efeitos condicionais" },
];
const TEXTOS_DE_USO = [
  { campo: "teste", rotulo: "Teste", icone: "pericia", exemplo: "Destreza + Esquiva, CD 15", largo: true },
  { campo: "componentes", rotulo: "Componentes", icone: "maos", exemplo: "Verbal e somático", largo: true },
  { campo: "limitacoes", rotulo: "Limitações", icone: "penalidade", exemplo: "Uma vez por cena", largo: true },
  { campo: "escalonamento", rotulo: "Escalonamento", icone: "atributo", exemplo: "+1d6 por PP adicional", largo: true },
];

/**
 * Campos de habilidades e magias pelo Framework (adaptar-cartas-ao-framework, D8): Tipo, Escola e Forma vêm do
 * catálogo; Grau e Descansos Mínimos são calculados e só aparecem; o Custo de Uso calculado é a sugestão do campo.
 */
function CamposDeHabilidade({ tipo, rascunho, alterar, framework }: {
  tipo: "habilidade" | "magia"; rascunho: Rascunho; alterar: (patch: Rascunho) => void; framework: CatalogoFramework | undefined;
}) {
  const adicionais = Array.isArray(rascunho.custos_adicionais) ? (rascunho.custos_adicionais as Rascunho[]) : [];
  const calculados = framework ? calcular(framework, tipo, rascunho) : null;
  const opcoes = (nome: "tipos" | "escolas" | "formas" | "alcances") => framework?.[nome] ?? [];
  const alcance = objeto(rascunho.alcance);
  const distancia = framework?.alcance_com_distancia ?? "metros";
  const textoCurto = ({ campo, rotulo: nome, icone, exemplo, largo = false }: {
    campo: string; rotulo: string; icone: string; exemplo: string; largo?: boolean;
  }) => (
    <Quadro key={campo} ancora={campo} rotulo={nome} icone={icone} largo={largo}>
      {(c) => <CampoTexto controle={c} valor={rascunho[campo]} exemplo={exemplo} onMudar={(valor) => alterar({ [campo]: valor })} />}
    </Quadro>
  );
  const registrado = typeof rascunho.custo_uso === "number" ? rascunho.custo_uso : null;
  const usoDoFramework = calculados?.custoUsoFramework ?? null;
  const divergente = registrado !== null && usoDoFramework !== null && registrado !== usoDoFramework;
  return (
    <>
      <Descricao rascunho={rascunho} alterar={alterar} />
      <div className="editor-quadros">
        <Quadro ancora="ativacao" rotulo="Tipo" icone="ativacao">
          {(c) => <CampoEscolha controle={c} valor={rascunho.ativacao} opcoes={opcoes("tipos")} onMudar={(ativacao) => alterar({ ativacao })} />}
        </Quadro>
        {tipo === "magia" ? (
          <Quadro ancora="escola" rotulo="Escola" icone="escola">
            {(c) => <CampoEscolha controle={c} valor={rascunho.escola} opcoes={opcoes("escolas")} onMudar={(escola) => alterar({ escola })} />}
          </Quadro>
        ) : (
          <Quadro ancora="disciplina" rotulo="Disciplina" icone="escola">
            {(c) => <CampoTexto controle={c} valor={rascunho.disciplina} exemplo="Técnica de Combate" onMudar={(disciplina) => alterar({ disciplina })} />}
          </Quadro>
        )}
        <Quadro ancora="grau" rotulo="Grau" icone="grau">
          {(c) => <CampoCalculado controle={c} valor={calculados?.abaixoDoMinimo ? "Abaixo do mínimo" : rotulo(framework, "graus", calculados?.grau)} />}
        </Quadro>
        {TEXTOS_DO_FRAMEWORK.map(textoCurto)}
        <Quadro ancora="alcance" rotulo="Alcance" icone="alcance" largo>
          {(c) => (
            <span className="editor-linha editor-alcance">
              <CampoEscolha controle={c} valor={alcance.tipo} opcoes={opcoes("alcances")}
                onMudar={(escolhido) => alterar({
                  alcance: !escolhido ? null : escolhido === distancia
                    ? { tipo: escolhido, metros: typeof alcance.metros === "number" ? alcance.metros : null }
                    : { tipo: escolhido },
                })} />
              {alcance.tipo === distancia && (
                <span className="editor-numero">
                  <input className="editor-texto editor-texto--curto" type="number" inputMode="numeric" min={1} step={1} aria-label="Metros"
                    value={typeof alcance.metros === "number" ? String(alcance.metros) : ""} placeholder="—"
                    onChange={(e) => {
                      const numero = Number(e.target.value);
                      alterar({ alcance: { tipo: distancia, metros: e.target.value.trim() && Number.isInteger(numero) ? numero : null } });
                    }} />
                  <span className="editor-numero__unidade">m</span>
                </span>
              )}
            </span>
          )}
        </Quadro>
        <Quadro ancora="forma" rotulo="Forma" icone="grade">
          {(c) => <CampoEscolha controle={c} valor={rascunho.forma} opcoes={opcoes("formas")} onMudar={(forma) => alterar({ forma })} />}
        </Quadro>
        {TEXTOS_DE_ALVO.map(textoCurto)}
        {EFEITOS_DO_FRAMEWORK.map(({ campo, rotulo: nome }) => (
          <Quadro key={campo} ancora={campo} rotulo={nome} icone="efeito" largo>
            {(c) => <CampoTextoLongo controle={c} valor={rascunho[campo]} onMudar={(valor) => alterar({ [campo]: valor })} />}
          </Quadro>
        ))}
        {TEXTOS_DE_USO.map(textoCurto)}
        <Quadro ancora="potencia_uso" rotulo="Potência de Uso" icone="potencia">
          {(c) => <CampoInteiro controle={c} valor={rascunho.potencia_uso} onMudar={(potencia_uso) => alterar({ potencia_uso })} />}
        </Quadro>
        <Quadro ancora="custo_uso" rotulo="Custo de Uso" icone="custo">
          {(c) => (
            <span className="editor-linha">
              <CampoInteiro controle={c} valor={rascunho.custo_uso} sugestao={usoDoFramework} unidade="PP"
                onMudar={(custo_uso) => alterar({ custo_uso })} />
              {divergente && <small className="editor-campo__aviso">⚠ O Framework daria {usoDoFramework} PP.</small>}
            </span>
          )}
        </Quadro>
        <Quadro ancora="custo_aprendizado" rotulo="Custo de Aprendizado" icone="aprendizado" soVoce>
          {(c) => <CampoInteiro controle={c} valor={rascunho.custo_aprendizado} unidade="PP"
            onMudar={(custo_aprendizado) => alterar({ custo_aprendizado })} />}
        </Quadro>
        <Quadro ancora="descansos_minimos" rotulo="Descansos Mínimos" icone="descansos" soVoce>
          {(c) => <CampoCalculado controle={c} valor={calculados?.descansos != null ? String(calculados.descansos) : null} />}
        </Quadro>
        {adicionais.map((adicional, indice) => (
          <Quadro key={indice} ancora={`custos_adicionais.${indice}`} rotulo={`Custo adicional ${indice + 1}`} icone="custo" largo grupo>
            {(c) => (
              <span className="editor-linha">
                <input className="editor-texto" aria-label={`Recurso do custo adicional ${indice + 1}`} placeholder="Recurso" value={texto(adicional.recurso)}
                  aria-describedby={c.descricao} onChange={(e) => alterar({ custos_adicionais: adicionais.map((a, i) => (i === indice ? { ...a, recurso: e.target.value } : a)) })} />
                <input className="editor-texto editor-texto--curto" type="number" min={0} aria-label={`Valor do custo adicional ${indice + 1}`} placeholder="—"
                  value={typeof adicional.valor === "number" ? String(adicional.valor) : ""}
                  onChange={(e) => {
                    const numero = Number(e.target.value);
                    const valor = e.target.value.trim() && Number.isInteger(numero) ? numero : null;
                    alterar({ custos_adicionais: adicionais.map((a, i) => (i === indice ? { ...a, valor } : a)) });
                  }} />
                <button type="button" className="editor-remover" aria-label={`Remover o custo adicional ${indice + 1}`}
                  onClick={() => alterar({ custos_adicionais: adicionais.filter((_, i) => i !== indice) })}>×</button>
              </span>
            )}
          </Quadro>
        ))}
      </div>
      <button type="button" className="editor-acrescentar" onClick={() => alterar({ custos_adicionais: [...adicionais, { recurso: "", valor: null }] })}>
        + Adicionar custo adicional
      </button>
      {texto(rascunho.custo_legado) && (
        <div className="editor-quadros">
          <Quadro ancora="custo_legado" rotulo="Custo legado (só histórico)" icone="legado" largo soVoce>
            {(c) => <CampoTexto controle={c} valor={rascunho.custo_legado} onMudar={(custo_legado) => alterar({ custo_legado })} />}
          </Quadro>
        </div>
      )}
    </>
  );
}

function CamposDeEfeito({ rascunho, alterar }: { rascunho: Rascunho; alterar: (patch: Rascunho) => void }) {
  return (
    <>
      <Descricao rascunho={rascunho} alterar={alterar} />
      <div className="editor-quadros">
        <Quadro ancora="duracao_rodadas" rotulo="Duração (rodadas)" icone="duracao">
          {(c) => <CampoInteiro controle={c} min={1} valor={rascunho.duracao_rodadas} onMudar={(duracao_rodadas) => alterar({ duracao_rodadas })} />}
        </Quadro>
        <Quadro ancora="modificadores" rotulo="Modificadores" icone="modificadores" largo grupo>
          {() => <ModifiersEditor idPrefix="efeito" value={(rascunho.modificadores as ModificadorResumo[] | undefined) ?? []}
            onChange={(modificadores) => alterar({ modificadores })} />}
        </Quadro>
      </div>
    </>
  );
}

function CamposDoItem({
  api, mesaId, rascunho, alterar, catalogo, pedirConfirmacao, idCarta, versao, prepararIcone, origemSistema, aoEnviarIcone,
}: {
  api: ApiClient; mesaId: string; rascunho: Rascunho; alterar: (patch: Rascunho) => void; catalogo: CatalogoItens | undefined;
  pedirConfirmacao: (pedido: { titulo: string; descricao: string; rotulo: string; acao: () => void }) => void;
  idCarta: string; versao: number | undefined; origemSistema: boolean;
  prepararIcone: () => Promise<{ versao: number; alvo: string }>;
  aoEnviarIcone: (versao: number | null | undefined, objeto: string | null) => void;
}) {
  const formato = (rascunho.formato ?? null) as FormatoItem | null;
  const dados = objeto(rascunho.dados);
  const efeitos = Array.isArray(rascunho.efeitos) ? (rascunho.efeitos as Rascunho[]) : [];
  const { id: idSubtipo, descricao: descricaoSubtipo, mensagens, avisos } = useProblemasDoCampo("formato", "O que é?");
  const alterarFormato = (patch: Partial<FormatoItem>) => formato && alterar({ formato: { ...formato, ...patch } });
  const alterarDado = (chave: string, valor: unknown) => {
    const proximo = { ...dados };
    if (vazio(valor)) delete proximo[chave];
    else proximo[chave] = valor;
    alterar({ dados: proximo });
  };

  function escolherSubtipo(subtipo: SubtipoCriavel) {
    const novo = formatoDoSubtipo(subtipo, formato);
    const descartes = descartesDoSubtipo(dados, subtipo, catalogo);
    const aplicar = () => alterar({
      formato: novo, item_tipo: CATEGORIA_POR_SUBTIPO[subtipo],
      dados: Object.fromEntries(Object.entries(dados).filter(([chave]) => !descartes.includes(chave))),
    });
    if (!descartes.length) return aplicar();
    pedirConfirmacao({
      titulo: "Trocar o que é o item?",
      descricao: `${descartes.map((c) => rotuloDoCampo(c, catalogo)).join(", ")} não se aplica${descartes.length > 1 ? "m" : ""} ao novo tipo e será${descartes.length > 1 ? "ão" : ""} descartado${descartes.length > 1 ? "s" : ""}.`,
      rotulo: "Trocar",
      acao: aplicar,
    });
  }

  const subtipo = formato?.subtipo as SubtipoCriavel | undefined;
  const campos = subtipo ? (catalogo?.campos_por_subtipo?.[subtipo] ?? []) : [];
  const listas = catalogo?.listas ?? {};
  // Como no conceito: os quadros curtos ficam no alto, junto do formato; as listas (propriedades) vão para
  // depois da descrição e dos efeitos.
  const ehLista = (chave: string) => ["escolhas", "etiquetas"].includes(catalogo?.campos?.find((c) => c.id === chave)?.tipo ?? "");
  const curtos = campos.filter((c) => !ehLista(c.campo));
  const longos = campos.filter((c) => ehLista(c.campo));
  const quadroDoCampo = ({ campo: chave, sugestoes }: { campo: string; sugestoes?: string | null }) => {
    const campo = catalogo?.campos?.find((c) => c.id === chave);
    if (!campo) return null;
    const largo = campo.tipo === "escolhas" || campo.tipo === "etiquetas";
    return (
      <Quadro key={chave} ancora={`dados.${chave}`} rotulo={campo.rotulo} icone={campo.icone} largo={largo} grupo={largo}>
        {(c: PropsDoControle) => {
          const valor = dados[chave];
          if (campo.tipo === "inteiro") return <CampoInteiro controle={c} valor={valor} unidade={campo.unidade} onMudar={(v) => alterarDado(chave, v)} />;
          if (campo.tipo === "texto") return <CampoTexto controle={c} valor={valor} exemplo={campo.exemplo} onMudar={(v) => alterarDado(chave, v)} />;
          if (campo.tipo === "escolha") return <CampoEscolha controle={c} valor={valor} opcoes={listas[campo.lista ?? ""] ?? []} onMudar={(v) => alterarDado(chave, v)} />;
          if (campo.tipo === "escolhas") return <CampoEscolhas controle={c} valor={valor} opcoes={listas[campo.lista ?? ""] ?? []} onMudar={(v) => alterarDado(chave, v)} />;
          return <CampoEtiquetas controle={c} rotulo={campo.rotulo} valor={valor} sugestoes={listas[sugestoes ?? ""] ?? []} onMudar={(v) => alterarDado(chave, v)} />;
        }}
      </Quadro>
    );
  };
  return (
    <>
      <div id={idSubtipo} className={`editor-o-que-e${mensagens.length ? " editor-quadro--problema" : ""}`}>
        <SeletorDeSubtipo valor={subtipo} rotulo="O que é?" idPrefix="editor-item" descricao={descricaoSubtipo} onEscolher={escolherSubtipo} />
        <MensagensDoCampo id={descricaoSubtipo} mensagens={mensagens} avisos={avisos} />
      </div>
      {formato && (
        <div className="editor-quadros">
          <Quadro ancora="formato.dimensao" rotulo="Espaço na bolsa" icone="grade" grupo>
            {(c) => (
              <span className="editor-linha">
                <input className="editor-texto editor-texto--curto" type="number" min={1} max={12} aria-label="Largura" aria-describedby={c.descricao}
                  value={formato.largura} onChange={(e) => alterarFormato({ largura: Math.min(12, Math.max(1, Math.trunc(Number(e.target.value)) || 1)) })} />
                <span aria-hidden="true">×</span>
                <input className="editor-texto editor-texto--curto" type="number" min={1} max={12} aria-label="Altura"
                  value={formato.altura} onChange={(e) => alterarFormato({ altura: Math.min(12, Math.max(1, Math.trunc(Number(e.target.value)) || 1)) })} />
                <button type="button" className="editor-girar" aria-label="Girar" title="Girar"
                  onClick={() => alterarFormato({ largura: formato.altura, altura: formato.largura })}><IconeDoCampo nome="girar" /></button>
              </span>
            )}
          </Quadro>
          {formato.subtipo === "mochila" && formato.mochila && (
            <>
              <Quadro ancora="formato.mochila" rotulo="Amplia a bolsa em" icone="grade_mais" grupo>
                {(c) => (
                  <span className="editor-linha">
                    <input className="editor-texto editor-texto--curto" type="number" min={0} max={4} aria-label="Linhas a mais" aria-describedby={c.descricao}
                      value={formato.mochila?.linhas ?? 0} onChange={(e) => alterarFormato({ mochila: { ...formato.mochila!, linhas: Math.min(4, Math.max(0, Math.trunc(Number(e.target.value)) || 0)) } })} />
                    <span aria-hidden="true">×</span>
                    <input className="editor-texto editor-texto--curto" type="number" min={0} max={4} aria-label="Colunas a mais"
                      value={formato.mochila?.colunas ?? 0} onChange={(e) => alterarFormato({ mochila: { ...formato.mochila!, colunas: Math.min(4, Math.max(0, Math.trunc(Number(e.target.value)) || 0)) } })} />
                  </span>
                )}
              </Quadro>
              <Quadro ancora="formato.mochila.requisito_forca" rotulo="Requisito de Força" icone="forca">
                {(c) => <CampoInteiro controle={c} max={10} valor={formato.mochila?.requisito_forca}
                  onMudar={(requisito_forca) => alterarFormato({ mochila: { ...formato.mochila!, requisito_forca } })} />}
              </Quadro>
            </>
          )}
          {formato.subtipo === "aljava" && formato.aljava && (
            <Quadro ancora="formato.aljava" rotulo="Capacidade de flechas" icone="flechas">
              {(c) => <CampoInteiro controle={c} min={1} max={200} valor={formato.aljava?.capacidade_flechas}
                onMudar={(v) => alterarFormato({ aljava: { capacidade_flechas: Math.min(200, Math.max(1, v ?? 1)) } })} />}
            </Quadro>
          )}
          {formato.subtipo === "outro" && catalogo && (
            <>
              <Quadro ancora="formato.categoria" rotulo="Categoria" icone="categoria">
                {(c) => <CampoEscolha controle={c} valor={formato.categoria ?? catalogo.categorias.find((x) => x.padrao_outros)?.id}
                  opcoes={catalogo.categorias.filter((x) => x.escolha_em_outros).map((x) => ({ id: x.id, rotulo: x.rotulo }))}
                  onMudar={(categoria) => alterarFormato({ categoria })} />}
              </Quadro>
              <Quadro ancora="formato.maos" rotulo="Ocupa mãos" icone="maos">
                {(c) => <CampoEscolha controle={c} valor={String(formato.maos ?? 0)}
                  opcoes={[{ id: "0", rotulo: "Nenhuma" }, { id: "1", rotulo: "1 mão" }, { id: "2", rotulo: "2 mãos" }]}
                  onMudar={(maos) => alterarFormato({ maos: Number(maos ?? 0) })} />}
              </Quadro>
              <Quadro ancora="formato.pilha_max" rotulo="Empilha até" icone="pilha">
                {(c) => <CampoInteiro controle={c} min={1} max={999} valor={formato.pilha_max ?? 1}
                  onMudar={(v) => alterarFormato({ pilha_max: Math.min(999, Math.max(1, v ?? 1)) })} />}
              </Quadro>
            </>
          )}
          {formato.subtipo === "uma_mao" && (
            <Quadro ancora="formato.versatil" rotulo="Versátil" icone="versatil" grupo>
              {(c) => (
                <label className="editor-marcar">
                  <input type="checkbox" checked={formato.versatil === true} aria-describedby={c.descricao}
                    onChange={(e) => alterarFormato({ versatil: e.target.checked })} />
                  Uma ou duas mãos
                </label>
              )}
            </Quadro>
          )}
          {catalogo && (
            <Quadro ancora="raridade" rotulo="Raridade" icone="raridade">
              {(c) => <CampoEscolha controle={c} valor={formato.raridade ?? catalogo.raridades[0]?.id}
                opcoes={catalogo.raridades.map((r) => ({ id: r.id, rotulo: r.rotulo }))}
                onMudar={(raridade) => alterarFormato({ raridade: raridade ?? catalogo.raridades[0]?.id })} />}
            </Quadro>
          )}
          {curtos.map(quadroDoCampo)}
        </div>
      )}
      <Descricao rascunho={rascunho} alterar={alterar} />
      {efeitos.map((efeito, indice) => (
        <div key={indice} className="editor-quadros">
          <Quadro ancora={`efeitos.${indice}`} rotulo={`Efeito ${indice + 1}`} icone="efeito" largo grupo className="editor-quadro--efeito">
            {() => (
              <span className="editor-efeito">
                <input className="editor-texto" aria-label={`Nome do efeito ${indice + 1}`} placeholder="Nome" value={texto(efeito.nome)}
                  onChange={(e) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, nome: e.target.value } : x)) })} />
                <textarea className="editor-texto" aria-label={`Descrição do efeito ${indice + 1}`} placeholder="Descrição" value={texto(efeito.descricao)}
                  onChange={(e) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, descricao: e.target.value } : x)) })} />
                <select className="editor-escolha" aria-label={`Ativação do efeito ${indice + 1}`} value={texto(efeito.ativacao) || "enquanto_equipado"}
                  onChange={(e) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, ativacao: e.target.value } : x)) })}>
                  <option value="enquanto_equipado">Enquanto equipado</option><option value="manual">Manual</option>
                </select>
                <ModifiersEditor idPrefix={`item-efeito-${indice}`} value={(efeito.modificadores as ModificadorResumo[] | undefined) ?? []}
                  onChange={(modificadores) => alterar({ efeitos: efeitos.map((x, i) => (i === indice ? { ...x, modificadores } : x)) })} />
                <button type="button" className="editor-acrescentar editor-acrescentar--remover"
                  onClick={() => alterar({ efeitos: efeitos.filter((_, i) => i !== indice) })}>Remover efeito</button>
              </span>
            )}
          </Quadro>
        </div>
      ))}
      <button type="button" className="editor-acrescentar"
        onClick={() => alterar({ efeitos: [...efeitos, { nome: "", descricao: "", modificadores: [], ativacao: "enquanto_equipado" }] })}>
        + Adicionar efeito
      </button>
      {formato && (
        <div className="editor-quadros">
          {longos.map(quadroDoCampo)}
          <Quadro ancora="quantidade" rotulo="Quantidade" icone="quantidade">
            {(c) => <CampoInteiro controle={c} min={1} valor={typeof rascunho.quantidade === "number" ? rascunho.quantidade : 1}
              onMudar={(quantidade) => alterar({ quantidade: quantidade ?? 1 })} />}
          </Quadro>
        </div>
      )}
      {formato && !origemSistema && (
        <div className="editor-quadros">
          <Quadro ancora="icone" rotulo="Ícone na bolsa" icone="icone" largo grupo>
            {() => (
              <span className="editor-icone-bolsa">
                <Previa formato={formato} nome={texto(rascunho.titulo)} api={api} mesaId={mesaId}
                  arte={lista(rascunho.ativos_privados)[0] ?? lista(rascunho.ativos)[0] ?? null} />
                <small>Ocupa {formato.largura} × {formato.altura} célula{formato.largura * formato.altura > 1 ? "s" : ""}: use essa proporção
                  (ex.: {formato.largura * 256} × {formato.altura * 256} px), de preferência com fundo transparente. Sem ícone, a bolsa usa a foto.</small>
                <ImageUpload api={api} mesaId={mesaId} destino="icone-grade" alvo={`carta:${idCarta}`} versao={versao}
                  rotulo="ícone da bolsa" temImagem={Boolean(formato.icone_grade)} prepararEnvio={prepararIcone}
                  onConcluido={(resposta) => aoEnviarIcone(resposta.versao, resposta.objeto ?? null)} />
              </span>
            )}
          </Quadro>
        </div>
      )}
    </>
  );
}
