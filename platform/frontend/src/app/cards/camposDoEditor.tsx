import { useId, useState, type ReactNode } from "react";

import { IconeDoCampo } from "./iconesDosCampos";
import { MensagensDoCampo } from "./problemasDoEditor";
import { useProblemasDoCampo } from "./usoDosProblemas";

/*
 * Quadros do editor de cartas (simplificar-criacao-de-cartas, D1): o mesmo quadro de medalhão da página direita
 * do grimório, com o controle no lugar do valor. Cada quadro se registra na âncora dos problemas de validação.
 */

export interface PropsDoControle {
  /** Id do controle principal, ligado ao rótulo. */
  id: string;
  /** Mensagens do quadro (`aria-describedby`). */
  descricao?: string;
  invalido: boolean;
}

export function Quadro({ ancora, rotulo, icone, largo = false, soVoce = false, grupo = false, children, className = "" }: {
  ancora: string;
  rotulo: string;
  icone: string;
  largo?: boolean;
  /** Campo que os jogadores não veem. */
  soVoce?: boolean;
  /** O controle é um grupo (botões de opção, etiquetas): o rótulo vira o nome do grupo. */
  grupo?: boolean;
  children: (controle: PropsDoControle) => ReactNode;
  className?: string;
}) {
  const { id, descricao, mensagens, avisos } = useProblemasDoCampo(ancora, rotulo);
  const controle = `${id}-controle`;
  const rotuloId = `${id}-rotulo`;
  return (
    <div id={id} className={`editor-quadro${largo ? " editor-quadro--largo" : ""}${mensagens.length ? " editor-quadro--problema" : ""} ${className}`.trim()}
      role={grupo ? "group" : undefined} aria-labelledby={grupo ? rotuloId : undefined}>
      <span className="editor-quadro__icone" aria-hidden="true"><IconeDoCampo nome={icone} /></span>
      {grupo
        ? <span id={rotuloId} className="editor-quadro__rotulo">{rotulo}</span>
        : <label id={rotuloId} htmlFor={controle} className="editor-quadro__rotulo">{rotulo}</label>}
      {soVoce && <span className="editor-quadro__so-voce" title="Os jogadores não veem este campo.">só você vê</span>}
      <span className="editor-quadro__controle">{children({ id: controle, descricao, invalido: mensagens.length > 0 })}</span>
      <MensagensDoCampo id={descricao} mensagens={mensagens} avisos={avisos} />
    </div>
  );
}

export function CampoInteiro({ controle, valor, onMudar, min = 0, max, unidade, sugestao }: {
  controle: PropsDoControle; valor: unknown; onMudar: (valor: number | null) => void; min?: number; max?: number; unidade?: string | null;
  /** Valor que vale quando o campo fica vazio (ex.: o Custo de Uso calculado pelo Framework). */
  sugestao?: number | null;
}) {
  return (
    <span className="editor-numero">
      <input id={controle.id} type="number" inputMode="numeric" min={min} max={max} step={1} aria-describedby={controle.descricao}
        aria-invalid={controle.invalido || undefined} value={typeof valor === "number" ? String(valor) : ""}
        placeholder={typeof sugestao === "number" ? String(sugestao) : "—"} onChange={(e) => {
          const limpo = e.target.value.trim();
          const numero = Number(limpo);
          onMudar(limpo === "" || !Number.isInteger(numero) ? null : numero);
        }} />
      {unidade && <span className="editor-numero__unidade">{unidade}</span>}
    </span>
  );
}

/** Valor calculado pelo sistema, sem edição (Grau e Descansos Mínimos, adaptar-cartas-ao-framework). */
export function CampoCalculado({ controle, valor }: { controle: PropsDoControle; valor: string | null }) {
  return <output id={controle.id} className="editor-calculado" aria-describedby={controle.descricao}>{valor ?? "—"}</output>;
}

/** Texto em várias linhas, para os efeitos do Framework. */
export function CampoTextoLongo({ controle, valor, onMudar, exemplo }: {
  controle: PropsDoControle; valor: unknown; onMudar: (valor: string | null) => void; exemplo?: string;
}) {
  return (
    <textarea id={controle.id} className="editor-descricao editor-descricao--efeito" value={typeof valor === "string" ? valor : ""}
      placeholder={exemplo ? `Ex.: ${exemplo}` : "—"} aria-describedby={controle.descricao} aria-invalid={controle.invalido || undefined}
      onChange={(e) => onMudar(e.target.value || null)} />
  );
}

