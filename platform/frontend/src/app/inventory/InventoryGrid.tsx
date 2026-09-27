import { useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { Confirmation } from "../../ui/primitives";
import { TIPO_ARRASTE_ITEM, type ItemExterno } from "./arrasteExterno";
import { mochilaSubstituida } from "./mochila";
import { RegraLevantar } from "./RegraLevantar";
import {
  avaliar, calcularGrade, dimensoes, ehVermelha, limitesFisicos, lugarParaGirar, maosOcupadas, naGrade, ROTULO_SUBTIPO, validarEquipar,
  validarPosicao,
  type ItemGrade, type ParametrosGrade,
} from "./gridEngine";
import "./inventory.css";

export interface Destino {
  coluna: number;
  linha: number;
  girado: boolean;
}

interface Movimento extends Destino {
  id: string;
  via: "teclado" | "ponteiro";
  /** Célula do item que o ponteiro agarrou, para a prévia acompanhar o dedo. */
  pegaColuna: number;
  pegaLinha: number;
}

export interface InventoryGridProps {
  rotulo: string;
  parametros: ParametrosGrade;
  itens: ItemGrade[];
  onMover: (id: string, destino: Destino) => void;
  onEquipar?: (id: string, equipado: boolean) => void;
  onRetirar?: (id: string) => void;
  /** URL do ícone de grade de cada item, quando existir. */
  icones?: Record<string, string | undefined>;
  /** Sem permissão de edição: a grade só mostra. */
  somenteLeitura?: boolean;
  /** Tira o item do personagem e o deixa no chão da cena. */
  onLargar?: (id: string) => void;
  /** Abre a escolha de quem vai receber o item. */
  onOferecer?: (id: string) => void;
  /** Troca a empunhadura de uma arma versátil entre uma e duas mãos. */
  onEmpunhar?: (id: string, maos: 1 | 2) => void;
  /** Item do chão ou do baú escolhido para vir a esta grade: tocar numa célula o coloca ali. */
  externo?: ItemExterno | null;
  /** Recebe um item de fora, por toque numa célula ou por arraste solto sobre a grade. */
  onColocarExterno?: (destino: Destino) => void;
  /** Ações a mais para o item selecionado (ex.: enviar a arte e o ícone de grade). */
  acoesDoItem?: (id: string) => ReactNode;
}

const LIMIAR_ARRASTE = 6;

function descreverPosicao(coluna: number, linha: number) {
  return `coluna ${coluna + 1}, linha ${linha + 1}`;
}

export function InventoryGrid({
  rotulo, parametros, itens, onMover, onEquipar, onRetirar, icones = {}, somenteLeitura = false, onLargar, onOferecer, onEmpunhar, acoesDoItem,
  externo = null,
  onColocarExterno,
}: InventoryGridProps) {
  const grade = useMemo(() => calcularGrade(parametros, itens), [parametros, itens]);
  const limites = useMemo(() => limitesFisicos(grade, itens), [grade, itens]);
  const avaliacao = useMemo(() => avaliar(grade, itens), [grade, itens]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [anuncio, setAnuncio] = useState("");
  /** Motivo da última recusa de equipar, mostrado junto das ações do item. */
  const [recusa, setRecusa] = useState<{ id: string; mensagem: string } | null>(null);
  const [substituicao, setSubstituicao] = useState<{ nova: ItemGrade; antiga: ItemGrade } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const ponteiro = useRef<{ x: number; y: number; arrastando: boolean } | null>(null);

  const noGrid = itens.filter(naGrade);
  const mochilaEquipada = itens.find((i) => i.subtipo === "mochila" && i.equipado) ?? null;
  const bandeja = itens.filter((i) => !naGrade(i) && i !== mochilaEquipada);
  const selecionado = itens.find((i) => i.id === selecionadoId) ?? null;
  const emSobrecarga = new Set(avaliacao.itensEmSobrecarga);
  const celulasNoVermelho = noGrid.reduce((total, item) => {
    const { largura, altura } = dimensoes(item);
    let vermelhas = 0;
    for (let l = item.linha; l < item.linha + altura; l += 1) {
      for (let c = item.coluna; c < item.coluna + largura; c += 1) if (ehVermelha(grade, c, l)) vermelhas += 1;
    }
    return total + vermelhas;
  }, 0);

  const previa = movimento ? (() => {
    const item = itens.find((i) => i.id === movimento.id);
    if (!item) return null;
    const resultado = validarPosicao(grade, itens, item, movimento.coluna, movimento.linha, movimento.girado);
    return { ...dimensoes({ ...item, girado: movimento.girado }), ...movimento, valido: resultado.ok };
  })() : null;

  function motivoTexto(motivo: string | undefined) {
    return motivo === "sobreposicao" ? "há outro item nesse lugar" : "fica fora da grade";
  }

  function tentarSoltar(mov: Movimento) {
    if (somenteLeitura) return false;
    const item = itens.find((i) => i.id === mov.id);
    if (!item) return;
    const resultado = validarPosicao(grade, itens, item, mov.coluna, mov.linha, mov.girado);
    if (!resultado.ok) {
      setAnuncio(`Não dá para soltar ${item.nome} aí: ${motivoTexto(resultado.motivo)}.`);
      return false;
    }
    onMover(item.id, { coluna: mov.coluna, linha: mov.linha, girado: mov.girado });
    const vermelho = celulasDoDestino(mov, item).some(([c, l]) => ehVermelha(grade, c, l));
    setAnuncio(`${item.nome} solto em ${descreverPosicao(mov.coluna, mov.linha)}${vermelho ? ", na área vermelha: sobrecarga" : ""}.`);
    setMovimento(null);
    return true;
  }

  function celulasDoDestino(mov: Destino, item: ItemGrade): Array<[number, number]> {
    const { largura, altura } = dimensoes({ ...item, girado: mov.girado });
    const celulas: Array<[number, number]> = [];
    for (let l = mov.linha; l < mov.linha + altura; l += 1) for (let c = mov.coluna; c < mov.coluna + largura; c += 1) celulas.push([c, l]);
    return celulas;
  }

  function iniciarTeclado(item: ItemGrade) {
    if (somenteLeitura) {
      setSelecionadoId(item.id === selecionadoId ? null : item.id);
      return;
    }
    const origem = naGrade(item) ? { coluna: item.coluna, linha: item.linha } : { coluna: 0, linha: 0 };
    setSelecionadoId(item.id);
    setMovimento({ id: item.id, via: "teclado", ...origem, girado: item.girado, pegaColuna: 0, pegaLinha: 0 });
    setAnuncio(`Movendo ${item.nome}. Setas movem, R gira, Enter solta, Esc cancela.`);
  }

  function teclaNoItem(event: KeyboardEvent<HTMLButtonElement>, item: ItemGrade) {
    if (movimento && movimento.id === item.id && movimento.via === "teclado") {
      const passo: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = passo[event.key];
      if (delta) {
        event.preventDefault();
        const proximo = {
          ...movimento,
          coluna: Math.max(0, movimento.coluna + delta[0]),
          linha: Math.max(0, movimento.linha + delta[1]),
        };
        setMovimento(proximo);
        setAnuncio(descreverPosicao(proximo.coluna, proximo.linha));
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        setMovimento({ ...movimento, girado: !movimento.girado });
        setAnuncio(`${item.nome} girado.`);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        tentarSoltar(movimento);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setMovimento(null);
        setAnuncio(`Movimento de ${item.nome} cancelado.`);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      iniciarTeclado(item);
    }
  }

  function celulaSobPonteiro(x: number, y: number) {
    const area = areaRef.current;
    if (!area) return null;
    const caixa = area.getBoundingClientRect();
    const tamanho = caixa.width / limites.colunas;
    if (!tamanho) return null;
    return { coluna: Math.floor((x - caixa.left) / tamanho), linha: Math.floor((y - caixa.top) / tamanho) };
  }

  function ponteiroDesce(event: PointerEvent<HTMLButtonElement>, item: ItemGrade) {
    if (event.button !== 0 || !naGrade(item)) return;
    if (somenteLeitura) {
      setSelecionadoId(item.id === selecionadoId ? null : item.id);
      return;
    }
    ponteiro.current = { x: event.clientX, y: event.clientY, arrastando: false };
    const celula = celulaSobPonteiro(event.clientX, event.clientY);
    const pegaColuna = celula ? celula.coluna - item.coluna : 0;
    const pegaLinha = celula ? celula.linha - item.linha : 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setMovimento({ id: item.id, via: "ponteiro", coluna: item.coluna, linha: item.linha, girado: item.girado, pegaColuna, pegaLinha });
  }

  function ponteiroMove(event: PointerEvent<HTMLButtonElement>) {
    const estado = ponteiro.current;
    if (!estado || !movimento || movimento.via !== "ponteiro") return;
    if (!estado.arrastando && Math.hypot(event.clientX - estado.x, event.clientY - estado.y) < LIMIAR_ARRASTE) return;
    estado.arrastando = true;
    const celula = celulaSobPonteiro(event.clientX, event.clientY);
    if (!celula) return;
    const coluna = celula.coluna - movimento.pegaColuna;
    const linha = celula.linha - movimento.pegaLinha;
    if (coluna !== movimento.coluna || linha !== movimento.linha) setMovimento({ ...movimento, coluna, linha });
  }

  function ponteiroSobe(item: ItemGrade) {
    const estado = ponteiro.current;
    ponteiro.current = null;
    if (!movimento || movimento.via !== "ponteiro") return;
    if (estado?.arrastando) {
      if (!tentarSoltar(movimento)) setMovimento(null);
    } else {
      setMovimento(null);
      setSelecionadoId(item.id === selecionadoId ? null : item.id);
    }
  }

  function tocarCelula(coluna: number, linha: number) {
    if (externo && onColocarExterno) {
      onColocarExterno({ coluna, linha, girado: false });
      return;
    }
    if (!selecionado || movimento) return;
    const mov: Movimento = { id: selecionado.id, via: "ponteiro", coluna, linha, girado: selecionado.girado, pegaColuna: 0, pegaLinha: 0 };
    tentarSoltar(mov);
  }

  function girarSelecionado() {
    if (!selecionado || !naGrade(selecionado)) return;
    const lugar = lugarParaGirar(grade, itens, selecionado);
    if (!lugar) {
      setAnuncio(`Não há espaço na grade para girar ${selecionado.nome}.`);
      return;
    }
    const mov: Movimento = { id: selecionado.id, via: "teclado", ...lugar, pegaColuna: 0, pegaLinha: 0 };
    if (!tentarSoltar(mov)) return;
    const vermelho = celulasDoDestino(mov, selecionado).some(([c, l]) => ehVermelha(grade, c, l));
    const moveu = lugar.coluna !== selecionado.coluna || lugar.linha !== selecionado.linha;
    setAnuncio(`${selecionado.nome} girado${moveu ? ` e movido para ${descreverPosicao(lugar.coluna, lugar.linha)}` : ""}`
      + `${vermelho ? ", na área vermelha: sobrecarga" : ""}.`);
  }

  function alternarEquipado() {
    if (!selecionado || !onEquipar) return;
    if (selecionado.equipado) {
      onEquipar(selecionado.id, false);
      setAnuncio(`${selecionado.nome} desequipado.`);
      return;
    }
    const antiga = mochilaSubstituida(itens, selecionado.id);
    // Com outra mochila equipada, a nova é validada como se a antiga já tivesse saído.
    const base = antiga ? itens.map((i) => (i.id === antiga.id ? { ...i, equipado: false } : i)) : itens;
    const resultado = validarEquipar(base, selecionado, parametros.forca);
    if (!resultado.ok) {
      const mensagem = resultado.mensagem ?? "Não é possível equipar.";
      setAnuncio(mensagem);
      setRecusa({ id: selecionado.id, mensagem });
      return;
    }
    setRecusa(null);
    if (antiga) {
      setSubstituicao({ nova: selecionado, antiga });
      return;
    }
    onEquipar(selecionado.id, true);
    setAnuncio(`${selecionado.nome} equipado.`);
  }

  function alternarEmpunhadura() {
    if (!selecionado?.versatil || !onEmpunhar) return;
    const maos: 1 | 2 = selecionado.maos === 2 ? 1 : 2;
    if (selecionado.equipado && maos === 2) {
      const outras = maosOcupadas(itens.filter((i) => i.id !== selecionado.id));
      if (outras + 2 > 2) {
        const mensagem = `Para empunhar ${selecionado.nome} com as duas mãos, solte o que ocupa a outra mão.`;
        setAnuncio(mensagem);
        setRecusa({ id: selecionado.id, mensagem });
        return;
      }
    }
    setRecusa(null);
    onEmpunhar(selecionado.id, maos);
    setAnuncio(`${selecionado.nome} empunhada com ${maos === 2 ? "duas mãos" : "uma mão"}.`);
  }

  const estiloArea = { "--colunas": limites.colunas, "--linhas": limites.linhas } as CSSProperties;

  const aceitaArraste = (event: DragEvent) => Boolean(onColocarExterno) && event.dataTransfer.types.includes(TIPO_ARRASTE_ITEM);
  function soltarExterno(event: DragEvent<HTMLDivElement>) {
    if (!aceitaArraste(event) || !onColocarExterno) return;
    event.preventDefault();
    const celula = celulaSobPonteiro(event.clientX, event.clientY);
    if (!celula || celula.coluna < 0 || celula.linha < 0) return;
    onColocarExterno({ coluna: celula.coluna, linha: celula.linha, girado: false });
  }

  return (
    <section className="grade-inventario" aria-label={rotulo}>
      <header className="grade-inventario__resumo">
        <span>
          <strong>{avaliacao.celulasOcupadas}</strong> de {avaliacao.celulasVerdes} células
          {celulasNoVermelho > 0 && ` (${celulasNoVermelho} na área vermelha)`}
          {" · "}{grade.colunasVerdes} x {grade.linhasVerdes}
          {" · "}mãos {avaliacao.maosOcupadas}/2
        </span>
        {avaliacao.sobrecarga
          ? <span className="grade-inventario__estado grade-inventario__estado--sobrecarga">Sobrecarga</span>
          : <span className="grade-inventario__estado">Normal</span>}
        <RegraLevantar />
        {grade.ampliacoes.length > 0 && (
          <span className="grade-inventario__ampliacoes">
            Ampliações: {grade.ampliacoes.map((a) => [
              a.rotulo, a.linhas ? `+${a.linhas} linha${a.linhas > 1 ? "s" : ""}` : null, a.colunas ? `+${a.colunas} coluna${a.colunas > 1 ? "s" : ""}` : null,
            ].filter(Boolean).join(" ")).join(" · ")}
          </span>
        )}
        {mochilaEquipada && onEquipar && !somenteLeitura && (
          <button type="button" className="button button--ghost" onClick={() => { onEquipar(mochilaEquipada.id, false); setAnuncio(`${mochilaEquipada.nome} desequipada.`); }}>
            Desequipar {mochilaEquipada.nome}
          </button>
        )}
      </header>

      {externo && onColocarExterno && (
        <p className="grade-inventario__dica" role="status">
          Toque numa célula para colocar {externo.nome} ({externo.largura} x {externo.altura}) ali.
        </p>
      )}
      <div className="grade-inventario__area" ref={areaRef} style={estiloArea}
        onDragOver={(event) => { if (aceitaArraste(event)) event.preventDefault(); }}
        onDrop={soltarExterno}>
        <div className="grade-inventario__celulas" aria-hidden="true">
          {Array.from({ length: limites.linhas * limites.colunas }, (_, indice) => {
            const coluna = indice % limites.colunas;
            const linha = Math.floor(indice / limites.colunas);
            const vermelha = ehVermelha(grade, coluna, linha);
            return (
              <div
                key={indice}
                className={`grade-inventario__celula${vermelha ? " grade-inventario__celula--vermelha" : ""}`}
                onClick={() => tocarCelula(coluna, linha)}
              />
            );
          })}
        </div>

        {previa && (
          <div
            className={`grade-inventario__previa${previa.valido ? "" : " grade-inventario__previa--invalida"}`}
            style={{ "--c": previa.coluna, "--l": previa.linha, "--w": previa.largura, "--h": previa.altura } as CSSProperties}
            aria-hidden="true"
          />
        )}

        {noGrid.map((item) => {
          const { largura, altura } = dimensoes(item);
          const classes = ["grade-inventario__item"];
          if (item.equipado) classes.push("grade-inventario__item--equipado");
          if (emSobrecarga.has(item.id)) classes.push("grade-inventario__item--sobrecarga");
          if (item.id === selecionadoId) classes.push("grade-inventario__item--selecionado");
          if (movimento?.id === item.id) classes.push("grade-inventario__item--movendo");
          const icone = icones[item.id];
          const rotuloItem = [
            item.nome, `${ROTULO_SUBTIPO[item.subtipo]}`, `${largura} por ${altura}`, descreverPosicao(item.coluna, item.linha),
            item.equipado ? "equipado" : null, item.versatil ? (item.maos === 2 ? "com as duas mãos" : "com uma mão") : null,
            emSobrecarga.has(item.id) ? "em sobrecarga" : null,
          ].filter(Boolean).join(", ");
          return (
            <button
              key={item.id}
              type="button"
              className={classes.join(" ")}
              style={{ "--c": item.coluna, "--l": item.linha, "--w": largura, "--h": altura } as CSSProperties}
              aria-label={rotuloItem}
              aria-pressed={item.id === selecionadoId}
              onKeyDown={(event) => teclaNoItem(event, item)}
              onPointerDown={(event) => ponteiroDesce(event, item)}
              onPointerMove={ponteiroMove}
              onPointerUp={() => ponteiroSobe(item)}
              onPointerCancel={() => { ponteiro.current = null; setMovimento(null); }}
            >
              {icone
                ? <img
                    className={`grade-inventario__icone${item.girado ? " grade-inventario__icone--girado" : ""}`}
                    style={{ "--w0": item.largura, "--h0": item.altura } as CSSProperties}
                    src={icone} alt="" draggable={false}
                  />
                : <span className="grade-inventario__nome">{item.nome}</span>}
              {item.equipado && <span className="grade-inventario__marca" aria-hidden="true" title="Equipado">E</span>}
            </button>
          );
        })}
      </div>

      <p className="grade-inventario__anuncio" role="status" aria-live="polite">{anuncio}</p>

      {substituicao && (
        <Confirmation
          open
          title={`Substituir ${substituicao.antiga.nome}?`}
          description={`Só uma mochila fica equipada por vez. ${substituicao.nova.nome} será equipada, e ${substituicao.antiga.nome} passa a ser item carregado: vai para a grade se couber, senão fica fora da grade.`}
          confirmLabel="Substituir"
          onConfirm={() => {
            onEquipar?.(substituicao.nova.id, true);
            setAnuncio(`${substituicao.nova.nome} equipada no lugar de ${substituicao.antiga.nome}.`);
            setSubstituicao(null);
            setSelecionadoId(null);
          }}
          onCancel={() => setSubstituicao(null)}
        />
      )}

      {selecionado && (
        <div className="grade-inventario__acoes" role="group" aria-label={`Ações para ${selecionado.nome}`}>
          <strong>{selecionado.nome}</strong>
          <span className="grade-inventario__detalhe">
            {ROTULO_SUBTIPO[selecionado.subtipo]} · {dimensoes(selecionado).largura} x {dimensoes(selecionado).altura}
            {selecionado.equipado ? " · equipado" : ""}
          </span>
          {!somenteLeitura && naGrade(selecionado) && (
            <button type="button" className="button button--secondary" onClick={girarSelecionado}>Girar</button>
          )}
          {!somenteLeitura && (
            <button type="button" className="button button--secondary" onClick={() => iniciarTeclado(selecionado)}>Mover pelo teclado</button>
          )}
          {!somenteLeitura && onEquipar && (naGrade(selecionado) || selecionado.equipado || selecionado.subtipo === "mochila") && (
            <button type="button" className="button button--secondary" onClick={alternarEquipado}>
              {selecionado.equipado ? "Desequipar" : "Equipar"}
            </button>
          )}
          {!somenteLeitura && onRetirar && naGrade(selecionado) && (
            <button type="button" className="button button--ghost" onClick={() => { onRetirar(selecionado.id); setSelecionadoId(null); }}>
              Tirar da grade
            </button>
          )}
          {recusa?.id === selecionado.id && <p className="grade-inventario__recusa" role="alert">{recusa.mensagem}</p>}
          {!somenteLeitura && onEmpunhar && selecionado.versatil && (
            <button type="button" className="button button--secondary" onClick={alternarEmpunhadura}>
              {selecionado.maos === 2 ? "Empunhar com uma mão" : "Empunhar com duas mãos"}
            </button>
          )}
          {!somenteLeitura && onOferecer && selecionado.subtipo !== "moedas" && (
            <button type="button" className="button button--ghost" onClick={() => onOferecer(selecionado.id)}>Oferecer…</button>
          )}
          {!somenteLeitura && onLargar && (
            <button type="button" className="button button--ghost" onClick={() => { onLargar(selecionado.id); setSelecionadoId(null); }}>
              Largar no chão
            </button>
          )}
          {acoesDoItem?.(selecionado.id)}
          {!somenteLeitura && <p className="grade-inventario__dica">Toque numa célula para colocar o item ali.</p>}
        </div>
      )}

      {bandeja.length > 0 && (
        <section className="grade-inventario__bandeja" aria-label="Fora da grade">
          <h3>Fora da grade</h3>
          <p className="grade-inventario__dica">Estes itens não estão sendo levados: coloque-os na grade para levá-los ou equipá-los.</p>
          <ul>
            {bandeja.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="button button--ghost"
                  aria-pressed={item.id === selecionadoId}
                  onClick={() => setSelecionadoId(item.id === selecionadoId ? null : item.id)}
                  onKeyDown={(event) => teclaNoItem(event, item)}
                >
                  {item.nome} ({item.largura} x {item.altura})
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
