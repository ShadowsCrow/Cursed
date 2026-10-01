import type { ReactNode } from "react";

import { ContextoDeProblemas, type ContextoDosProblemas } from "./usoDosProblemas";

/** Envolve o formulário do editor: os quadros leem dele os próprios problemas (simplificar-criacao-de-cartas, D5). */
export function ProvedorDeProblemas({ valor, children }: { valor: ContextoDosProblemas; children: ReactNode }) {
  return <ContextoDeProblemas.Provider value={valor}>{children}</ContextoDeProblemas.Provider>;
}

/** Mensagens de um quadro, ligadas a ele por `aria-describedby`. */
export function MensagensDoCampo({ id, mensagens, avisos }: { id?: string; mensagens: string[]; avisos: string[] }) {
  if (!mensagens.length && !avisos.length) return null;
  return (
    <span id={id} className="editor-campo__mensagens">
      {mensagens.map((m) => <span key={m} className="editor-campo__problema">{m}</span>)}
      {avisos.map((a) => <span key={a} className="editor-campo__aviso">⚠ {a}</span>)}
    </span>
  );
}
