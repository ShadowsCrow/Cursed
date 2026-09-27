import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Dialog } from "../../../ui/primitives";
import { ImageUpload, type ImagemResposta } from "../../assets/ImageUpload";
import { CoinPurse, type Pilha } from "../../inventory/CoinPurse";
import { InventoryGrid, type Destino } from "../../inventory/InventoryGrid";
import { ItemFormatEditor, type FormatoItem } from "../../inventory/ItemFormatEditor";
import { ItemOffers } from "../../inventory/ItemOffers";
import { equiparOuGuardar } from "../../inventory/mochila";
import type { ItemGrade, ParametrosGrade } from "../../inventory/gridEngine";
import { paraGrade, parametrosDaGrade, temFormato } from "./gradeFicha";
import { useEntidadesPublicas, usePersonagens, usePoliticaMesa } from "../api";
import type { ApiClient, GradeInventario, ItemInventarioResumo, PermissoesFicha } from "../types";
import { InventoryItemsPanel } from "./InventoryPanel";
import {
  aceitarOferta, ConflitoArrumacao, definirFormatoItem, encerrarOferta, gravarArrumacao, gravarMoedas, largarItem,
  ofertarItem, ofertasItemKey, sheetKeys, useGradeInventario, useOfertasItem, type OfertaItem, type PosicaoArrumacao,
} from "./sheetApi";

/** Sem tempo real na página da ficha, as trocas são reconsultadas neste intervalo. */
const INTERVALO_TROCAS_MS = 10_000;

function OferecerDialog({ api, mesaId, personagemId, item, narrador, onFechar, onOferecido }: {
  api: ApiClient; mesaId: string; personagemId: string; item: ItemGrade; narrador: boolean; onFechar: () => void;
  onOferecido: (oferta: OfertaItem) => void;
}) {
  // O Narrador escolhe entre todos os personagens; jogadores só conhecem o grupo pelas entidades públicas.
  const personagens = usePersonagens(api, mesaId, false, { enabled: narrador });
  const publicas = useEntidadesPublicas(api, mesaId);
  const candidatos = narrador
    ? (personagens.data ?? []).filter((p) => p.id !== personagemId && !p.excluido_em).map((p) => ({ id: p.id, nome: p.nome }))
    : (publicas.data ?? []).filter((e) => e.id !== personagemId).map((e) => ({ id: e.id, nome: e.nome_publico ?? "Figura sem nome" }));
  const [para, setPara] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      onOferecido(await ofertarItem(api, mesaId, personagemId, item.id, para));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Dialog open title={`Oferecer ${item.nome}`} onClose={onFechar}>
      <p className="preview-note">O item continua com você até a outra pessoa aceitar. Ao aceitar, ele sai da sua grade.</p>
      {(narrador ? personagens : publicas).isError && <p role="alert">{(narrador ? personagens : publicas).error?.message}</p>}
      <label htmlFor="oferecer-para">Para quem</label>
      <select id="oferecer-para" value={para} onChange={(e) => setPara(e.target.value)}>
        <option value="">Escolha…</option>
        {candidatos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
      {erro && <p role="alert">{erro}</p>}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onFechar}>Cancelar</button>
        <button type="button" className="button" disabled={!para || enviando} onClick={() => void confirmar()}>
          {enviando ? "Enviando…" : "Oferecer"}
        </button>
      </div>
    </Dialog>
  );
}

/**
 * Inventário em grade na ficha (carga-por-espacos 5.1). A grade muda na hora; a arrumação inteira
 * é enviada ao servidor pouco depois do último movimento. Sem conexão, o rascunho fica guardado no
 * navegador e é reenviado quando a conexão volta. Recusas do servidor devolvem a grade ao estado dele.
 */

const ESPERA_ENVIO_MS = 500;

interface Rascunho {
  versao: number;
  itens: PosicaoArrumacao[];
}

const chaveRascunho = (mesaId: string, personagemId: string) => `cursed:arrumacao:${mesaId}:${personagemId}`;

function lerRascunho(chave: string): Rascunho | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Rascunho) : null;
  } catch {
    return null;
  }
}

