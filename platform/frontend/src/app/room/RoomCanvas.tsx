import { useCallback, useEffect, useRef, useState, type DragEvent, type MutableRefObject } from "react";
import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from "pixi.js";
import type { components } from "../../api/generated/schema";
import { ARRASTE_DE_PERSONAGEM } from "./arrastes";
import { areaDeInteresse, dentroDoLimite, enquadrar, LIMITE_DA_CENA, pontoFixoNoZoom, proximoZoom } from "./viewport";

type Cena = components["schemas"]["CenaSala"];
type Sinal = { x: number; y: number };
type ArrasteRemoto = Sinal & { tokenId: string };
const CELULA = 48;
/** Folga do enquadramento: em cima ficam a faixa de cenas e o botão do painel; embaixo, o zoom. */
const MARGEM_ENQUADRAMENTO = { x: 24, y: 72 };

let texturaDaCasa: Texture | null = null;

/** Uma casa da grade (as linhas de cima e da esquerda), repetida pelo `TilingSprite` sem custo por casa. */
function casaDaGrade(): Texture {
  if (texturaDaCasa) return texturaDaCasa;
  const tela = document.createElement("canvas");
  tela.width = CELULA;
  tela.height = CELULA;
  const pincel = tela.getContext("2d");
  if (pincel) {
    pincel.fillStyle = "rgba(113, 106, 128, 0.45)";
    pincel.fillRect(0, 0, CELULA, 1);
    pincel.fillRect(0, 0, 1, CELULA);
  }
  texturaDaCasa = Texture.from(tela);
  return texturaDaCasa;
}

/**
 * A cena não tem bordas (experiencia-da-mesa, item 7): a grade é uma só e vai até o limite de sanidade em
 * todas as direções. O mapa, quando há, é desenhado na área do mapa (colunas × linhas), sem moldura, com
 * a grade por cima.
 */
function desenharCena(mundo: Container, cena: Cena, mapa: Texture | null,
  retratoDe: (tokenId: string) => Texture | undefined) {
  const pecas = new Map<string, Container>();
  for (const filho of mundo.removeChildren()) filho.destroy({ children: true });
  if (mapa) {
    const fundo = new Sprite(mapa);
    fundo.width = cena.colunas * CELULA;
    fundo.height = cena.linhas * CELULA;
    mundo.addChild(fundo);
  }
  const lado = (2 * LIMITE_DA_CENA + 1) * CELULA;
  const grade = new TilingSprite({ texture: casaDaGrade(), width: lado, height: lado });
  grade.position.set(-LIMITE_DA_CENA * CELULA, -LIMITE_DA_CENA * CELULA);
  grade.eventMode = "none";
  mundo.addChild(grade);

  for (const token of cena.tokens) {
    const lado = token.tamanho * CELULA;
    const peca = new Container();
    peca.position.set(token.x * CELULA, token.y * CELULA);
    // Oculto dos jogadores (item 12): o Narrador o vê translúcido.
    if (token.oculto) peca.alpha = 0.45;
    peca.eventMode = "static";
    peca.cursor = "pointer";
    peca.hitArea = new Rectangle(0, 0, lado, lado);
    // Token redondo (item 9): o retrato do personagem recortado em círculo, ou as iniciais; aro dourado para
    // quem o controla, prateado para os outros.
    const centro = lado / 2;
    const raio = lado / 2 - 3;
    const aro = token.controlavel ? 0xe6bd81 : 0xa9a0b7;
    const retrato = retratoDe(token.id);
    if (retrato) {
      const foto = new Sprite(retrato);
      foto.anchor.set(0.5);
      foto.scale.set((2 * raio) / Math.min(retrato.width, retrato.height));
      foto.position.set(centro, centro);
      const mascara = new Graphics().circle(centro, centro, raio).fill(0xffffff);
      foto.mask = mascara;
      peca.addChild(new Graphics().circle(centro, centro, raio).fill(0x15151f), foto, mascara);
    } else {
      const inicial = new Text({
        text: token.rotulo.slice(0, 2).toLocaleUpperCase("pt-BR"),
        style: { fontFamily: "sans-serif", fontSize: Math.round(16 * token.tamanho), fontWeight: "bold", fill: 0xffffff },
      });
      inicial.anchor.set(0.5);
      inicial.position.set(centro, centro);
      peca.addChild(new Graphics().circle(centro, centro, raio).fill(token.controlavel ? 0x816247 : 0x555265), inicial);
    }
    peca.addChild(new Graphics().circle(centro, centro, raio).stroke({ color: aro, width: 3 }));
    mundo.addChild(peca);
    pecas.set(token.id, peca);
  }
  const sinais = new Container();
  sinais.eventMode = "none";
  mundo.addChild(sinais);
  return { pecas, sinais };
}

