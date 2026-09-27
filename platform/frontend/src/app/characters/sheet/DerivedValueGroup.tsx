import { Glyph } from "../../../ui/Display";
import { Popover } from "../../../ui/primitives";
import type { ValorDerivadoResumo } from "../types";

const tipoFonteLabel: Record<string, string> = {
  base: "Valor base",
  ajuste: "Ajuste manual",
  atributo: "Atributo",
  pericia: "Perícia",
  equipamento: "Equipamento",
  efeito: "Efeito",
  classe: "Classe",
  nivel: "Nível",
  ajuste_narrador: "Ajuste do Narrador",
};

function comSinal(valor: number): string {
  return valor >= 0 ? `+${valor}` : `${valor}`;
}

/** Total com as fontes sob demanda (popover acessível); situacionais aparecem à parte. */
export function FontesDoValor({ valor }: { valor: ValorDerivadoResumo }) {
  const situacionais = valor.situacionais ?? [];
  if (valor.total === null) {
    // Faltou uma entrada (classe fora do catálogo, nível ausente…): nada é estimado.
    return (
      <Popover label={`${valor.rotulo}: não calculável`} triggerContent={<b>—</b>} triggerClassName="derived-value__trigger">
        <p>Não calculável. {valor.motivo}</p>
      </Popover>
    );
  }
  const total = valor.grupo === "recurso" ? String(valor.total) : comSinal(valor.total);
  return (
    <Popover label={`Fontes de ${valor.rotulo}`} triggerContent={<b>{total}</b>} triggerClassName="derived-value__trigger">
      <dl>
        <dt>Total</dt>
        <dd>{valor.total}</dd>
        {valor.fontes.map((fonte, index) => (
          <div key={`${fonte.tipo}-${index}`}>
            <dt>{tipoFonteLabel[fonte.tipo] ?? fonte.tipo}{fonte.descricao ? ` — ${fonte.descricao}` : ""}</dt>
            <dd>{comSinal(fonte.valor)}</dd>
          </div>
        ))}
      </dl>
      {situacionais.length > 0 && (
        <>
          <p className="eyebrow">Situacionais — não entram no total</p>
          <dl>
            {situacionais.map((situacional, index) => (
              <div key={`${situacional.efeito_id}-${index}`}>
                <dt>{situacional.descricao} · {situacional.contexto}</dt>
                <dd>{comSinal(situacional.valor)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Popover>
  );
}

/**
 * Um valor derivado com seu total e, sob demanda (popover acessível), a lista
 * completa de fontes com sinal e os modificadores situacionais separados —
 * deixando explícito que os situacionais não entram no total (design 7.1).
 */
export function DerivedValueRow({ valor }: { valor: ValorDerivadoResumo }) {
  const situacionais = valor.situacionais ?? [];
  return (
    <div>
      <span>
        <strong>{valor.rotulo}</strong>
        <small>{valor.fontes.length} {valor.fontes.length === 1 ? "fonte" : "fontes"}{situacionais.length > 0 ? ` · ${situacionais.length} situacional${situacionais.length > 1 ? "is" : ""}` : ""}</small>
      </span>
      <FontesDoValor valor={valor} />
    </div>
  );
}

export function DerivedValueGroup({
  eyebrow,
  title,
  valores,
  grupo,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  valores: ValorDerivadoResumo[];
  grupo: ValorDerivadoResumo["grupo"];
  emptyMessage: string;
}) {
  const filtrados = valores.filter((valor) => valor.grupo === grupo);
  return (
    <section className="panel">
      <div className="section-heading">
        <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      </div>
      {filtrados.length === 0 ? (
        <p className="preview-note"><Glyph name="eye" size={16} /> {emptyMessage}</p>
      ) : (
        <div className="attribute-list">
          {filtrados.map((valor) => <DerivedValueRow key={valor.chave} valor={valor} />)}
        </div>
      )}
    </section>
  );
}
