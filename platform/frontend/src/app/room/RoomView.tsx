import { useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";
import { useConnectivityStatus } from "../connectivity/useConnectivityStatus";
import { ImageUpload } from "../assets/ImageUpload";
import { useAssetImage } from "../assets/useAssetImage";
import { RoomCanvas } from "./RoomCanvas";
import type { RealtimeSession } from "./RoomPresence";
import { SceneStashes } from "./SceneStashes";
import { CartasDoPainel } from "./CartasDoPainel";
import { FichasDoPainel } from "./FichasDoPainel";
import { abaValida, CHAVE_ABA_DO_PAINEL } from "./abasDoPainel";
import { BolsaDoPainel } from "./BolsaDoPainel";
import { ChatReservado, MusicaReservada, PainelDaSala } from "./PainelDaSala";
import { useRoomEphemera } from "./useRoomEphemera";
import { casaLivre } from "./viewport";
import { useMovimentoDeTokens } from "./useMovimentoDeTokens";
import { PersonagensDosJogadores } from "./PersonagensDosJogadores";
import { TamanhoDoMapa } from "./TamanhoDoMapa";
import { SecaoRetratil } from "./SecaoRetratil";
import { useParticipantes, usePersonagens } from "../characters/api";
import { EscolherJogadores, PermissoesEmLote, type ModoDePermissao } from "./PermissaoDeMovimento";
import { useRetratosDosTokens } from "./useRetratosDosTokens";
import { intervaloDaSala } from "./atualizacao";
import { Glyph } from "../../ui/Display";
import { usePreferenciaLocal, usePreferenciaNumerica, usePreferenciaTexto } from "../shells/usePreferenciaLocal";
import "./room.css";

/** Se os tokens que o Narrador põe na cena entram ocultos dos jogadores (item 12), lembrado neste navegador. */
export const CHAVE_COLOCAR_OCULTO = "cursed:mesa:colocar-oculto";
/** Chão e baús (menu retrátil embaixo do grid) aberto ou fechado neste navegador. */
export const CHAVE_CHAO_ABERTO = "cursed:mesa:chao-aberto";
/** Painel da Sala aberto ou fechado neste navegador; o padrão depende do papel. */
export const CHAVE_PAINEL_DA_CENA = "cursed:mesa:painel-da-cena";
/** Largura do painel da cena (px), ajustável pela alça e lembrada neste navegador. */
export const CHAVE_LARGURA_PAINEL = "cursed:mesa:largura-painel";
export const LARGURA_PAINEL_PADRAO = 352;
export const LARGURA_PAINEL_MINIMA = 288;
export const LARGURA_PAINEL_MAXIMA = 640;
const PASSO_LARGURA = 16;
const PASSO_LARGURA_LONGO = 64;

/** Prende a largura entre os limites e a 60% da Sala (quando a largura da Sala é conhecida). */
function limitarLargura(valor: number, larguraSala = 0): number {
  const maxima = larguraSala > 0
    ? Math.max(LARGURA_PAINEL_MINIMA, Math.min(LARGURA_PAINEL_MAXIMA, larguraSala * 0.6))
    : LARGURA_PAINEL_MAXIMA;
  return Math.round(Math.min(maxima, Math.max(LARGURA_PAINEL_MINIMA, valor)));
}

/** Pixels cobertos à direita pelo painel aberto. Até 760 px ele é gaveta de baixo e não cobre a lateral. */
function reservaDoPainel(aberto: boolean, largura: number): number {
  if (!aberto) return 0;
  if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 760px)").matches) return 0;
  return largura;
}

type Token = components["schemas"]["TokenSala"];

/**
 * Sala de página única: o grid ocupa a área toda; o painel da Sala (abas Cena, Chat, Fichas e Cartas)
 * e o menu de chão e baús ficam por cima dele, nunca empilhados abaixo.
 */
/** Para o Narrador, tudo sobre tokens fica numa seção retrátil "Tokens" (item 15); o jogador só tem a lista da cena. */
function SecaoComTokens({ narrator, children }: { narrator: boolean; children: ReactNode }) {
  return narrator ? <SecaoRetratil id="tokens-grupo" titulo="Tokens">{children}</SecaoRetratil> : <>{children}</>;
}