export function CampoTexto({ controle, valor, onMudar, exemplo }: {
  controle: PropsDoControle; valor: unknown; onMudar: (valor: string | null) => void; exemplo?: string | null;
}) {
  return (
    <input id={controle.id} className="editor-texto" value={typeof valor === "string" ? valor : ""} placeholder={exemplo ? `Ex.: ${exemplo}` : "—"}
      aria-describedby={controle.descricao} aria-invalid={controle.invalido || undefined}
      onChange={(e) => onMudar(e.target.value || null)} />
  );
}

export function CampoEscolha({ controle, valor, onMudar, opcoes }: {
  controle: PropsDoControle; valor: unknown; onMudar: (valor: string | null) => void; opcoes: readonly string[] | readonly { id: string; rotulo: string }[];
}) {
  const normalizadas = opcoes.map((o) => (typeof o === "string" ? { id: o, rotulo: o } : o));
  return (
    <select id={controle.id} className="editor-escolha" value={typeof valor === "string" ? valor : ""}
      aria-describedby={controle.descricao} aria-invalid={controle.invalido || undefined}
      onChange={(e) => onMudar(e.target.value || null)}>
      <option value="">—</option>
      {normalizadas.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
    </select>
  );
}

/** Vários valores de uma lista: botões que ligam e desligam (ex.: Força e Destreza no ataque). */
export function CampoEscolhas({ controle, valor, onMudar, opcoes }: {
  controle: PropsDoControle; valor: unknown; onMudar: (valor: string[]) => void; opcoes: readonly string[];
}) {
  const escolhidos = Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
  return (
    <span className="editor-escolhas" aria-describedby={controle.descricao}>
      {opcoes.map((opcao) => {
        const ligado = escolhidos.includes(opcao);
        return (
          <button key={opcao} type="button" aria-pressed={ligado} className="editor-escolhas__opcao"
            onClick={() => onMudar(ligado ? escolhidos.filter((v) => v !== opcao) : opcoes.filter((o) => o === opcao || escolhidos.includes(o)))}>
            {opcao}
          </button>
        );
      })}
    </span>
  );
}

/** Lista livre de textos, como etiquetas, com sugestões opcionais. Enter ou vírgula acrescentam. */
export function CampoEtiquetas({ controle, valor, onMudar, sugestoes = [], rotulo }: {
  controle: PropsDoControle; valor: unknown; onMudar: (valor: string[]) => void; sugestoes?: readonly string[]; rotulo: string;
}) {
  const atuais = Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
  const [texto, setTexto] = useState("");
  const lista = useId();
  function acrescentar(bruto: string) {
    const novos = bruto.split(",").map((t) => t.trim()).filter((t) => t && !atuais.includes(t));
    if (novos.length) onMudar([...atuais, ...novos]);
    setTexto("");
  }
  const restantes = sugestoes.filter((s) => !atuais.includes(s));
  return (
    <span className="editor-etiquetas">
      {atuais.map((etiqueta) => (
        <span key={etiqueta} className="editor-etiquetas__etiqueta">
          {etiqueta}
          <button type="button" aria-label={`Remover ${etiqueta} de ${rotulo}`} onClick={() => onMudar(atuais.filter((t) => t !== etiqueta))}>×</button>
        </span>
      ))}
      <input id={controle.id} className="editor-etiquetas__entrada" value={texto} list={restantes.length ? lista : undefined}
        aria-label={`Acrescentar a ${rotulo}`} aria-describedby={controle.descricao} placeholder="Acrescentar…"
        onChange={(e) => {
          const valorNovo = e.target.value;
          // Escolher uma sugestão da lista acrescenta na hora.
          if (restantes.includes(valorNovo)) acrescentar(valorNovo);
          else if (valorNovo.includes(",")) acrescentar(valorNovo);
          else setTexto(valorNovo);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); acrescentar(texto); }
          if (e.key === "Backspace" && !texto && atuais.length) onMudar(atuais.slice(0, -1));
        }}
        onBlur={() => { if (texto.trim()) acrescentar(texto); }} />
      {restantes.length > 0 && <datalist id={lista}>{restantes.map((s) => <option key={s} value={s} />)}</datalist>}
    </span>
  );
}
