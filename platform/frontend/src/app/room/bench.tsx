import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { RoomCanvas } from "./RoomCanvas";
import type { components } from "../../api/generated/schema";
import "./room.css";

const cena = {
  id: "benchmark", nome: "Cena representativa", colunas: 50, linhas: 40,
  ativa: true, versao: 1, mapa_objeto: null, camadas: [],
  tokens: Array.from({ length: 300 }, (_, indice) => ({
    id: `token-${indice}`, camada_id: "mesa", personagem_id: null,
    rotulo: `P${indice}`, x: indice % 50, y: Math.floor(indice / 50),
    tamanho: 1, versao: 0, controlavel: indice % 2 === 0,
  })),
} satisfies components["schemas"]["CenaSala"];

document.body.style.margin = "0";
document.getElementById("root")!.style.width = "100vw";
const sinais = { arrastes: 0, cancelamentos: 0, conclusoes: 0 };
(globalThis as typeof globalThis & { __benchRoom: typeof sinais }).__benchRoom = sinais;
createRoot(document.getElementById("root")!).render(createElement(RoomCanvas, {
  cena, onSelectToken: () => {},
  onDragPreview: () => { sinais.arrastes += 1; },
  onDragCancel: () => { sinais.cancelamentos += 1; },
  onDragEnd: () => { sinais.conclusoes += 1; },
}));
