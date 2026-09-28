import { useState } from "react";

import type { ApiClient } from "../types";
import type { ConsequenciaResumo, TrilhaDesgaste } from "./sheetApi";
import { DialogoAlteracaoDesgaste, DialogoEncerrarColapso, DialogoEsforco } from "./WearControls";
import { ROTULO_TRILHA, type Trilha } from "./wearForms";

export interface ControlesDesgaste {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  versao: number;
  consequencias: ConsequenciaResumo[];
  /** O Narrador altera as trilhas e encerra o Colapso Mental. */
  narrador: boolean;
  /** Quem controla o personagem usa o Esforço voluntário. */
  esforco: boolean;
}

type Aberto =
  | { kind: "alterar"; trilha: Trilha; sentido: 1 | -1 }
  | { kind: "esforco" }
  | { kind: "encerrar" };

/** Botões de alteração por trilha (Narrador), Esforço e fim do Colapso Mental, junto dos chips de desgaste. */
export function useControlesDesgaste(controles: ControlesDesgaste | undefined, trilhas: TrilhaDesgaste[] | undefined) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const fechar = () => setAberto(null);
  const base = controles ? { ...controles, onClose: fechar } : null;
  const emColapsoMental = (trilhas ?? []).some((t) => t.recurso === "estresse" && t.atual >= t.maximo);

  const botoesTrilha = (trilha: Trilha) => controles?.narrador ? (
    <span className="wear-steppers">
      <button type="button" className="wear-stepper" aria-label={`Reduzir ${ROTULO_TRILHA[trilha]}`}
        onClick={() => setAberto({ kind: "alterar", trilha, sentido: -1 })}>−</button>
      <button type="button" className="wear-stepper" aria-label={`Aumentar ${ROTULO_TRILHA[trilha]}`}
        onClick={() => setAberto({ kind: "alterar", trilha, sentido: 1 })}>+</button>
    </span>
  ) : null;

  const acoes = controles ? (
    <span className="wear-actions">
      {controles.esforco && (
        <button type="button" className="button button--secondary" onClick={() => setAberto({ kind: "esforco" })}>Esforço</button>
      )}
      {controles.narrador && emColapsoMental && (
        <button type="button" className="button button--secondary" onClick={() => setAberto({ kind: "encerrar" })}>Encerrar Colapso Mental</button>
      )}
    </span>
  ) : null;

  const dialogo = base && aberto ? (
    aberto.kind === "alterar"
      ? <DialogoAlteracaoDesgaste {...base} trilhaInicial={aberto.trilha} sentidoInicial={aberto.sentido} />
      : aberto.kind === "esforco"
        ? <DialogoEsforco {...base} />
        : <DialogoEncerrarColapso {...base} />
  ) : null;

  return { botoesTrilha, acoes, dialogo };
}
