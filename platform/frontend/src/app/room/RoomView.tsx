import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";
import { useCommandPreview } from "../connectivity/useCommandPreview";
import { useConnectivityStatus } from "../connectivity/useConnectivityStatus";
import { ImageUpload } from "../assets/ImageUpload";
import { useAssetImage } from "../assets/useAssetImage";
import { RoomCanvas } from "./RoomCanvas";
import type { RealtimeSession } from "./RoomPresence";
import { SceneStashes } from "./SceneStashes";
import { useRoomEphemera } from "./useRoomEphemera";
import "./room.css";

type Token = components["schemas"]["TokenSala"];
type Snapshot = components["schemas"]["SalaSnapshot"];

export function RoomView({ api, mesaId, userId, narrator, realtime }: {
  api: ApiClient; mesaId: string; userId: string; narrator: boolean; realtime?: RealtimeSession;
}) {
  const queryClient = useQueryClient();
  const [cenaEscolhida, setCenaEscolhida] = useState<string | null>(null);
  const [tokenEscolhido, setTokenEscolhido] = useState<string | null>(null);
  const [nomeCena, setNomeCena] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [camada, setCamada] = useState("");
  const [destino, setDestino] = useState<{ tokenId: string; x: number; y: number } | null>(null);
  const conectividade = useConnectivityStatus();
  const ephemera = useRoomEphemera(mesaId, userId, realtime);
  const sala = useQuery({
    queryKey: ["sala", mesaId, cenaEscolhida],
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/sala", {
        params: { path: { mesa_id: mesaId }, query: { cena_id: cenaEscolhida } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar a sala."));
      return data;
    },
  });
  const atualizar = () => queryClient.invalidateQueries({ queryKey: ["sala", mesaId] });
  const ativarModulo = useMutation({
    mutationFn: async () => {
      const { error } = await api.PUT("/mesas/{mesa_id}/modulos", {
        params: { path: { mesa_id: mesaId } }, body: { sala: true },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível ativar a sala."));
    }, onSuccess: atualizar,
  });
  const criarCena = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/sala/cenas", {
        params: { path: { mesa_id: mesaId } },
        body: { nome: nomeCena.trim(), colunas: 20, linhas: 15 },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível criar a cena."));
      return data;
    },
    onSuccess: (data) => { setNomeCena(""); setCenaEscolhida(data?.cena?.id ?? null); void atualizar(); },
  });
  const ativarCena = useMutation({
    mutationFn: async (cenaId: string) => {
      const { error } = await api.POST("/mesas/{mesa_id}/sala/cenas/{cena_id}/ativacao", {
        params: { path: { mesa_id: mesaId, cena_id: cenaId } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível ativar a cena."));
    }, onSuccess: atualizar,
  });
  const criarToken = useMutation({
    mutationFn: async () => {
      if (!sala.data?.cena) throw new Error("Selecione uma cena.");
      const { error } = await api.POST("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", {
        params: { path: { mesa_id: mesaId, cena_id: sala.data.cena.id } },
        body: { camada_id: camada || sala.data.cena.camadas[0]?.id || "", rotulo: rotulo.trim(), x, y, tamanho: 1, oculto: false },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível colocar o token."));
    },
    onSuccess: () => { setRotulo(""); void atualizar(); },
  });

  const cena = sala.data?.cena;
  const mapa = useAssetImage(api, mesaId, cena?.mapa_objeto ?? "", { enabled: Boolean(cena?.mapa_objeto) });
  const token = cena?.tokens.find((item: Token) => item.id === tokenEscolhido);
  const moverX = destino && token && destino.tokenId === token.id ? destino.x : token?.x ?? 0;
  const moverY = destino && token && destino.tokenId === token.id ? destino.y : token?.y ?? 0;
  const movimento = useCommandPreview<Token | null, { x: number; y: number }>({
    confirmed: token ?? null,
    previewFrom: ({ x: novoX, y: novoY }) => token ? { ...token, x: novoX, y: novoY } : null,
    run: async ({ x: novoX, y: novoY }) => {
      if (!token) throw new Error("Selecione um token.");
      const { data, error } = await api.POST("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento", {
        params: { path: { mesa_id: mesaId, token_id: token.id } },
        body: { x: novoX, y: novoY, versao_esperada: token.versao },
      });
      if (error || !data) throw new Error(extractErrorMessage(error, "O movimento não foi confirmado."));
      return data;
    },
    onConfirmed: (confirmado) => {
      if (!confirmado) return;
      setDestino(null);
      queryClient.setQueriesData<Snapshot>({ queryKey: ["sala", mesaId] }, (anterior) => {
        if (!anterior?.cena || !anterior.cena.tokens.some((item) => item.id === confirmado.id)) return anterior;
        return { ...anterior, cena: { ...anterior.cena,
          tokens: anterior.cena.tokens.map((item) => item.id === confirmado.id ? confirmado : item),
        } };
      });
      void atualizar();
    },
    online: conectividade === "online",
  });

  if (sala.isPending) return <p role="status">Carregando sala…</p>;
  if (sala.isError) return <p role="alert">{sala.error.message}</p>;
  if (!sala.data?.modulo_ativo) return <section className="panel panel--wide">
    <h2>Sala desativada</h2>
    <p>O Narrador pode ativar o módulo desta mesa quando quiser usar o grid.</p>
    {narrator && <button type="button" className="button" disabled={ativarModulo.isPending}
      onClick={() => ativarModulo.mutate()}>Ativar sala</button>}
    {ativarModulo.isError && <p role="alert">{ativarModulo.error.message}</p>}
  </section>;

  const cenaVisual = cena && movimento.value && movimento.status === "previa-local"
    ? { ...cena, tokens: cena.tokens.map((item) => item.id === movimento.value?.id ? movimento.value : item) }
    : cena;
  function enviarCena(evento: FormEvent) { evento.preventDefault(); criarCena.mutate(); }
  function enviarToken(evento: FormEvent) { evento.preventDefault(); criarToken.mutate(); }
  return <section className="room-view" aria-label="Sala compartilhada">
    {narrator && <div className="room-view__management panel">
      <h2>Cenas</h2>
      <div className="room-view__scenes">{sala.data.cenas?.map((item) => <div key={item.id}>
        <button type="button" aria-current={cena?.id === item.id ? "true" : undefined}
          onClick={() => { setCenaEscolhida(item.id); setTokenEscolhido(null); }}>{item.nome}</button>
        {!item.ativa && <button type="button" onClick={() => ativarCena.mutate(item.id)}>Ativar</button>}
        {item.ativa && <span>Ativa</span>}
      </div>)}</div>
      <form onSubmit={enviarCena}>
        <label>Nova cena <input value={nomeCena} onChange={(e) => setNomeCena(e.target.value)} required maxLength={200} /></label>
        <button type="submit" className="button" disabled={criarCena.isPending || !nomeCena.trim()}>Criar cena</button>
      </form>
      {(criarCena.isError || ativarCena.isError) && <p role="alert">{criarCena.error?.message ?? ativarCena.error?.message}</p>}
    </div>}
    {!cena ? <p className="panel">Ainda não há cena ativa para mostrar.</p> : <>
      <h2>{cena.nome}</h2>
      {narrator && (
        <ImageUpload api={api} mesaId={mesaId} destino="mapa" alvo={cena.id} rotulo="mapa da cena"
          temImagem={Boolean(cena.mapa_objeto)} onConcluido={() => { void atualizar(); }} />
      )}
      <RoomCanvas cena={cenaVisual ?? cena} onSelectToken={setTokenEscolhido} mapaUrl={cena.mapa_objeto ? mapa.data : undefined}
        cursores={ephemera.cursores} pings={ephemera.pings} arrastes={ephemera.arrastes}
        onCursor={ephemera.cursor} onPing={ephemera.ping}
        onDragPreview={ephemera.arraste}
        onDragEnd={(id, coluna, linha) => setDestino({ tokenId: id, x: coluna, y: linha })}
        onDragCancel={ephemera.cancelarArraste} />
      <p className="room-view__hint">Arraste um token que você controla para escolher o destino; confirme abaixo.
        Dê dois cliques no mapa para enviar um ping.</p>
      {(ephemera.cursores.length > 0 || ephemera.pings.length > 0 || ephemera.arrastes.length > 0) &&
        <aside className="panel room-view__signals" aria-label="Sinais temporários da mesa">
          {ephemera.pings.map((sinal) => <p key={`${sinal.usuarioId}-${sinal.recebidoEm}`}>
            Ping de {sinal.usuarioId}: coluna {sinal.x + 1}, linha {sinal.y + 1}.</p>)}
          {ephemera.arrastes.map((sinal) => <p key={sinal.tokenId}>
            Prévia de arraste de {sinal.usuarioId}: coluna {sinal.x + 1}, linha {sinal.y + 1}.</p>)}
          {ephemera.cursores.map((sinal) => <p key={sinal.usuarioId}>
            Cursor de {sinal.usuarioId}: coluna {sinal.x + 1}, linha {sinal.y + 1}.</p>)}
        </aside>}
      <div className="room-view__details panel">
        <h3>Tokens da cena</h3>
        {cena.tokens.length === 0 && <p>Nenhum token nesta cena.</p>}
        <ul>{cena.tokens.map((item: Token) => <li key={item.id}>
          <button type="button" aria-pressed={tokenEscolhido === item.id}
            onClick={() => setTokenEscolhido(item.id)}>{item.rotulo} ({item.x}, {item.y})</button>
        </li>)}</ul>
        {token && <p role="status">{token.rotulo}: coluna {(movimento.value?.x ?? token.x) + 1}, linha {(movimento.value?.y ?? token.y) + 1}.
          {token.controlavel ? " Você controla este token." : " Somente leitura."}</p>}
        {token?.controlavel && <form className="room-view__move-form" onSubmit={(evento) => {
          evento.preventDefault();
          void movimento.execute({ x: moverX, y: moverY });
        }}>
          <button type="button" onClick={() => ephemera.ping(token.x, token.y)}>Enviar ping neste token</button>
          <label>Coluna de destino <input type="number" min={0} max={cena.colunas - token.tamanho}
            value={moverX} onChange={(evento) => setDestino({ tokenId: token.id, x: Number(evento.target.value), y: moverY })} /></label>
          <label>Linha de destino <input type="number" min={0} max={cena.linhas - token.tamanho}
            value={moverY} onChange={(evento) => setDestino({ tokenId: token.id, x: moverX, y: Number(evento.target.value) })} /></label>
          <button type="submit" className="button" disabled={movimento.isPending}>Confirmar movimento</button>
        </form>}
        {movimento.status === "previa-local" && <p role="status">Prévia local, aguardando confirmação…</p>}
        {movimento.errorMessage && <p role="alert">{movimento.errorMessage} A última posição confirmada foi restaurada.</p>}
      </div>
      <SceneStashes api={api} mesaId={mesaId} userId={userId} narrator={narrator} />
      {narrator && <form className="room-view__token-form panel" onSubmit={enviarToken}>
        <h3>Colocar token</h3>
        <label>Rótulo <input value={rotulo} onChange={(e) => setRotulo(e.target.value)} required maxLength={100} /></label>
        <label>Camada <select value={camada} onChange={(e) => setCamada(e.target.value)}>
          {cena.camadas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select></label>
        <label>Coluna <input type="number" min={0} max={cena.colunas - 1} value={x} onChange={(e) => setX(Number(e.target.value))} /></label>
        <label>Linha <input type="number" min={0} max={cena.linhas - 1} value={y} onChange={(e) => setY(Number(e.target.value))} /></label>
        <button type="submit" className="button" disabled={criarToken.isPending || !rotulo.trim()}>Colocar token</button>
        {criarToken.isError && <p role="alert">{criarToken.error.message}</p>}
      </form>}
    </>}
  </section>;
}
