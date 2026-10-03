import { useState } from "react";

import { usePreferenciaLocal } from "../shells/usePreferenciaLocal";

const MINIMO = 1;
const MAXIMO = 200;
const limitar = (valor: number) => Math.min(MAXIMO, Math.max(1, Math.round(valor)));

/** Uma barra que mostra o valor enquanto arrasta e aplica ao soltar (pelo ponteiro, pelo teclado ou ao sair dela). */
function Barra({ id, rotulo, valor, maximo, textoDoValor, pendente, onMudar, onSoltar }: {
  id: string; rotulo: string; valor: number; maximo: number; textoDoValor: string; pendente: boolean;
  onMudar: (valor: number) => void; onSoltar: () => void;
}) {
  return (
    <div className="tamanho-mapa__linha">
      <div className="tamanho-mapa__cabecalho">
        <label className="tamanho-mapa__rotulo" htmlFor={id}>{rotulo}</label>
        <span className="tamanho-mapa__valor" aria-hidden="true">{textoDoValor}</span>
      </div>
      <input id={id} className="tamanho-mapa__barra" type="range" min={MINIMO} max={maximo} step={1} value={valor}
        disabled={pendente} aria-valuetext={textoDoValor}
        onChange={(e) => onMudar(Number(e.target.value))} onPointerUp={onSoltar} onKeyUp={onSoltar} onBlur={onSoltar} />
    </div>
  );
}

/**
 * Quantas casas o mapa da cena ocupa no grid (experiencia-da-mesa, item 12). Com "Manter proporção", uma barra só,
 * que muda colunas e linhas juntas; sem ela, uma barra para cada. Arrastar mostra o tamanho e soltar aplica
 * (pedidos do usuário).
 */
export function TamanhoDoMapa({ colunas, linhas, pendente, onAplicar }: {
  colunas: number; linhas: number; pendente: boolean; onAplicar: (colunas: number, linhas: number) => void;
}) {
  const razao = colunas / linhas;
  // Lembrada: aplicar recria o controle, e a escolha não deve voltar sozinha para "manter".
  const [proporcional, setProporcional] = usePreferenciaLocal("cursed:mesa:mapa-proporcional", true);
  const [novasColunas, setNovasColunas] = useState(colunas);
  const [novasLinhas, setNovasLinhas] = useState(linhas);
  const linhasDaProporcao = limitar(novasColunas / razao);
  const linhasFinais = proporcional ? linhasDaProporcao : novasLinhas;
  function aplicar() {
    if (novasColunas !== colunas || linhasFinais !== linhas) onAplicar(novasColunas, linhasFinais);
  }
  return (
    <div className="tamanho-mapa" role="group" aria-label="Tamanho do mapa">
      <span className="tamanho-mapa__titulo" aria-hidden="true">Tamanho do mapa</span>
      {proporcional
        ? <Barra id="tamanho-mapa-proporcional" rotulo="Tamanho" valor={novasColunas}
          maximo={Math.max(MINIMO, Math.min(MAXIMO, Math.floor(MAXIMO * razao)))}
          textoDoValor={`${novasColunas} × ${linhasDaProporcao} casas`} pendente={pendente}
          onMudar={setNovasColunas} onSoltar={aplicar} />
        : <>
          <Barra id="tamanho-mapa-colunas" rotulo="Colunas" valor={novasColunas} maximo={MAXIMO}
            textoDoValor={`${novasColunas} colunas`} pendente={pendente} onMudar={setNovasColunas} onSoltar={aplicar} />
          <Barra id="tamanho-mapa-linhas" rotulo="Linhas" valor={novasLinhas} maximo={MAXIMO}
            textoDoValor={`${novasLinhas} linhas`} pendente={pendente} onMudar={setNovasLinhas} onSoltar={aplicar} />
        </>}
      <label className="tamanho-mapa__proporcao">
        <input type="checkbox" checked={proporcional} onChange={(e) => {
          // Ao soltar a proporção, as linhas partem do valor proporcional atual.
          if (!e.target.checked) setNovasLinhas(linhasDaProporcao);
          setProporcional(e.target.checked);
        }} /> Manter proporção
      </label>
    </div>
  );
}
