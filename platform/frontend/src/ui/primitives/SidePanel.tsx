import type { ReactNode, RefObject } from "react";

import { Dialog } from "./Dialog";

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "start" | "end";
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Painel lateral acessível (drawer): mesma base do diálogo modal — foco preso,
 * Esc fecha, foco retorna ao gatilho — mas deslizando a partir de uma borda da tela.
 */
export function SidePanel({ side = "end", ...rest }: SidePanelProps) {
  return <Dialog {...rest} variant="panel" panelSide={side} />;
}
