import { useState, type CSSProperties, type DragEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { useCatalogo } from "../cards/api";
import { usePersonagens } from "../characters/api";
import { paraGrade, parametrosDaGrade, temFormato } from "../characters/sheet/gradeFicha";
import { sheetKeys } from "../characters/sheet/sheetApi";
import { extractErrorMessage, type ApiClient, type GradeInventario } from "../characters/types";
import { TIPO_ARRASTE_ITEM } from "../inventory/arrasteExterno";
import { InventoryGrid, type Destino } from "../inventory/InventoryGrid";
import "../inventory/inventory.css";

type Recipiente = components["schemas"]["RecipienteResumo"];
type ItemRecipiente = components["schemas"]["ItemRecipienteResumo"];

interface Escolha {
  recipiente: Recipiente;
  item: ItemRecipiente;
}

const dimensao = (item: ItemRecipiente) => item.girado
  ? { largura: item.altura ?? 1, altura: item.largura ?? 1 }
  : { largura: item.largura ?? 1, altura: item.altura ?? 1 };

function GradeRecipiente({ recipiente, escolhido, onEscolher }: {
  recipiente: Recipiente; escolhido: string | null; onEscolher: (item: ItemRecipiente) => void;
}) {
  const noGrid = recipiente.itens.filter((i) => i.coluna != null && i.linha != null);
  const soltos = recipiente.itens.filter((i) => i.coluna == null || i.linha == null);
  const descricao = (item: ItemRecipiente) => {
    const { largura, altura } = dimensao(item);
    return [item.nome, `${largura} por ${altura}`,
      item.coluna != null && item.linha != null ? `coluna ${item.coluna + 1}, linha ${item.linha + 1}` : "sem lugar na grade",
      item.efeitos?.length ? `efeitos: ${item.efeitos.join(", ")}` : null].filter(Boolean).join(", ");
  };
  const arrastavel = (item: ItemRecipiente) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData(TIPO_ARRASTE_ITEM, JSON.stringify({ recipienteId: recipiente.id, itemId: item.id }));
      event.dataTransfer.effectAllowed = "move";
      onEscolher(item);
    },
  });
  return (
    <section className="recipiente" aria-label={recipiente.nome}>
      <h4>{recipiente.nome} <small>({recipiente.itens.length} item(ns))</small></h4>
      <div className="grade-inventario__area recipiente__area"
        style={{ "--colunas": recipiente.colunas, "--linhas": recipiente.linhas } as CSSProperties}>
        <div className="grade-inventario__celulas" aria-hidden="true">
          {Array.from({ length: recipiente.colunas * recipiente.linhas }, (_, i) => <div key={i} className="grade-inventario__celula" />)}
        </div>
        {noGrid.map((item) => {
          const { largura, altura } = dimensao(item);
          return (
            <button key={item.id} type="button" {...arrastavel(item)}
              className={`grade-inventario__item${escolhido === item.id ? " grade-inventario__item--selecionado" : ""}`}
              style={{ "--c": item.coluna, "--l": item.linha, "--w": largura, "--h": altura } as CSSProperties}
              aria-label={descricao(item)} aria-pressed={escolhido === item.id} onClick={() => onEscolher(item)}>
              <span className="grade-inventario__nome">{item.nome}</span>
            </button>
          );
        })}
      </div>
      {soltos.length > 0 && (
        <ul className="recipiente__soltos">
          {soltos.map((item) => (
            <li key={item.id}>
              <button type="button" className="button button--ghost" {...arrastavel(item)} aria-pressed={escolhido === item.id}
                aria-label={descricao(item)} onClick={() => onEscolher(item)}>{item.nome}</button>
            </li>
          ))}
        </ul>
      )}
      {recipiente.itens.length === 0 && <p className="preview-note">Vazio.</p>}
    </section>
  );
}

/**
 * Chão e baús da cena ativa (carga-por-espacos 6.2). Todos veem o que há neles; cada um leva itens
 * para a grade de um personagem que pode editar. Na disputa pelo mesmo item, vence o primeiro pedido
 * confirmado pelo servidor.
 */
