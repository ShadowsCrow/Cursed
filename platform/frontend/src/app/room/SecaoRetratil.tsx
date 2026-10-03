import { useId, type ReactNode } from "react";

import { Glyph } from "../../ui/Display";
import { usePreferenciaLocal } from "../shells/usePreferenciaLocal";

/**
 * Seção da aba Cena que abre e fecha pelo título (experiencia-da-mesa, item 14). O título é um botão com
 * `aria-expanded`; a quantidade aparece ao lado, só visual. Aberta ou fechada fica lembrado neste navegador.
 */
export function SecaoRetratil({ id, titulo, contagem, papel, interna = false, children }: {
  id: string; titulo: string; contagem?: number; papel?: "group";
  /** Seção dentro de outra (ex.: as listas dentro de "Tokens"): título de nível 3, menor e recuado. */
  interna?: boolean; children: ReactNode;
}) {
  const [aberta, setAberta] = usePreferenciaLocal(`cursed:mesa:secao:${id}`, true);
  const idTitulo = useId();
  const idCorpo = useId();
  const Titulo = interna ? "h3" : "h2";
  const classes = ["secao-retratil", aberta && "secao-retratil--aberta", interna && "secao-retratil--interna"].filter(Boolean).join(" ");
  return (
    <section className={classes} role={papel} aria-labelledby={idTitulo}>
      <Titulo className="secao-retratil__titulo">
        <button type="button" id={idTitulo} aria-expanded={aberta} aria-controls={idCorpo} onClick={() => setAberta(!aberta)}>
          <Glyph name="chevron" size={15} className="secao-retratil__seta" />
          <span>{titulo}</span>
          {contagem !== undefined && <span className="secao-retratil__contagem" aria-hidden="true">{contagem}</span>}
        </button>
      </Titulo>
      <div id={idCorpo} className="secao-retratil__corpo" hidden={!aberta}>{aberta && children}</div>
    </section>
  );
}