export function RoomView({ api, mesaId, userId, narrator, realtime, onAbrirFicha }: {
  api: ApiClient; mesaId: string; userId: string; narrator: boolean; realtime?: RealtimeSession;
  /** Atalho do jogador para Minha ficha quando a Sala está desativada. */
  onAbrirFicha?: () => void;
}) {
  const queryClient = useQueryClient();
  const [painelAberto, setPainelAberto] = usePreferenciaLocal(CHAVE_PAINEL_DA_CENA, narrator);
  const [abaGuardada, setAba] = usePreferenciaTexto(CHAVE_ABA_DO_PAINEL, "cena");
  const aba = abaValida(abaGuardada);
  const [chaoAberto, setChaoAberto] = usePreferenciaLocal(CHAVE_CHAO_ABERTO, false);
  // O Narrador decide, ao colocar, se o jogador vê o token (item 12): a chave "Colocar oculto".
  const [colocarOculto, setColocarOculto] = usePreferenciaLocal(CHAVE_COLOCAR_OCULTO, false);
  const [larguraGuardada, setLarguraGuardada] = usePreferenciaNumerica(CHAVE_LARGURA_PAINEL, LARGURA_PAINEL_PADRAO);
  // Durante o arraste a largura é só prévia visual; ao soltar, é confirmada e o mapa se reenquadra uma vez.
  const [previaLargura, setPreviaLargura] = useState<number | null>(null);
  const arrasteAlca = useRef<{ inicioX: number; inicial: number } | null>(null);
  const salaRef = useRef<HTMLElement>(null);
  const [cenaEscolhida, setCenaEscolhida] = useState<string | null>(null);
  const [tokenEscolhido, setTokenEscolhido] = useState<string | null>(null);
  const [nomeCena, setNomeCena] = useState("");
  const conectividade = useConnectivityStatus();
  const ephemera = useRoomEphemera(mesaId, userId, realtime);
  const movimentos = useMovimentoDeTokens(api, mesaId, conectividade === "online");
  const personagens = usePersonagens(api, mesaId, false);
  // O canvas informa a casa do centro da vista, para "Colocar" um personagem ali.
  const centroDaVista = useRef<(() => { x: number; y: number }) | null>(null);
  const sala = useQuery({
    // Sem tempo real (ambiente local) ou se um aviso se perder, a Sala se atualiza sozinha (item 12).
    refetchInterval: intervaloDaSala(Boolean(realtime)),
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
  // Retirar um token da mesa (item 11): só o Narrador; o servidor confere a versão.
  const retirarToken = useMutation({
    mutationFn: async (alvo: Token) => {
      const { error } = await api.DELETE("/mesas/{mesa_id}/sala/tokens/{token_id}", {
        params: { path: { mesa_id: mesaId, token_id: alvo.id }, query: { versao_esperada: alvo.versao } },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível retirar o token."));
    },
    onSuccess: (_resultado, alvo) => {
      if (tokenEscolhido === alvo.id) setTokenEscolhido(null);
      void atualizar();
    },
  });
  // Ocultar e mostrar um token para os jogadores (item 12): só o Narrador; o servidor confere a versão.
  const alternarOculto = useMutation({
    mutationFn: async (alvo: Token) => {
      const { error } = await api.POST("/mesas/{mesa_id}/sala/tokens/{token_id}/visibilidade", {
        params: { path: { mesa_id: mesaId, token_id: alvo.id } },
        body: { oculto: !alvo.oculto, versao_esperada: alvo.versao },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível mudar a visibilidade do token."));
    },
    onSuccess: () => { void atualizar(); },
  });
  // Permissão de movimento (item 13): só o Narrador. Token sem dono só é liberado para jogadores escolhidos.
  const participantes = useParticipantes(api, mesaId, { enabled: narrator });
  const [liberandoPara, setLiberandoPara] = useState<Token | null>(null);
  const permitirMovimento = useMutation({
    mutationFn: async ({ alvo, liberado, controladores }: { alvo: Token; liberado: boolean; controladores?: string[] }) => {
      const { error } = await api.POST("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento-permitido", {
        params: { path: { mesa_id: mesaId, token_id: alvo.id } },
        body: { liberado, versao_esperada: alvo.versao, ...(controladores ? { controladores } : {}) },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível mudar a permissão de movimento."));
    },
    onSuccess: () => { setLiberandoPara(null); void atualizar(); },
  });
  const permissoesEmLote = useMutation({
    mutationFn: async (modo: ModoDePermissao) => {
      const alvo = sala.data?.cena;
      if (!alvo) throw new Error("Selecione uma cena.");
      const { error } = await api.POST("/mesas/{mesa_id}/sala/cenas/{cena_id}/permissoes", {
        params: { path: { mesa_id: mesaId, cena_id: alvo.id } }, body: { modo },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível mudar as permissões de movimento."));
    },
    onSuccess: () => { void atualizar(); },
  });
  const donos = new Map((personagens.data ?? []).map((p) => [p.id, p.proprietario_id]));
  function alternarMovimento(alvo: Token) {
    if (alvo.movimento_liberado) permitirMovimento.mutate({ alvo, liberado: false });
    else if (alvo.personagem_id && donos.get(alvo.personagem_id)) permitirMovimento.mutate({ alvo, liberado: true });
    else setLiberandoPara(alvo);
  }
  // Quantas casas o mapa ocupa (item 12): só o Narrador.
  const redimensionarMapa = useMutation({
    mutationFn: async ({ colunas, linhas }: { colunas: number; linhas: number }) => {
      const alvo = sala.data?.cena;
      if (!alvo) throw new Error("Selecione uma cena.");
      const { error } = await api.POST("/mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa", {
        params: { path: { mesa_id: mesaId, cena_id: alvo.id } }, body: { colunas, linhas },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível mudar o tamanho do mapa."));
    },
    onSuccess: () => { void atualizar(); },
  });
  // Personagem posto na cena pelo Narrador (itens 9 e 10): ligado ao personagem, na camada da mesa.
  const colocarPersonagem = useMutation({
    mutationFn: async ({ personagem, x: px, y: py }: { personagem: { id: string; nome: string }; x: number; y: number }) => {
      const alvo = sala.data?.cena;
      if (!alvo) throw new Error("Selecione uma cena.");
      const daMesa = alvo.camadas.find((c) => c.visibilidade === "mesa") ?? alvo.camadas[0];
      const { error } = await api.POST("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", {
        params: { path: { mesa_id: mesaId, cena_id: alvo.id } },
        body: { camada_id: daMesa?.id ?? "", rotulo: personagem.nome.slice(0, 100), x: px, y: py, tamanho: 1,
          personagem_id: personagem.id, oculto: colocarOculto },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível pôr o personagem na cena."));
    },
    onSuccess: () => { void atualizar(); },
  });

  const cena = sala.data?.cena;
  const mapa = useAssetImage(api, mesaId, cena?.mapa_objeto ?? "", { enabled: Boolean(cena?.mapa_objeto) });
  const token = cena?.tokens.find((item: Token) => item.id === tokenEscolhido);
  const porPersonagem = new Map((personagens.data ?? []).map((p) => [p.id, p]));
  // Retratos pela rota do token (item 12): o jogador vê a foto mesmo de ficha oculta, sem poder abrir a ficha.
  const retratos = useRetratosDosTokens(api, mesaId, cena?.tokens ?? []);

  if (sala.isPending) return <section className="room-view room-view--aviso" aria-label="Sala compartilhada">
    <h1 className="sr-only">Sala</h1><p role="status">Carregando sala…</p></section>;
  if (sala.isError) return <section className="room-view room-view--aviso" aria-label="Sala compartilhada">
    <h1 className="sr-only">Sala</h1><p role="alert">{sala.error.message}</p></section>;
  if (!sala.data?.modulo_ativo) return <section className="room-view room-view--aviso" aria-label="Sala compartilhada">
    <div className="panel room-view__desativada">
      <h1>Sala desativada</h1>
      {narrator
        ? <p>Ative o módulo desta mesa quando quiser usar o grid.</p>
        : <p>O Narrador ainda não ativou a Sala desta mesa.</p>}
      {narrator && <button type="button" className="button" disabled={ativarModulo.isPending}
        onClick={() => ativarModulo.mutate()}>Ativar sala</button>}
      {!narrator && onAbrirFicha && <button type="button" className="button" onClick={onAbrirFicha}>Abrir minha ficha</button>}
      {ativarModulo.isError && <p role="alert">{ativarModulo.error.message}</p>}
    </div>
  </section>;

  // Os tokens em movimento aparecem já no destino enquanto o servidor valida. Sem prévias, é a própria cena
  // (o mesmo objeto), para o canvas não redesenhar à toa.
  const previas = movimentos.previas;
  const cenaVisual = cena && Object.keys(previas).length > 0
    ? { ...cena, tokens: cena.tokens.map((item) => (previas[item.id] ? { ...item, ...previas[item.id] } : item)) }
    : cena;
  const posicaoDe = (item: Token) => movimentos.previas[item.id] ?? { x: item.x, y: item.y };
  function soltarToken(id: string, coluna: number, linha: number) {
    const alvo = cena?.tokens.find((item) => item.id === id);
    if (alvo && (alvo.x !== coluna || alvo.y !== linha)) void movimentos.mover(alvo, coluna, linha);
  }
  const naCena = new Set((cena?.tokens ?? []).map((item) => item.personagem_id).filter((id): id is string => Boolean(id)));
  const larguraPainel = limitarLargura(larguraGuardada);
  const larguraVisivel = previaLargura ?? larguraPainel;
  const larguraSala = () => salaRef.current?.clientWidth ?? 0;
  const confirmarLargura = (valor: number) => setLarguraGuardada(limitarLargura(valor, larguraSala()));
  function teclaAlca(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = evento.shiftKey ? PASSO_LARGURA_LONGO : PASSO_LARGURA;
    const novo = evento.key === "ArrowLeft" ? larguraPainel + passo
      : evento.key === "ArrowRight" ? larguraPainel - passo
        : evento.key === "Home" ? LARGURA_PAINEL_MINIMA
          : evento.key === "End" ? LARGURA_PAINEL_MAXIMA : null;
    if (novo === null) return;
    evento.preventDefault();
    confirmarLargura(novo);
  }
  function soltarAlca() {
    if (!arrasteAlca.current) return;
    arrasteAlca.current = null;
    if (previaLargura !== null) confirmarLargura(previaLargura);
    setPreviaLargura(null);
  }
  function enviarCena(evento: FormEvent) { evento.preventDefault(); criarCena.mutate(); }
  const gestaoDeCenas = narrator && <SecaoRetratil id="cenas" titulo="Cenas" contagem={sala.data.cenas?.length ?? 0} papel="group">
    {/* Cada cena: o nome abre a cena no grid do Narrador; a chave diz qual é a ativa, a que os jogadores veem.
        Só existe ativar (ativar outra desliga a anterior), então a chave da cena ativa fica ligada e travada. */}
    <ul className="painel-sala__lista-cenas">{sala.data.cenas?.map((item) => <li key={item.id} className="painel-sala__cena-item">
      <button type="button" className="painel-sala__cena-botao" aria-current={cena?.id === item.id ? "true" : undefined}
        onClick={() => { setCenaEscolhida(item.id); setTokenEscolhido(null); }}>
        <Glyph name="map" size={16} /><span>{item.nome}</span>
      </button>
      <label className="chave" title={item.ativa ? "Cena ativa: é a que os jogadores veem" : "Tornar esta a cena dos jogadores"}>
        <input type="checkbox" role="switch" className="chave__entrada" checked={item.ativa}
          disabled={item.ativa || ativarCena.isPending} aria-label={`Cena ativa: ${item.nome}`}
          onChange={() => ativarCena.mutate(item.id)} />
        <span className="chave__trilho" aria-hidden="true"><span className="chave__botao" /></span>
        <span className="chave__rotulo" aria-hidden="true">Ativa</span>
      </label>
    </li>)}</ul>
    <form className="painel-sala__nova-cena" onSubmit={enviarCena}>
      <input value={nomeCena} onChange={(e) => setNomeCena(e.target.value)} required maxLength={200}
        placeholder="Nova cena" aria-label="Nova cena" />
      <button type="submit" className="button" disabled={criarCena.isPending || !nomeCena.trim()}>Criar cena</button>
    </form>
    {cena && <ImageUpload api={api} mesaId={mesaId} destino="mapa" alvo={cena.id} rotulo="mapa da cena" aparencia="miniatura"
      previa={cena.mapa_objeto ? mapa.data : undefined} temImagem={Boolean(cena.mapa_objeto)}
      onConcluido={() => { void atualizar(); }} />}
    {cena && <TamanhoDoMapa key={`${cena.id}-${cena.colunas}x${cena.linhas}`} colunas={cena.colunas} linhas={cena.linhas}
      pendente={redimensionarMapa.isPending} onAplicar={(colunas, linhas) => redimensionarMapa.mutate({ colunas, linhas })} />}
    {redimensionarMapa.isError && <p role="alert">{redimensionarMapa.error.message}</p>}
    {(criarCena.isError || ativarCena.isError) && <p role="alert">{criarCena.error?.message ?? ativarCena.error?.message}</p>}
  </SecaoRetratil>;
  const classesSala = ["room-view", painelAberto && "room-view--painel-aberto", cena && chaoAberto && "room-view--chao-aberto"]
    .filter(Boolean).join(" ");
  return <section ref={salaRef} className={classesSala}
    aria-label="Sala compartilhada" style={{ "--largura-painel": `${larguraVisivel}px` } as CSSProperties}>
    <h1 className="sr-only">{cena ? `Sala — ${cena.nome}` : "Sala"}</h1>
    <div className="room-view__palco">
      {cena
        ? <RoomCanvas cena={cenaVisual ?? cena} onSelectToken={setTokenEscolhido} mapaUrl={cena.mapa_objeto ? mapa.data : undefined}
          retratos={retratos} centroDaVistaRef={centroDaVista}
          onSoltarPersonagem={narrator ? (id, coluna, linha) => {
            const personagem = porPersonagem.get(id);
            if (personagem) colocarPersonagem.mutate({ personagem, x: coluna, y: linha });
          } : undefined}
          cursores={ephemera.cursores} pings={ephemera.pings} arrastes={ephemera.arrastes}
          onCursor={ephemera.cursor} onPing={ephemera.ping}
          onDragPreview={ephemera.arraste}
          onDragEnd={soltarToken}
          onDragCancel={ephemera.cancelarArraste} reservaDireita={reservaDoPainel(painelAberto, larguraPainel)} />
        : <p className="room-view__vazio">{narrator
          ? "Ainda não há cena. Crie a primeira na aba Cena do painel."
          : "Ainda não há cena ativa para mostrar."}</p>}

      <div className="room-view__topo">
        {cena ? <span className="room-view__cena">{cena.nome}</span> : <span />}
        {!painelAberto && <button type="button" className="room-view__alternar" aria-expanded={false} aria-controls="painel-da-cena"
          onClick={() => setPainelAberto(true)}>
          <Glyph name="menu" size={18} /><span>Abrir painel</span>
        </button>}
      </div>

      <div className="room-view__signals" aria-live="polite" aria-label="Sinais temporários da mesa">
        {ephemera.pings.map((sinal) => <p key={`${sinal.usuarioId}-${sinal.recebidoEm}`}>
          Ping de {sinal.usuarioId}: coluna {sinal.x}, linha {sinal.y}.</p>)}
        {ephemera.arrastes.map((sinal) => <p key={sinal.tokenId}>
          Prévia de arraste de {sinal.usuarioId}: coluna {sinal.x}, linha {sinal.y}.</p>)}
        {ephemera.cursores.map((sinal) => <p key={sinal.usuarioId}>
          Cursor de {sinal.usuarioId}: coluna {sinal.x}, linha {sinal.y}.</p>)}
      </div>
      {/* As mensagens do movimento ficam fora do painel: são anunciadas mesmo com ele fechado. */}
      <div className="room-view__avisos">
        {movimentos.movendo && <p role="status">Movendo token…</p>}
        {movimentos.erro && <p role="alert">{movimentos.erro}</p>}
        {colocarPersonagem.isError && <p role="alert">{colocarPersonagem.error.message}</p>}
      </div>

      {/* Chão e baús: menu retrátil embaixo do grid (pedido do usuário, 2026-10-02). */}
      {cena && <div className="room-view__chao">
        <button type="button" className="room-view__chao-botao" aria-expanded={chaoAberto} aria-controls="chao-da-cena"
          onClick={() => setChaoAberto(!chaoAberto)}>
          <Glyph name="bag" size={16} /><span>Chão e baús</span>
          <Glyph name="chevron" size={14} className="room-view__chao-seta" />
        </button>
        <div id="chao-da-cena" className="room-view__chao-corpo" hidden={!chaoAberto}>
          {chaoAberto && <SceneStashes api={api} mesaId={mesaId} userId={userId} narrator={narrator} />}
        </div>
      </div>}
    </div>

    {painelAberto && <div className={`room-view__alca ${previaLargura !== null ? "room-view__alca--ativa" : ""}`.trim()}
      role="separator" aria-orientation="vertical" aria-label="Largura do painel da Sala" aria-controls="painel-da-cena"
      aria-valuemin={LARGURA_PAINEL_MINIMA} aria-valuemax={LARGURA_PAINEL_MAXIMA} aria-valuenow={larguraVisivel}
      aria-valuetext={`${larguraVisivel} pixels`} tabIndex={0} title="Arraste para ajustar a largura; dois cliques voltam ao padrão"
      onKeyDown={teclaAlca} onDoubleClick={() => setLarguraGuardada(LARGURA_PAINEL_PADRAO)}
      onPointerDown={(evento) => {
        if (evento.button !== 0) return;
        // O preventDefault evita selecionar texto no arraste, mas também tiraria o foco: a alça o recebe aqui.
        evento.preventDefault();
        evento.currentTarget.focus();
        evento.currentTarget.setPointerCapture?.(evento.pointerId);
        arrasteAlca.current = { inicioX: evento.clientX, inicial: larguraPainel };
        setPreviaLargura(larguraPainel);
      }}
      onPointerMove={(evento) => {
        const arraste = arrasteAlca.current;
        if (!arraste) return;
        setPreviaLargura(limitarLargura(arraste.inicial + arraste.inicioX - evento.clientX, larguraSala()));
      }}
      onPointerUp={soltarAlca} onPointerCancel={soltarAlca} />}
    <aside id="painel-da-cena" className="room-view__painel" aria-label="Painel da Sala" hidden={!painelAberto}>
      {painelAberto && <PainelDaSala aba={aba} onTrocarAba={setAba} onRecolher={() => setPainelAberto(false)}
        conteudo={aba === "chat" ? <ChatReservado />
          : aba === "fichas" ? <FichasDoPainel api={api} mesaId={mesaId} userId={userId} />
          : aba === "bolsa" ? <BolsaDoPainel api={api} mesaId={mesaId} userId={userId} narrator={narrator} />
          : aba === "musica" ? <MusicaReservada />
            : aba === "cartas" ? <CartasDoPainel api={api} mesaId={mesaId} userId={userId} narrator={narrator} />
              : <div className="painel-sala__cena">{gestaoDeCenas}{!cena ? <p>Sem cena aberta.</p> : <>
            {/* Item 15: barra de colocar, personagens dos jogadores, NPCs e monstros e tokens em cena numa seção só. */}
            <SecaoComTokens narrator={narrator}>
            {narrator && <PersonagensDosJogadores api={api} mesaId={mesaId} personagens={personagens.data ?? []} naCena={naCena}
              colocarOculto={colocarOculto} onColocarOculto={setColocarOculto}
              onColocar={(personagem) => colocarPersonagem.mutate({
                personagem, ...casaLivre(centroDaVista.current?.() ?? { x: 0, y: 0 }, cena.tokens) })} />}
            <SecaoRetratil id="tokens" titulo="Tokens da cena" contagem={cena.tokens.length} interna={narrator}><div className="room-view__details">
              <p className="room-view__hint">Arraste um token que você controla e solte onde quiser: ele já vai.
                Dê dois cliques no mapa para enviar um ping.</p>
              {narrator && cena.tokens.length > 0 && <PermissoesEmLote pendente={permissoesEmLote.isPending}
                onEscolher={(modo) => permissoesEmLote.mutate(modo)} />}
              {cena.tokens.length === 0 && <p>Nenhum token nesta cena.</p>}
              <ul className="tokens-cena">{cena.tokens.map((item: Token) => {
                const posicao = posicaoDe(item);
                return <li key={item.id} className="tokens-cena__item">
                  <button type="button" className="tokens-cena__escolher" aria-pressed={tokenEscolhido === item.id}
                    onClick={() => setTokenEscolhido(item.id)}>
                    {retratos[item.id]
                      ? <img className="tokens-cena__retrato" src={retratos[item.id]} alt="" width={36} height={36} />
                      : <span className="tokens-cena__retrato tokens-cena__retrato--iniciais" aria-hidden="true">
                        {item.rotulo.slice(0, 2).toLocaleUpperCase("pt-BR")}</span>}
                    <span className="tokens-cena__nome">{item.rotulo}</span>{" "}
                    <small className="tokens-cena__posicao">({posicao.x}, {posicao.y})</small>
                    {narrator && (item.oculto || !item.movimento_liberado) && <span className="tokens-cena__marcas">
                      {item.oculto && <span className="tokens-cena__oculto">oculto</span>}
                      {!item.movimento_liberado && <span className="tokens-cena__oculto">bloqueado</span>}
                    </span>}
                  </button>
                  {narrator && <button type="button" className="tokens-cena__acao" aria-pressed={Boolean(item.oculto)}
                    aria-label={`${item.oculto ? "Mostrar" : "Ocultar"} ${item.rotulo}`}
                    title={item.oculto ? "Mostrar aos jogadores" : "Ocultar dos jogadores"} disabled={alternarOculto.isPending}
                    onClick={() => alternarOculto.mutate(item)}><Glyph name={item.oculto ? "eye-off" : "eye"} size={15} /></button>}
                  {narrator && <button type="button" className="tokens-cena__acao" aria-pressed={!item.movimento_liberado}
                    aria-label={`${item.movimento_liberado ? "Bloquear" : "Liberar"} movimento de ${item.rotulo}`}
                    title={item.movimento_liberado ? "Jogadores podem mover; clique para bloquear" : "Só o Narrador move; clique para liberar"}
                    disabled={permitirMovimento.isPending} onClick={() => alternarMovimento(item)}>
                    <Glyph name={item.movimento_liberado ? "unlock" : "lock"} size={15} /></button>}
                  {narrator && <button type="button" className="tokens-cena__retirar" aria-label={`Retirar ${item.rotulo}`}
                    title="Tirar este token da mesa" disabled={retirarToken.isPending}
                    onClick={() => retirarToken.mutate(item)}><Glyph name="close" size={14} /></button>}
                </li>;
              })}</ul>
              {retirarToken.isError && <p role="alert">{retirarToken.error.message}</p>}
              {alternarOculto.isError && <p role="alert">{alternarOculto.error.message}</p>}
              {(permitirMovimento.isError || permissoesEmLote.isError) && <p role="alert">
                {permitirMovimento.error?.message ?? permissoesEmLote.error?.message}</p>}
              {liberandoPara && <EscolherJogadores rotulo={liberandoPara.rotulo} iniciais={liberandoPara.controladores ?? []}
                jogadores={(participantes.data ?? []).filter((p) => p.papel === "jogador")} pendente={permitirMovimento.isPending}
                onFechar={() => setLiberandoPara(null)}
                onConfirmar={(controladores) => permitirMovimento.mutate({ alvo: liberandoPara, liberado: true, controladores })} />}
              {token && <p role="status" className="tokens-cena__estado">{token.rotulo}: coluna {posicaoDe(token).x}, linha {posicaoDe(token).y}.
                {token.controlavel ? " Você controla este token." : " Somente leitura."}</p>}
            </div></SecaoRetratil>
            </SecaoComTokens>
          </>}</div>} />}
    </aside>
  </section>;
}