export function SceneStashes({ api, mesaId, userId, narrator }: {
  api: ApiClient; mesaId: string; userId: string; narrator: boolean;
}) {
  const queryClient = useQueryClient();
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [nomeBau, setNomeBau] = useState("");
  const [colunasBau, setColunasBau] = useState(4);
  const [linhasBau, setLinhasBau] = useState(4);
  const [cartaBau, setCartaBau] = useState<{ recipienteId: string; versaoId: string }>({ recipienteId: "", versaoId: "" });

  const recipientes = useQuery({
    queryKey: ["sala", mesaId, "recipientes"],
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/sala/recipientes", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar o chão e os baús."));
      return data ?? [];
    },
  });
  const personagens = usePersonagens(api, mesaId, false);
  const candidatos = (personagens.data ?? []).filter((p) => narrator || p.proprietario_id === userId);
  const destino = candidatos.find((p) => p.id === destinoId) ?? candidatos[0] ?? null;
  const grade = useQuery({
    queryKey: sheetKeys.grade(mesaId, destino?.id ?? ""),
    enabled: destino !== null,
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/grade", {
        params: { path: { mesa_id: mesaId, personagem_id: destino?.id ?? "" } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar a grade."));
      return data as GradeInventario;
    },
  });
  const catalogo = useCatalogo(api, mesaId);
  const cartasItem = narrator ? (catalogo.data ?? []).filter((c) => c.tipo === "item" && c.publicada && !c.arquivada) : [];

  function atualizarDepois(personagemId?: string) {
    void queryClient.invalidateQueries({ queryKey: ["sala", mesaId] });
    if (!personagemId) return;
    for (const chave of [sheetKeys.grade, sheetKeys.inventario, sheetKeys.efeitos, sheetKeys.valoresDerivados, sheetKeys.ficha]) {
      void queryClient.invalidateQueries({ queryKey: chave(mesaId, personagemId) });
    }
  }

  const pegar = useMutation({
    mutationFn: async ({ alvo, lugar }: { alvo: Escolha; lugar: Destino | null }) => {
      if (!destino || !grade.data) throw new Error("Escolha para qual personagem levar o item.");
      const { error } = await api.POST("/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/itens/{retrato_id}/pegar", {
        params: { path: { mesa_id: mesaId, recipiente_id: alvo.recipiente.id, retrato_id: alvo.item.id } },
        body: {
          personagem_id: destino.id, versao_esperada: grade.data.versao,
          coluna: lugar?.coluna ?? null, linha: lugar?.linha ?? null, girado: lugar?.girado ?? false,
        },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível pegar o item."));
      return { alvo, lugar };
    },
    onSuccess: ({ alvo, lugar }) => {
      setEscolha(null);
      setMensagem({ erro: false, texto: lugar
        ? `${alvo.item.nome} foi para a grade de ${destino?.nome}.`
        : `${alvo.item.nome} foi para ${destino?.nome}, fora da grade: arrume-o na ficha.` });
      atualizarDepois(destino?.id);
    },
    onError: (erro) => {
      setMensagem({ erro: true, texto: erro.message });
      atualizarDepois(destino?.id);
    },
  });

  const criarBau = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST("/mesas/{mesa_id}/sala/recipientes", {
        params: { path: { mesa_id: mesaId } }, body: { nome: nomeBau.trim(), colunas: colunasBau, linhas: linhasBau },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível criar o baú."));
    },
    onSuccess: () => { setNomeBau(""); atualizarDepois(); },
  });

  const colocarCarta = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST("/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/cartas", {
        params: { path: { mesa_id: mesaId, recipiente_id: cartaBau.recipienteId } }, body: { versao_id: cartaBau.versaoId },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível colocar a carta."));
    },
    onSuccess: () => atualizarDepois(),
  });

  if (recipientes.isPending) return <p role="status">Carregando o chão e os baús…</p>;
  if (recipientes.isError) return <p role="alert">{recipientes.error.message}</p>;

  const lista = recipientes.data;
  const escolhaAtual = escolha && lista.some((r) => r.itens.some((i) => i.id === escolha.item.id)) ? escolha : null;
  const itensGrade = (grade.data?.itens ?? []).filter(temFormato).map(paraGrade);
  const escolhaTemFormato = escolhaAtual ? escolhaAtual.item.largura != null && escolhaAtual.item.altura != null : false;

  function receberExterno(lugar: Destino) {
    if (!escolhaAtual || pegar.isPending) return;
    pegar.mutate({ alvo: escolhaAtual, lugar });
  }

  function enviarBau(evento: FormEvent) { evento.preventDefault(); criarBau.mutate(); }
  function enviarCarta(evento: FormEvent) { evento.preventDefault(); colocarCarta.mutate(); }

  return (
    <section className="panel recipientes" aria-label="Chão e baús">
      <h3>Chão e baús da cena ativa</h3>
      {lista.length === 0 && <p className="preview-note">Ainda não há itens largados nem baús nesta cena.</p>}
      <div className="recipientes__lista">
        {lista.map((recipiente) => (
          <GradeRecipiente key={recipiente.id} recipiente={recipiente} escolhido={escolhaAtual?.item.id ?? null}
            onEscolher={(item) => { setEscolha({ recipiente, item }); setMensagem(null); }} />
        ))}
      </div>

      {candidatos.length > 0 ? (
        <div className="recipientes__destino">
          <label>Levar para
            <select value={destino?.id ?? ""} onChange={(e) => setDestinoId(e.target.value)}>
              {candidatos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          {escolhaAtual && (
            <div role="group" aria-label={`Ações para ${escolhaAtual.item.nome}`} className="recipientes__acoes">
              <strong>{escolhaAtual.item.nome}</strong>
              <span className="preview-note"> em {escolhaAtual.recipiente.nome}</span>
              <button type="button" className="button" disabled={pegar.isPending || !grade.data}
                onClick={() => pegar.mutate({ alvo: escolhaAtual, lugar: null })}>
                Pegar para {destino?.nome}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setEscolha(null)}>Cancelar</button>
            </div>
          )}
          {mensagem && <p role={mensagem.erro ? "alert" : "status"}>{mensagem.texto}</p>}
          {grade.isError && <p role="alert">{grade.error.message}</p>}
          {grade.data && (
            <InventoryGrid
              rotulo={`Grade de ${destino?.nome}`}
              parametros={parametrosDaGrade(grade.data)}
              itens={itensGrade}
              onMover={() => undefined}
              somenteLeitura
              externo={escolhaAtual && escolhaTemFormato
                ? { nome: escolhaAtual.item.nome, largura: escolhaAtual.item.largura ?? 1, altura: escolhaAtual.item.altura ?? 1 }
                : null}
              onColocarExterno={escolhaAtual && escolhaTemFormato ? receberExterno : undefined}
            />
          )}
          <p className="preview-note">
            Arraste um item até a grade, ou escolha o item e toque numa célula. Pelo teclado, "Pegar" leva o item para fora da
            grade do personagem, e você o arruma na ficha.
          </p>
        </div>
      ) : (
        <p className="preview-note">Você não controla nenhum personagem nesta mesa para levar itens.</p>
      )}

      {narrator && (
        <div className="recipientes__narrador">
          <form onSubmit={enviarBau} className="moedas__form">
            <h4>Novo baú</h4>
            <label>Nome <input value={nomeBau} onChange={(e) => setNomeBau(e.target.value)} required maxLength={200} /></label>
            <div className="moedas__campos">
              <label>Colunas <input type="number" min={1} max={20} value={colunasBau}
                onChange={(e) => setColunasBau(Math.min(20, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))} /></label>
              <label>Linhas <input type="number" min={1} max={20} value={linhasBau}
                onChange={(e) => setLinhasBau(Math.min(20, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))} /></label>
            </div>
            <button type="submit" className="button button--secondary" disabled={criarBau.isPending || !nomeBau.trim()}>Criar baú</button>
            {criarBau.isError && <p role="alert">{criarBau.error.message}</p>}
          </form>
          {lista.length > 0 && cartasItem.length > 0 && (
            <form onSubmit={enviarCarta} className="moedas__form">
              <h4>Colocar carta de item</h4>
              <label>Carta
                <select value={cartaBau.versaoId} onChange={(e) => setCartaBau({ ...cartaBau, versaoId: e.target.value })}>
                  <option value="">Escolha…</option>
                  {cartasItem.map((c) => <option key={c.id} value={c.publicada?.id ?? ""}>{String(c.publicada?.conteudo?.titulo ?? "Item")}</option>)}
                </select>
              </label>
              <label>Onde
                <select value={cartaBau.recipienteId} onChange={(e) => setCartaBau({ ...cartaBau, recipienteId: e.target.value })}>
                  <option value="">Escolha…</option>
                  {lista.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </label>
              <button type="submit" className="button button--secondary"
                disabled={colocarCarta.isPending || !cartaBau.versaoId || !cartaBau.recipienteId}>Colocar</button>
              {colocarCarta.isError && <p role="alert">{colocarCarta.error.message}</p>}
            </form>
          )}
        </div>
      )}
    </section>
  );
}
