import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Rectangle, Text } from "pixi.js";
import type { components } from "../../api/generated/schema";
import { pontoFixoNoZoom, proximoZoom } from "./viewport";

type Cena = components["schemas"]["CenaSala"];
type Sinal = { x: number; y: number };
type ArrasteRemoto = Sinal & { tokenId: string };
const CELULA = 48;

function desenharCena(mundo: Container, cena: Cena, selecionar: (id: string) => void) {
  const pecas = new Map<string, Container>();
  for (const filho of mundo.removeChildren()) filho.destroy({ children: true });
  const largura = cena.colunas * CELULA;
  const altura = cena.linhas * CELULA;
  mundo.addChild(new Graphics().rect(0, 0, largura, altura).fill(0x20202d));
  const grade = new Graphics();
  for (let coluna = 0; coluna <= cena.colunas; coluna += 1) {
    grade.moveTo(coluna * CELULA, 0).lineTo(coluna * CELULA, altura);
  }
  for (let linha = 0; linha <= cena.linhas; linha += 1) {
    grade.moveTo(0, linha * CELULA).lineTo(largura, linha * CELULA);
  }
  grade.stroke({ color: 0x716a80, width: 1, alpha: 0.55 });
  mundo.addChild(grade);

  for (const token of cena.tokens) {
    const lado = token.tamanho * CELULA;
    const peca = new Container();
    peca.position.set(token.x * CELULA, token.y * CELULA);
    peca.eventMode = "static";
    peca.cursor = "pointer";
    peca.hitArea = new Rectangle(0, 0, lado, lado);
    peca.on("pointertap", () => selecionar(token.id));
    const fundo = new Graphics().roundRect(3, 3, lado - 6, lado - 6, 9)
      .fill(token.controlavel ? 0x816247 : 0x555265)
      .stroke({ color: token.controlavel ? 0xe6bd81 : 0xa9a0b7, width: 2 });
    const inicial = new Text({
      text: token.rotulo.slice(0, 2).toLocaleUpperCase("pt-BR"),
      style: { fontFamily: "sans-serif", fontSize: 16, fontWeight: "bold", fill: 0xffffff },
    });
    inicial.anchor.set(0.5);
    inicial.position.set(lado / 2, lado / 2);
    peca.addChild(fundo, inicial);
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
  cursores = [], pings = [], arrastes = [] }: {
  cena: Cena;
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

  useEffect(() => {
    if (pronto && mundo.current) {
      const desenhada = desenharCena(mundo.current, cena, onSelectToken);
      pecas.current = desenhada.pecas;
      sinais.current = desenhada.sinais;
    }
  }, [pronto, cena, onSelectToken]);

  useEffect(() => {
    if (pronto && sinais.current) desenharSinais(sinais.current, cursores, pings, arrastes);
  }, [pronto, cena, cursores, pings, arrastes]);

  useEffect(() => {
    const canvas = app.current?.canvas;
    const viewport = mundo.current;
    if (!canvas || !viewport || !pronto) return;
    let inicio: { x: number; y: number; origemX: number; origemY: number } | null = null;
    let arraste: { id: string; x: number; y: number; originalX: number; originalY: number } | null = null;
    let ultimoCursor = 0;
    const celula = (clientX: number, clientY: number) => {
      const limites = canvas.getBoundingClientRect();
      return {
        x: Math.floor((clientX - limites.left - viewport.x) / viewport.scale.x / CELULA),
        y: Math.floor((clientY - limites.top - viewport.y) / viewport.scale.y / CELULA),
      };
    };
    const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < cena.colunas && y < cena.linhas;
    const descer = (evento: PointerEvent) => {
      const ponto = celula(evento.clientX, evento.clientY);
      const token = cena.tokens.find((item) => item.controlavel &&
        ponto.x >= item.x && ponto.x < item.x + item.tamanho &&
        ponto.y >= item.y && ponto.y < item.y + item.tamanho);
      if (token) arraste = { id: token.id, x: token.x, y: token.y, originalX: token.x, originalY: token.y };
      else inicio = { x: evento.clientX, y: evento.clientY, origemX: viewport.x, origemY: viewport.y };
      canvas.setPointerCapture(evento.pointerId);
    };
    const mover = (evento: PointerEvent) => {
      const ponto = celula(evento.clientX, evento.clientY);
      if (dentro(ponto.x, ponto.y) && Date.now() - ultimoCursor > 80) {
        ultimoCursor = Date.now();
        onCursor?.(ponto.x, ponto.y);
      }
      if (arraste) {
        const token = cena.tokens.find((item) => item.id === arraste?.id);
        if (token && ponto.x >= 0 && ponto.y >= 0 &&
            ponto.x + token.tamanho <= cena.colunas && ponto.y + token.tamanho <= cena.linhas) {
          arraste.x = ponto.x;
          arraste.y = ponto.y;
          pecas.current.get(arraste.id)?.position.set(ponto.x * CELULA, ponto.y * CELULA);
          onDragPreview?.(arraste.id, ponto.x, ponto.y);
        }
        return;
      }
      if (inicio) viewport.position.set(
        inicio.origemX + evento.clientX - inicio.x,
        inicio.origemY + evento.clientY - inicio.y,
      );
    };
    const soltar = () => {
      if (arraste) {
        onDragEnd?.(arraste.id, arraste.x, arraste.y);
        onDragCancel?.(arraste.id);
        pecas.current.get(arraste.id)?.position.set(arraste.originalX * CELULA, arraste.originalY * CELULA);
        arraste = null;
      }
      inicio = null;
    };
    const cancelar = () => {
      if (arraste) {
        onDragCancel?.(arraste.id);
        pecas.current.get(arraste.id)?.position.set(arraste.originalX * CELULA, arraste.originalY * CELULA);
        arraste = null;
      }
      inicio = null;
    };
    const tecla = (evento: KeyboardEvent) => { if (evento.key === "Escape") cancelar(); };
    const ping = (evento: MouseEvent) => {
      const ponto = celula(evento.clientX, evento.clientY);
      if (dentro(ponto.x, ponto.y)) onPing?.(ponto.x, ponto.y);
    };
    const roda = (evento: WheelEvent) => {
      evento.preventDefault();
      const limites = canvas.getBoundingClientRect();
      const foco = { x: evento.clientX - limites.left, y: evento.clientY - limites.top };
      const novo = proximoZoom(viewport.scale.x, evento.deltaY < 0 ? 1.1 : 1 / 1.1);
      viewport.position.copyFrom(pontoFixoNoZoom(viewport.position, viewport.scale.x, novo, foco));
      viewport.scale.set(novo);
      setEscala(novo);
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
  }, [pronto, cena, onCursor, onPing, onDragPreview, onDragEnd, onDragCancel]);

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
  }

  return <div className="room-canvas">
    <div className="room-canvas__controls" aria-label="Controles do mapa">
      <button type="button" onClick={() => ampliar(1 / 1.2)} aria-label="Reduzir mapa">−</button>
      <span aria-live="polite">{Math.round(escala * 100)}%</span>
      <button type="button" onClick={() => ampliar(1.2)} aria-label="Ampliar mapa">+</button>
      <button type="button" onClick={() => {
        mundo.current?.position.set(0, 0);
        mundo.current?.scale.set(1);
        setEscala(1);
      }}>Centralizar</button>
    </div>
    <div ref={mount} className="room-canvas__surface" role="img"
      aria-label={`Mapa da cena ${cena.nome}, ${cena.colunas} colunas por ${cena.linhas} linhas, ${cena.tokens.length} tokens`} />
  </div>;
}