function guardarRascunho(chave: string, rascunho: Rascunho | null) {
  try {
    if (rascunho) window.localStorage.setItem(chave, JSON.stringify(rascunho));
    else window.localStorage.removeItem(chave);
  } catch {
    // Sem armazenamento local: a arrumação segue só em memória.
  }
}

function DefinirFormatoDialog({ api, mesaId, personagemId, item, versao, onFechar, onDefinido }: {
  api: ApiClient; mesaId: string; personagemId: string; item: ItemInventarioResumo; versao: number;
  onFechar: () => void; onDefinido: (versao: number) => void;
}) {
  const [formato, setFormato] = useState<FormatoItem | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function confirmar() {
    if (!formato) return;
    setEnviando(true);
    setErro("");
    try {
      onDefinido(await definirFormatoItem(api, mesaId, personagemId, item.id, versao, { ...formato, versatil: formato.versatil ?? false }));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  const pesoAntigo = item.dados?.peso;
  return (
    <Dialog open title={`Definir formato: ${item.nome}`} onClose={onFechar}>
      {pesoAntigo !== undefined && (
        <p className="preview-note">Peso antigo (só referência, não é convertido): {String(pesoAntigo)}</p>
      )}
      <ItemFormatEditor valor={formato} onChange={setFormato} nome={item.nome} idPrefix={`formato-${item.id}`}
        api={api} mesaId={mesaId} />
      {erro && <p role="alert">{erro}</p>}
      <div className="dialog__actions">
        <button type="button" className="button button--ghost" onClick={onFechar}>Cancelar</button>
        <button type="button" className="button" disabled={!formato || enviando} onClick={() => void confirmar()}>
          {enviando ? "Enviando…" : "Definir formato"}
        </button>
      </div>
    </Dialog>
  );
}

const posicoes = (itens: ItemGrade[]): PosicaoArrumacao[] =>
  itens.map((i) => ({
    item_id: i.id, coluna: i.coluna, linha: i.linha, girado: i.girado, equipado: i.equipado,
    ...(i.versatil ? { maos: i.maos === 2 ? 2 : 1 } : {}),
  }));

export interface InventoryGridPanelProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  permissoes: PermissoesFicha | undefined;
  /** Versão mais recente da ficha conhecida pela página (a grade pode ter chegado antes de outra edição). */
  versao: number;
  online: boolean;
  onVersaoConfirmada: (versao: number) => void;
}

export function InventoryGridPanel({ api, mesaId, personagemId, permissoes, versao, online, onVersaoConfirmada }: InventoryGridPanelProps) {
  const queryClient = useQueryClient();
  const gradeQuery = useGradeInventario(api, mesaId, personagemId);
  const politica = usePoliticaMesa(api, mesaId);
  const chave = chaveRascunho(mesaId, personagemId);
  const [local, setLocal] = useState<ItemGrade[] | null>(null);
  const [aviso, setAviso] = useState("");
  const [info, setInfo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [formatando, setFormatando] = useState<ItemInventarioResumo | null>(null);
  const [oferecendo, setOferecendo] = useState<ItemGrade | null>(null);
  const [lugarPara, setLugarPara] = useState<OfertaItem | null>(null);
  const ofertas = useOfertasItem(api, mesaId, INTERVALO_TROCAS_MS);
  const timer = useRef<number | undefined>(undefined);
  const servidor = gradeQuery.data;

  const comGrade = useMemo(() => (servidor?.itens ?? []).filter(temFormato), [servidor]);
  const semDimensao = useMemo(() => (servidor?.itens ?? []).filter((i) => !temFormato(i)), [servidor]);
  const itens = local ?? comGrade.map(paraGrade);

  const parametros = useMemo<ParametrosGrade | null>(() => servidor ? parametrosDaGrade(servidor) : null, [servidor]);

  const aplicarResposta = useCallback((grade: GradeInventario) => {
    queryClient.setQueryData(sheetKeys.grade(mesaId, personagemId), grade);
    onVersaoConfirmada(grade.versao);
    void queryClient.invalidateQueries({ queryKey: sheetKeys.inventario(mesaId, personagemId) });
    void queryClient.invalidateQueries({ queryKey: sheetKeys.efeitos(mesaId, personagemId) });
    void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
  }, [queryClient, mesaId, personagemId, onVersaoConfirmada]);

  const enviar = useCallback(async (rascunho: Rascunho) => {
    setEnviando(true);
    try {
      const grade = await gravarArrumacao(api, mesaId, personagemId, rascunho.versao, rascunho.itens);
      guardarRascunho(chave, null);
      setLocal(null);
      setAviso("");
      aplicarResposta(grade);
    } catch (erro) {
      guardarRascunho(chave, null);
      setLocal(null);
      if (erro instanceof ConflitoArrumacao) {
        setAviso("A ficha mudou em outro lugar. A grade foi atualizada e a arrumação não enviada foi descartada.");
      } else {
        setAviso(`Arrumação recusada: ${(erro as Error).message}`);
      }
      void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
    } finally {
      setEnviando(false);
    }
  }, [api, mesaId, personagemId, chave, aplicarResposta, queryClient]);

  // A ficha mudou em outro lugar (atributos, equipar pela lista): a grade é recarregada.
  useEffect(() => {
    if (servidor && servidor.versao < versao && !local) {
      void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
    }
  }, [servidor, versao, local, queryClient, mesaId, personagemId]);

  // Rascunho guardado de uma sessão anterior: reenviado se a ficha não mudou desde então; descartado se mudou.
  const versaoServidor = servidor ? Math.max(servidor.versao, versao) : undefined;
  const rascunhoDescartado = useMemo(() => {
    const guardado = versaoServidor === undefined ? null : lerRascunho(chave);
    return guardado !== null && guardado.versao !== versaoServidor;
  }, [chave, versaoServidor]);

  useEffect(() => {
    if (versaoServidor === undefined) return;
    const guardado = lerRascunho(chave);
    if (!guardado) return;
    if (guardado.versao !== versaoServidor) {
      guardarRascunho(chave, null);
      return;
    }
    if (!online) return;
    const reenvio = window.setTimeout(() => void enviar(guardado), 0);
    return () => window.clearTimeout(reenvio);
    // Retoma ao carregar uma versão e ao reconectar; movimentos com conexão usam o envio com espera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoServidor, online]);

  function alterar(proximo: ItemGrade[]) {
    if (!servidor) return;
    setInfo("");
    setLocal(proximo);
    const rascunho: Rascunho = { versao: Math.max(servidor.versao, versao), itens: posicoes(proximo) };
    guardarRascunho(chave, rascunho);
    window.clearTimeout(timer.current);
    if (!online) {
      setAviso("Sem conexão: a arrumação fica guardada e será enviada quando a conexão voltar.");
      return;
    }
    timer.current = window.setTimeout(() => void enviar(rascunho), ESPERA_ENVIO_MS);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function largar(itemId: string) {
    if (!servidor) return;
    if (local) {
      setAviso("Aguarde a arrumação ser guardada antes de largar um item.");
      return;
    }
    const nome = servidor.itens?.find((i) => i.id === itemId)?.nome ?? "O item";
    setEnviando(true);
    try {
      await largarItem(api, mesaId, personagemId, itemId, Math.max(servidor.versao, versao));
      setAviso("");
      setInfo(`${nome} ficou no chão da cena.`);
      void queryClient.invalidateQueries({ queryKey: ["sala", mesaId] });
      aplicarResposta(await gradeAtual());
    } catch (erro) {
      setAviso(erro instanceof ConflitoArrumacao
        ? "A ficha mudou em outro lugar. A grade foi atualizada; tente de novo."
        : `Não foi possível largar: ${(erro as Error).message}`);
      void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
    } finally {
      setEnviando(false);
    }
  }

  async function responder(oferta: OfertaItem, acao: "aceitar" | "recusar" | "cancelar", lugar?: Destino) {
    if (!servidor) return;
    if (local && acao === "aceitar") {
      setAviso("Aguarde a arrumação ser guardada antes de aceitar um item.");
      return;
    }
    setEnviando(true);
    try {
      if (acao === "aceitar") {
        await aceitarOferta(api, mesaId, oferta.id, Math.max(servidor.versao, versao), lugar);
        aplicarResposta(await gradeAtual());
        setInfo(lugar ? `${oferta.item_nome} entrou na grade.` : `${oferta.item_nome} chegou fora da grade: arrume-o quando quiser.`);
      } else {
        await encerrarOferta(api, mesaId, oferta.id, acao);
        setInfo(acao === "recusar" ? `Oferta de ${oferta.item_nome} recusada.` : `Oferta de ${oferta.item_nome} cancelada.`);
      }
      setAviso("");
      setLugarPara(null);
    } catch (erro) {
      setAviso((erro as Error).message);
      void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
    } finally {
      setEnviando(false);
      void queryClient.invalidateQueries({ queryKey: ofertasItemKey(mesaId) });
    }
  }

  async function gradeAtual(): Promise<GradeInventario> {
    const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/grade", {
      params: { path: { mesa_id: mesaId, personagem_id: personagemId } },
    });
    if (error || !data) throw new Error("Não foi possível recarregar a grade.");
    return data as GradeInventario;
  }

  async function guardarMoedas(
    moedas: { bolsa: Pilha } | { pilhas: Pilha[] } | { adicionar: Pilha } | { retirar: Pilha },
  ): Promise<boolean> {
    if (!servidor) return false;
    setEnviando(true);
    try {
      aplicarResposta(await gravarMoedas(api, mesaId, personagemId, Math.max(servidor.versao, versao), moedas));
      setAviso("");
      return true;
    } catch (erro) {
      setAviso(erro instanceof ConflitoArrumacao
        ? "A ficha mudou em outro lugar. A grade foi atualizada; confira as moedas e tente de novo."
        : `Moedas recusadas: ${(erro as Error).message}`);
      void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
      return false;
    } finally {
      setEnviando(false);
    }
  }

  if (gradeQuery.isPending) return <p>Carregando a grade…</p>;
  if (gradeQuery.isError) return <p role="alert">{gradeQuery.error.message}</p>;
  if (!servidor || !parametros) return null;

  const mover = (id: string, destino: Destino) => alterar(itens.map((i) => (i.id === id ? { ...i, ...destino } : i)));
  const equipar = (id: string, equipado: boolean) => alterar(equiparOuGuardar(parametros, itens, id, equipado));
  const empunhar = (id: string, maos: 1 | 2) => alterar(itens.map((i) => (i.id === id ? { ...i, maos } : i)));
  const retirar = (id: string) => alterar(itens.map((i) => (i.id === id ? { ...i, coluna: null, linha: null, equipado: false } : i)));

  return (
    <div className="grade-ficha">
      {(aviso || rascunhoDescartado) && (
        <p className="grade-ficha__aviso" role="alert">
          {aviso || "Uma arrumação não enviada ficou para trás porque a ficha mudou; ela foi descartada."}
        </p>
      )}
      {enviando && <p className="grade-ficha__estado" role="status">Guardando…</p>}
      {!enviando && info && !aviso && <p className="grade-ficha__estado" role="status">{info}</p>}
      <InventoryGrid
        rotulo="Inventário em grade"
        parametros={parametros}
        itens={itens}
        onMover={mover}
        onEquipar={equipar}
        onRetirar={retirar}
        onLargar={(id) => void largar(id)}
        onEmpunhar={empunhar}
        onOferecer={(id) => setOferecendo(itens.find((i) => i.id === id) ?? null)}
        acoesDoItem={permissoes?.editar ? (id) => {
          const dados = (servidor.itens ?? []).find((i) => i.id === id)?.dados ?? {};
          const aoConcluir = (resposta: ImagemResposta) => {
            if (resposta.versao != null) onVersaoConfirmada(resposta.versao);
            void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
            void queryClient.invalidateQueries({ queryKey: sheetKeys.inventario(mesaId, personagemId) });
          };
          return (
            <div className="grade-inventario__imagens">
              <ImageUpload api={api} mesaId={mesaId} destino="item" alvo={id} versao={Math.max(servidor.versao, versao)}
                rotulo="arte do item" temImagem={Boolean(dados.imagem_ativo)} onConcluido={aoConcluir} />
              <ImageUpload api={api} mesaId={mesaId} destino="icone-grade" alvo={`item:${id}`} versao={Math.max(servidor.versao, versao)}
                rotulo="ícone de grade" temImagem={Boolean(dados.icone_grade)} onConcluido={aoConcluir} />
            </div>
          );
        } : undefined}
        somenteLeitura={!permissoes?.editar}
        externo={lugarPara && lugarPara.largura != null && lugarPara.altura != null
          ? { nome: lugarPara.item_nome, largura: lugarPara.largura, altura: lugarPara.altura }
          : null}
        onColocarExterno={lugarPara ? (destino) => void responder(lugarPara, "aceitar", destino) : undefined}
      />
      <ItemOffers
        personagemId={personagemId}
        ofertas={ofertas.data ?? []}
        editavel={permissoes?.editar === true}
        ocupado={enviando}
        escolhendoLugar={lugarPara?.id ?? null}
        onAceitar={(oferta) => void responder(oferta, "aceitar")}
        onEscolherLugar={setLugarPara}
        onRecusar={(oferta) => void responder(oferta, "recusar")}
        onCancelar={(oferta) => void responder(oferta, "cancelar")}
      />
      {oferecendo && (
        <OferecerDialog api={api} mesaId={mesaId} personagemId={personagemId} item={oferecendo}
          narrador={permissoes?.papel === "narrador"}
          onFechar={() => setOferecendo(null)}
          onOferecido={(oferta) => {
            setOferecendo(null);
            setAviso("");
            setInfo(`${oferta.item_nome} oferecido a ${oferta.para_nome}.`);
            void queryClient.invalidateQueries({ queryKey: ofertasItemKey(mesaId) });
          }} />
      )}
      <CoinPurse
        pilhas={(servidor.itens ?? []).filter((i) => i.subtipo === "moedas")}
        porPilha={politica.data?.moedas_por_pilha ?? undefined}
        editavel={permissoes?.editar === true}
        ocupado={enviando || local !== null}
        onGuardarBolsa={(bolsa) => void guardarMoedas({ bolsa })}
        onGuardarPilhas={(pilhas) => void guardarMoedas({ pilhas })}
        onAjustar={(operacao, moedas) => guardarMoedas(operacao === "adicionar" ? { adicionar: moedas } : { retirar: moedas })}
      />
      {semDimensao.length > 0 && (
        <InventoryItemsPanel
          api={api} mesaId={mesaId} personagemId={personagemId} itens={semDimensao} versao={Math.max(servidor.versao, versao)}
          permissoes={permissoes} online={online} onVersaoConfirmada={onVersaoConfirmada}
          titulo="Sem dimensão"
          descricao={`Estes itens ainda não têm formato: não podem ir para a grade, então não são levados nem equipados. ${permissoes?.papel === "narrador"
            ? "Defina o tipo e a dimensão de cada um."
            : "O Narrador precisa definir o tipo e a dimensão de cada um."}`}
          incluirEquipados
          permitirEquipar={false}
          acaoItem={permissoes?.papel === "narrador" ? (item) => (
            <button type="button" className="button button--secondary" onClick={() => setFormatando(item)}>
              Definir formato de {item.nome}
            </button>
          ) : undefined}
        />
      )}
      {formatando && (
        <DefinirFormatoDialog
          api={api} mesaId={mesaId} personagemId={personagemId} item={formatando} versao={Math.max(servidor.versao, versao)}
          onFechar={() => setFormatando(null)}
          onDefinido={(nova) => {
            setFormatando(null);
            onVersaoConfirmada(nova);
            void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
            void queryClient.invalidateQueries({ queryKey: sheetKeys.inventario(mesaId, personagemId) });
          }}
        />
      )}
    </div>
  );
}
