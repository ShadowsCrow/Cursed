import { useState } from "react";

import type { ItemInventarioResumo } from "../characters/types";
import "./inventory.css";

const TIPOS_MOEDA = ["cobre", "prata", "ouro", "platina"] as const;
export type TipoMoeda = (typeof TIPOS_MOEDA)[number];
export type Pilha = Record<TipoMoeda, number>;

const ROTULO: Record<TipoMoeda, string> = { cobre: "Cobre", prata: "Prata", ouro: "Ouro", platina: "Platina" };

const vazia = (): Pilha => ({ cobre: 0, prata: 0, ouro: 0, platina: 0 });
const soma = (pilha: Pilha) => TIPOS_MOEDA.reduce((total, tipo) => total + pilha[tipo], 0);

function conteudo(item: ItemInventarioResumo): Pilha {
  const dados = item.dados ?? {};
  const pilha = vazia();
  for (const tipo of TIPOS_MOEDA) {
    const valor = dados[tipo];
    pilha[tipo] = typeof valor === "number" && valor > 0 ? Math.floor(valor) : 0;
  }
  return pilha;
}

/** Mesma ordem do servidor: pela grade (linha, coluna), as de fora da grade por último. */
function ordenar(pilhas: ItemInventarioResumo[]): ItemInventarioResumo[] {
  return [...pilhas].sort((a, b) => {
    const foraA = a.linha == null ? 1 : 0;
    const foraB = b.linha == null ? 1 : 0;
    return foraA - foraB || (a.linha ?? 0) - (b.linha ?? 0) || (a.coluna ?? 0) - (b.coluna ?? 0) || a.id.localeCompare(b.id);
  });
}

function descrever(pilha: Pilha): string {
  const partes = TIPOS_MOEDA.filter((t) => pilha[t] > 0).map((t) => `${pilha[t]} de ${ROTULO[t].toLowerCase()}`);
  return partes.length ? partes.join(", ") : "vazia";
}

function lugar(item: ItemInventarioResumo): string {
  return item.coluna == null || item.linha == null ? "fora da grade" : `coluna ${item.coluna + 1}, linha ${item.linha + 1}`;
}

const inteiro = (texto: string, maximo: number) => {
  const numero = Math.trunc(Number(texto));
  return Number.isFinite(numero) ? Math.min(maximo, Math.max(0, numero)) : 0;
};

function CamposPilha({ valor, maximos, onChange, prefixo }: {
  valor: Pilha; maximos?: Pilha; onChange: (p: Pilha) => void; prefixo: string;
}) {
  return (
    <div className="moedas__campos">
      {TIPOS_MOEDA.map((tipo) => (
        <label key={tipo} htmlFor={`${prefixo}-${tipo}`}>{ROTULO[tipo]}
          <input id={`${prefixo}-${tipo}`} type="number" min={0} max={maximos?.[tipo] ?? 1_000_000} value={valor[tipo]}
            onChange={(e) => onChange({ ...valor, [tipo]: inteiro(e.target.value, maximos?.[tipo] ?? 1_000_000) })} />
        </label>
      ))}
    </div>
  );
}

export interface CoinPurseProps {
  pilhas: ItemInventarioResumo[];
  /** Limite da mesa; ausente enquanto a política não carregou. */
  porPilha?: number;
  editavel: boolean;
  /** Um envio está em andamento ou a arrumação ainda não foi guardada. */
  ocupado: boolean;
  onGuardarBolsa: (bolsa: Pilha) => void;
  onGuardarPilhas: (pilhas: Pilha[]) => void;
  /** Adiciona ou retira moedas; o servidor escolhe as pilhas. Devolve se deu certo, para zerar o editor. */
  onAjustar: (operacao: "adicionar" | "retirar", moedas: Pilha) => Promise<boolean>;
}