function desenharSinais(marcadores: Container, cursores: Sinal[], pings: Sinal[], arrastes: ArrasteRemoto[]) {
  for (const filho of marcadores.removeChildren()) filho.destroy();
  for (const sinal of cursores) marcadores.addChild(
    new Graphics().circle((sinal.x + 0.5) * CELULA, (sinal.y + 0.5) * CELULA, 5)
      .fill(0x86d9e3).stroke({ color: 0x10272b, width: 2 }),
  );
  for (const sinal of pings) marcadores.addChild(
    new Graphics().circle((sinal.x + 0.5) * CELULA, (sinal.y + 0.5) * CELULA, 20)
      .stroke({ color: 0xffd073, width: 4 }),
  );
  for (const sinal of arrastes) marcadores.addChild(
    new Graphics().roundRect(sinal.x * CELULA + 3, sinal.y * CELULA + 3, CELULA - 6, CELULA - 6, 9)
      .fill({ color: 0xbd90ee, alpha: 0.3 }).stroke({ color: 0xbd90ee, width: 2 }),
  );
}

/** Canvas visual da cena. A lista de tokens no DOM oferece seleção por teclado e toque. */
export function RoomCanvas({ cena, onSelectToken, onCursor, onPing, onDragPreview, onDragEnd, onDragCancel,
  cursores = [], pings = [], arrastes = [], mapaUrl, reservaDireita = 0, retratos = {}, centroDaVistaRef, onSoltarPersonagem }: {
  cena: Cena;
  /** URL do retrato de cada token ligado a personagem (por id do token); sem ele, o token mostra as iniciais. */
  retratos?: Record<string, string>;
  /** Recebe uma função que devolve a casa do centro da parte livre da vista (para "Colocar" um personagem). */
  centroDaVistaRef?: MutableRefObject<(() => { x: number; y: number }) | null>;
  /** Um personagem arrastado da lista do Narrador foi solto nesta casa. */
  onSoltarPersonagem?: (personagemId: string, x: number, y: number) => void;
  /** Largura (px) coberta à direita pelo painel aberto; o enquadramento centraliza a cena no resto. */
  reservaDireita?: number;
  /** Imagem do mapa da cena (URL de dados), quando houver. */
  mapaUrl?: string;
  onSelectToken: (id: string) => void;
  onCursor?: (x: number, y: number) => void;
  onPing?: (x: number, y: number) => void;
  onDragPreview?: (tokenId: string, x: number, y: number) => void;
  onDragEnd?: (tokenId: string, x: number, y: number) => void;
  onDragCancel?: (tokenId: string) => void;
  cursores?: Sinal[];
  pings?: Sinal[];
  arrastes?: ArrasteRemoto[];
}) {
  const mount = useRef<HTMLDivElement>(null);
  const app = useRef<Application | null>(null);
  const mundo = useRef<Container | null>(null);
  const pecas = useRef(new Map<string, Container>());
  const sinais = useRef<Container | null>(null);
  const [pronto, setPronto] = useState(false);
  const [escala, setEscala] = useState(1);
  // Verdadeiro depois que a pessoa mexe no zoom ou arrasta o mapa: a partir daí, mudar o tamanho da
  // área não reenquadra mais, até ela pedir "Centralizar" ou abrir outra cena.
  const ajustadoPelaPessoa = useRef(false);
  // A cena mais recente, para o enquadramento ler sem refazer os efeitos a cada movimento de token.
  const cenaAtual = useRef(cena);
  // Arraste de token em curso: fica numa referência para sobreviver aos redesenhos da cena.
  const arrasteRef = useRef<{ id: string; x: number; y: number; originalX: number; originalY: number } | null>(null);
  const reserva = useRef(reservaDireita);
  // Textura do mapa guardada junto da URL de origem: trocar ou remover o mapa invalida a anterior.
  const [carregado, setCarregado] = useState<{ url: string; textura: Texture } | null>(null);
  const mapa = mapaUrl && carregado?.url === mapaUrl ? carregado.textura : null;
  // Texturas dos retratos, por URL; cada uma carrega uma vez e redesenha a cena quando chega.
  const [texturas, setTexturas] = useState<Record<string, Texture>>({});
  const carregando = useRef(new Set<string>());

  useEffect(() => {
    if (!mapaUrl) return undefined;
    let cancelado = false;
    const imagem = new Image();
    imagem.onload = () => { if (!cancelado) setCarregado({ url: mapaUrl, textura: Texture.from(imagem) }); };
    imagem.src = mapaUrl;
    return () => { cancelado = true; };
  }, [mapaUrl]);

  useEffect(() => {
    const elemento = mount.current;
    if (!elemento) return;
    let cancelado = false;
    const aplicacao = new Application();
    void aplicacao.init({ resizeTo: elemento, background: 0x15151f, antialias: true }).then(() => {
      if (cancelado) {
        aplicacao.destroy(true);
        return;
      }
      const container = new Container();
      aplicacao.stage.addChild(container);
      elemento.appendChild(aplicacao.canvas);
      app.current = aplicacao;
      mundo.current = container;
      setPronto(true);
    });
    return () => {
      cancelado = true;
      app.current = null;
      mundo.current = null;
      setPronto(false);
      if (aplicacao.renderer) aplicacao.destroy(true);
    };
  }, []);

  const enquadrarMapa = useCallback(() => {
    const elemento = mount.current;
    const viewport = mundo.current;
    if (!elemento || !viewport) return;
    const area = { largura: elemento.clientWidth, altura: elemento.clientHeight };
    const alvo = areaDeInteresse(cenaAtual.current, Boolean(cenaAtual.current.mapa_objeto), CELULA);
    // Sem mapa e sem tokens, a origem da grade fica no centro da parte livre, em 100%.
    const quadro = alvo
      ? enquadrar(area, alvo, MARGEM_ENQUADRAMENTO, reserva.current)
      : { escala: 1, x: Math.max(1, area.largura - reserva.current) / 2, y: area.altura / 2 };
    viewport.scale.set(quadro.escala);
    viewport.position.set(quadro.x, quadro.y);
    setEscala(quadro.escala);
    ajustadoPelaPessoa.current = false;
  }, []);

  useEffect(() => {
    cenaAtual.current = cena;
  }, [cena]);

  // Abrir a Sala ou outra cena enquadra o mapa e os tokens, centralizados.
  useEffect(() => {
    if (pronto) enquadrarMapa();
  }, [pronto, cena.id, cena.colunas, cena.linhas, enquadrarMapa]);

  // Abrir ou fechar o painel muda a parte livre da área: reenquadra, salvo se a pessoa já ajustou a vista.
  useEffect(() => {
    reserva.current = reservaDireita;
    if (pronto && !ajustadoPelaPessoa.current) enquadrarMapa();
  }, [pronto, reservaDireita, enquadrarMapa]);

  // O PixiJS só acompanha o redimensionamento da janela; recolher a barra lateral ou abrir o painel
  // muda a área sem mudar a janela, então a superfície é observada aqui.
  useEffect(() => {
    const elemento = mount.current;
    if (!pronto || !elemento || typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(() => {
      app.current?.resize();
      if (!ajustadoPelaPessoa.current) enquadrarMapa();
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [pronto, enquadrarMapa]);

  useEffect(() => {
    for (const url of new Set(Object.values(retratos))) {
      if (texturas[url] || carregando.current.has(url) || typeof Image === "undefined") continue;
      carregando.current.add(url);
      const imagem = new Image();
      imagem.onload = () => setTexturas((atuais) => ({ ...atuais, [url]: Texture.from(imagem) }));
      imagem.src = url;
    }
  }, [retratos, texturas]);

  // Os retratos chegam como objeto novo a cada redesenho da Sala; o canvas só redesenha quando o conteúdo muda.
  const chaveDosRetratos = Object.entries(retratos).map(([id, url]) => `${id}=${url.length}:${url.slice(-24)}`).sort().join("|");
  const retratosAtuais = useRef(retratos);
  useEffect(() => {
    retratosAtuais.current = retratos;
  });

  useEffect(() => {
    if (pronto && mundo.current) {
      const desenhada = desenharCena(mundo.current, cena, mapa, (tokenId) => {
        const url = retratosAtuais.current[tokenId];
        return url ? texturas[url] : undefined;
      });
      pecas.current = desenhada.pecas;
      sinais.current = desenhada.sinais;
      // Se a cena redesenhar no meio de um arraste, a peça arrastada continua sob o ponteiro.
      const emCurso = arrasteRef.current;
      if (emCurso) pecas.current.get(emCurso.id)?.position.set(emCurso.x * CELULA, emCurso.y * CELULA);
    }
  }, [pronto, cena, mapa, chaveDosRetratos, texturas]);

  // A casa do centro da parte livre da vista, para "Colocar" um personagem onde o Narrador está olhando.
  useEffect(() => {
    if (!centroDaVistaRef) return undefined;
    centroDaVistaRef.current = () => {
      const elemento = mount.current;
      const viewport = mundo.current;
      if (!elemento || !viewport) return { x: 0, y: 0 };
      const meioX = Math.max(1, elemento.clientWidth - reserva.current) / 2;
      const meioY = elemento.clientHeight / 2;
      return {
        x: Math.floor((meioX - viewport.x) / viewport.scale.x / CELULA),
        y: Math.floor((meioY - viewport.y) / viewport.scale.y / CELULA),
      };
    };
    return () => { centroDaVistaRef.current = null; };
  }, [centroDaVistaRef]);

  useEffect(() => {
    if (pronto && sinais.current) desenharSinais(sinais.current, cursores, pings, arrastes);
  }, [pronto, cena, cursores, pings, arrastes]);

  // As funções recebidas, sempre as mais recentes, sem recriar os ouvintes do ponteiro.
  const acoes = useRef({ onSelectToken, onCursor, onPing, onDragPreview, onDragEnd, onDragCancel });
  useEffect(() => {
    acoes.current = { onSelectToken, onCursor, onPing, onDragPreview, onDragEnd, onDragCancel };
  });

  // Ouvintes do ponteiro, criados uma vez: leem a cena e as funções por referência. Antes dependiam da cena
  // e das funções, e cada redesenho da Sala (selecionar, prévia do arraste) os recriava e perdia o arraste em
  // curso — o primeiro arraste só selecionava o token.
  useEffect(() => {
    const canvas = app.current?.canvas;
    const viewport = mundo.current;
    if (!canvas || !viewport || !pronto) return;
    let inicio: { x: number; y: number; origemX: number; origemY: number; tokenId?: string } | null = null;
    let ultimoCursor = 0;
    const celula = (clientX: number, clientY: number) => {
      const limites = canvas.getBoundingClientRect();
      return {
        x: Math.floor((clientX - limites.left - viewport.x) / viewport.scale.x / CELULA),
        y: Math.floor((clientY - limites.top - viewport.y) / viewport.scale.y / CELULA),
      };
    };
    const tokenEm = (x: number, y: number) => cenaAtual.current.tokens.find((item) =>
      x >= item.x && x < item.x + item.tamanho && y >= item.y && y < item.y + item.tamanho);
    const dentro = (x: number, y: number) => dentroDoLimite(x, y, 1);
    const descer = (evento: PointerEvent) => {
      const ponto = celula(evento.clientX, evento.clientY);
      const token = tokenEm(ponto.x, ponto.y);
      // Token que a pessoa controla: arrastar já move (clique sem arrastar só seleciona). Os outros: arrastar
      // move a vista, e um clique sem arrastar seleciona o token.
      if (token?.controlavel) arrasteRef.current = { id: token.id, x: token.x, y: token.y, originalX: token.x, originalY: token.y };
      else inicio = { x: evento.clientX, y: evento.clientY, origemX: viewport.x, origemY: viewport.y, tokenId: token?.id };
      canvas.setPointerCapture(evento.pointerId);
    };
    const mover = (evento: PointerEvent) => {
      const ponto = celula(evento.clientX, evento.clientY);
      if (dentro(ponto.x, ponto.y) && Date.now() - ultimoCursor > 80) {
        ultimoCursor = Date.now();
        acoes.current.onCursor?.(ponto.x, ponto.y);
      }
      const arraste = arrasteRef.current;
      if (arraste) {
        const token = cenaAtual.current.tokens.find((item) => item.id === arraste.id);
        if (token && dentroDoLimite(ponto.x, ponto.y, token.tamanho) && (ponto.x !== arraste.x || ponto.y !== arraste.y)) {
          arraste.x = ponto.x;
          arraste.y = ponto.y;
          pecas.current.get(arraste.id)?.position.set(ponto.x * CELULA, ponto.y * CELULA);
          acoes.current.onDragPreview?.(arraste.id, ponto.x, ponto.y);
        }
        return;
      }
      if (inicio) {
        ajustadoPelaPessoa.current = true;
        viewport.position.set(
          inicio.origemX + evento.clientX - inicio.x,
          inicio.origemY + evento.clientY - inicio.y,
        );
      }
    };
    const soltar = (evento: PointerEvent) => {
      const arraste = arrasteRef.current;
      if (arraste) {
        arrasteRef.current = null;
        const moveu = arraste.x !== arraste.originalX || arraste.y !== arraste.originalY;
        acoes.current.onDragCancel?.(arraste.id);
        if (moveu) {
          // Movimento direto (item 9): a peça fica no destino; a cena redesenha com a posição otimista.
          acoes.current.onDragEnd?.(arraste.id, arraste.x, arraste.y);
        } else {
          pecas.current.get(arraste.id)?.position.set(arraste.originalX * CELULA, arraste.originalY * CELULA);
          acoes.current.onSelectToken(arraste.id);
        }
      } else if (inicio?.tokenId && Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) < 5) {
        acoes.current.onSelectToken(inicio.tokenId);
      }
      inicio = null;
    };
    const cancelar = () => {
      const arraste = arrasteRef.current;
      if (arraste) {
        arrasteRef.current = null;
        acoes.current.onDragCancel?.(arraste.id);
        pecas.current.get(arraste.id)?.position.set(arraste.originalX * CELULA, arraste.originalY * CELULA);
      }
      inicio = null;
    };
    const tecla = (evento: KeyboardEvent) => { if (evento.key === "Escape") cancelar(); };
    const ping = (evento: MouseEvent) => {
      const ponto = celula(evento.clientX, evento.clientY);
      if (dentro(ponto.x, ponto.y)) acoes.current.onPing?.(ponto.x, ponto.y);
    };
    const roda = (evento: WheelEvent) => {
      evento.preventDefault();
      const limites = canvas.getBoundingClientRect();
      const foco = { x: evento.clientX - limites.left, y: evento.clientY - limites.top };
      const novo = proximoZoom(viewport.scale.x, evento.deltaY < 0 ? 1.1 : 1 / 1.1);
      viewport.position.copyFrom(pontoFixoNoZoom(viewport.position, viewport.scale.x, novo, foco));
      viewport.scale.set(novo);
      setEscala(novo);
      ajustadoPelaPessoa.current = true;
    };
    canvas.addEventListener("pointerdown", descer);
    canvas.addEventListener("pointermove", mover);
    canvas.addEventListener("pointerup", soltar);
    canvas.addEventListener("pointercancel", cancelar);
    canvas.addEventListener("dblclick", ping);
    window.addEventListener("keydown", tecla);
    canvas.addEventListener("wheel", roda, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", descer);
      canvas.removeEventListener("pointermove", mover);
      canvas.removeEventListener("pointerup", soltar);
      canvas.removeEventListener("pointercancel", cancelar);
      canvas.removeEventListener("dblclick", ping);
      window.removeEventListener("keydown", tecla);
      canvas.removeEventListener("wheel", roda);
    };
  }, [pronto]);

  function ampliar(fator: number) {
    const viewport = mundo.current;
    const canvas = app.current?.canvas;
    if (!viewport || !canvas) return;
    const novo = proximoZoom(viewport.scale.x, fator);
    viewport.position.copyFrom(pontoFixoNoZoom(
      viewport.position, viewport.scale.x, novo, { x: canvas.width / 2, y: canvas.height / 2 },
    ));
    viewport.scale.set(novo);
    setEscala(novo);
    ajustadoPelaPessoa.current = true;
  }

  return <div className="room-canvas">
    <div className="room-canvas__controls" aria-label="Controles do mapa">
      <button type="button" onClick={() => ampliar(1 / 1.2)} aria-label="Reduzir mapa">−</button>
      <span aria-live="polite">{Math.round(escala * 100)}%</span>
      <button type="button" onClick={() => ampliar(1.2)} aria-label="Ampliar mapa">+</button>
      <button type="button" onClick={enquadrarMapa}>Centralizar</button>
    </div>
    <div ref={mount} className="room-canvas__surface" role="img"
      onDragOver={onSoltarPersonagem ? (evento: DragEvent<HTMLDivElement>) => {
        if (!evento.dataTransfer.types.includes(ARRASTE_DE_PERSONAGEM)) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = "copy";
      } : undefined}
      onDrop={onSoltarPersonagem ? (evento: DragEvent<HTMLDivElement>) => {
        const id = evento.dataTransfer.getData(ARRASTE_DE_PERSONAGEM);
        const viewport = mundo.current;
        const elemento = mount.current;
        if (!id || !viewport || !elemento) return;
        evento.preventDefault();
        const limites = elemento.getBoundingClientRect();
        const x = Math.floor((evento.clientX - limites.left - viewport.x) / viewport.scale.x / CELULA);
        const y = Math.floor((evento.clientY - limites.top - viewport.y) / viewport.scale.y / CELULA);
        if (dentroDoLimite(x, y, 1)) onSoltarPersonagem(id, x, y);
      } : undefined}
      aria-label={`Mapa da cena ${cena.nome}, ${cena.colunas} colunas por ${cena.linhas} linhas, ${cena.tokens.length} tokens`} />
  </div>;
}