/** Moedas do personagem (carga-por-espacos 5.3): total por tipo, alterar totais, dividir e juntar pilhas. */
export function CoinPurse({ pilhas, porPilha, editavel, ocupado, onGuardarBolsa, onGuardarPilhas, onAjustar }: CoinPurseProps) {
  const ordenadas = ordenar(pilhas);
  const conteudos = ordenadas.map(conteudo);
  const total = conteudos.reduce<Pilha>((acc, p) => {
    for (const tipo of TIPOS_MOEDA) acc[tipo] += p[tipo];
    return acc;
  }, vazia());
  const [ajuste, setAjuste] = useState<Pilha>(vazia);
  const [dividindo, setDividindo] = useState<{ indice: number; parte: Pilha } | null>(null);
  const minimoPilhas = porPilha ? Math.ceil(soma(total) / porPilha) : ordenadas.length;
  const podeJuntar = editavel && ordenadas.length > minimoPilhas;

  function confirmarDivisao() {
    if (!dividindo) return;
    const origem = conteudos[dividindo.indice];
    if (!origem) return;
    const restante = { ...origem };
    for (const tipo of TIPOS_MOEDA) restante[tipo] -= dividindo.parte[tipo];
    const novas = conteudos.map((p, i) => (i === dividindo.indice ? restante : p));
    onGuardarPilhas([...novas, dividindo.parte]);
    setDividindo(null);
  }

  const faltando = TIPOS_MOEDA.filter((t) => ajuste[t] > total[t]);
  async function ajustar(operacao: "adicionar" | "retirar") {
    if (await onAjustar(operacao, ajuste)) setAjuste(vazia());
  }

  const parteValida = (() => {
    if (!dividindo) return false;
    const origem = conteudos[dividindo.indice];
    if (!origem) return false;
    const movidas = soma(dividindo.parte);
    return movidas > 0 && movidas < soma(origem);
  })();

  return (
    <section className="panel moedas" aria-label="Moedas">
      <div className="section-heading"><div><span className="eyebrow">BOLSA</span><h2>Moedas</h2></div></div>
      <dl className="moedas__totais">
        {TIPOS_MOEDA.map((tipo) => (
          <div key={tipo}><dt>{ROTULO[tipo]}</dt><dd>{total[tipo]}</dd></div>
        ))}
      </dl>
      <p className="preview-note">
        {soma(total)} moeda(s) em {ordenadas.length} pilha(s)
        {porPilha ? `. Cada pilha ocupa uma célula e guarda até ${porPilha} moedas de qualquer tipo.` : "."}
        {" "}Não há câmbio entre tipos.
      </p>

      {ordenadas.length > 0 && (
        <ol className="moedas__pilhas">
          {ordenadas.map((item, indice) => {
            const pilha = conteudos[indice] ?? vazia();
            return (
              <li key={item.id}>
                <span>Pilha {indice + 1}: {descrever(pilha)} <small>({lugar(item)})</small></span>
                {editavel && soma(pilha) > 1 && (
                  <button type="button" className="button button--ghost" disabled={ocupado}
                    onClick={() => setDividindo({ indice, parte: vazia() })}>
                    Dividir pilha {indice + 1}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {dividindo && conteudos[dividindo.indice] && (
        <fieldset className="moedas__form">
          <legend>Separar da pilha {dividindo.indice + 1} para uma nova pilha</legend>
          <CamposPilha prefixo="dividir" valor={dividindo.parte} maximos={conteudos[dividindo.indice]}
            onChange={(parte) => setDividindo({ ...dividindo, parte })} />
          <p className="preview-note">A nova pilha procura espaço na grade; sem espaço, vai para a área vermelha.</p>
          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={() => setDividindo(null)}>Cancelar</button>
            <button type="button" className="button" disabled={!parteValida || ocupado} onClick={confirmarDivisao}>Separar</button>
          </div>
        </fieldset>
      )}

      {podeJuntar && (
        <div className="moedas__acoes">
          <button type="button" className="button button--secondary" disabled={ocupado} onClick={() => onGuardarBolsa(total)}>
            Juntar pilhas
          </button>
        </div>
      )}

      {editavel && (
        <fieldset className="moedas__form">
          <legend>Adicionar ou retirar moedas</legend>
          <CamposPilha prefixo="ajuste" valor={ajuste} onChange={setAjuste} />
          <p className="preview-note">
            Ao adicionar, as moedas enchem as pilhas que têm espaço e o resto vira pilha nova. Ao retirar, elas saem das
            últimas pilhas; a pilha que zera some.
          </p>
          {faltando.length > 0 && (
            <p className="preview-note" role="status">
              Não dá para retirar: {faltando.map((t) => `há só ${total[t]} de ${ROTULO[t].toLowerCase()}`).join(", ")}.
            </p>
          )}
          <div className="dialog__actions">
            <button type="button" className="button" disabled={ocupado || soma(ajuste) === 0}
              onClick={() => void ajustar("adicionar")}>Adicionar</button>
            <button type="button" className="button button--secondary" disabled={ocupado || soma(ajuste) === 0 || faltando.length > 0}
              onClick={() => void ajustar("retirar")}>Retirar</button>
          </div>
        </fieldset>
      )}
      {ocupado && editavel && <p className="preview-note" role="status">Aguarde a grade ser guardada para mexer nas moedas.</p>}
    </section>
  );
}
