import { forwardRef, type Ref } from "react";

import { ImagemAjustada } from "../../../assets/ImagemAjustada";
import { useAssetImage } from "../../../assets/useAssetImage";
import { custosDaCarta } from "../../../cards/cardFormat";
import { calculadosDoConteudo, type CalculadosCarta } from "../../../cards/criacao";
import { ROTULO_TIPO, type TipoCarta } from "../../../cards/types";
import type { ApiClient } from "../../types";
import { useCatalogoFramework, type CatalogoItens } from "../catalogoApi";
import {
  categoriaDaCarta, imagemPropria, rotuloDaCarta, rotuloDaCategoria, rotuloDaOrigem, tituloDaCarta, type Carta,
} from "./apresentacao";
import "./cartas.css";
import { MedalhaoDaCarta, VolutaDaCarta } from "./emblemas";
import { arteDaFaixa, arteDoMedalhao, usePintura } from "./pinturasDasCartas";
import { useInclinacao } from "./useInclinacao";

/*
 * Carta da aba Cartas (redesenhar-aba-cartas, D7), medida na referência a 1448 px: 262 × 307 px, faixa
 * de 78 px, tipo em versalete, título, texto em três linhas, quadro de custos e a pílula da origem.
 */

type Conteudo = Record<string, unknown>;

/** Reserva da faixa: degradê da cor do tipo com o medalhão em SVG e o ícone da categoria. */
function ReservaDaFaixa({ icone }: { icone: string | null }) {
  return (
    <span className="carta-ficha__reserva">
      {icone && <MedalhaoDaCarta icone={icone} />}
    </span>
  );
}

/**
 * Faixa da categoria. O medalhão vem da arte quadrada da categoria (a mesma do grimório, pedido do usuário):
 * recortado em círculo, ele cobre o medalhão pintado na faixa ou, sem a faixa, o medalhão em SVG da reserva.
 */
function PinturaDaCategoria({ categoria, icone, semMedalhao = false }: { categoria: string; icone: string; semMedalhao?: boolean }) {
  const url = arteDaFaixa(categoria);
  const estado = usePintura(url);
  const medalhao = usePintura(arteDoMedalhao(categoria)) === "pronta" && !semMedalhao;
  return (
    <>
      {estado === "pronta"
        ? <img className="carta-ficha__pintura" src={url} alt="" decoding="async" />
        : <ReservaDaFaixa icone={medalhao || semMedalhao ? null : icone} />}
      {medalhao && <img className="carta-ficha__medalhao" src={arteDoMedalhao(categoria)} alt="" decoding="async" />}
    </>
  );
}

/** Faixa inteira: imagem própria → pintura da categoria → degradê com o medalhão (decisão do usuário). */
function FaixaDaCarta({ conteudo, categoria, icone, api, mesaId }: {
  conteudo: Conteudo; categoria: string; icone: string; api?: ApiClient; mesaId?: string;
}) {
  const propria = imagemPropria(conteudo);
  const imagem = useAssetImage(api as ApiClient, mesaId ?? "", propria ?? "", { enabled: Boolean(api && mesaId && propria) });
  return (
    <span className="carta-ficha__faixa" aria-hidden="true">
      {imagem.data
        ? (
          // A foto inteira, ajustada à faixa, sobre a pintura da categoria escurecida: uma espada alta não vira uma fatia.
          <>
            <PinturaDaCategoria categoria={categoria} icone={icone} semMedalhao />
            <span className="carta-ficha__veu" />
            <ImagemAjustada className="carta-ficha__pintura carta-ficha__pintura--propria" src={imagem.data} alt="" />
          </>
        )
        : <PinturaDaCategoria categoria={categoria} icone={icone} />}
    </span>
  );
}

export interface CartaVisualProps {
  tipo: TipoCarta;
  conteudo: Conteudo;
  /** Valores do Framework vindos do servidor; sem eles, a carta os calcula pelo catálogo (biblioteca, editor). */
  calculados?: CalculadosCarta | null;
  titulo: string;
  /** Categoria do filtro de tipo (define a pintura da faixa e o ícone do medalhão). */
  categoria: string;
  catalogo: CatalogoItens | undefined;
  narrador: boolean;
  /** Texto da pílula do pé da carta. */
  rodape: string;
  /** Aviso no canto (ex.: "v3 disponível"). */
  selo?: string;
  api?: ApiClient;
  mesaId?: string;
  /** Sem `onAbrir`, a carta é só figura; com ele, é o botão que abre o detalhe. */
  onAbrir?: () => void;
  rotulo?: string;
}

/** A carta da aba Cartas como figura reutilizável: a ficha, o detalhe e a biblioteca da mesa desenham a mesma carta. */
export const CartaVisual = forwardRef(function CartaVisual(
  { tipo, conteudo, calculados, titulo, categoria, catalogo, narrador, rodape, selo, api, mesaId, onAbrir, rotulo }: CartaVisualProps,
  ref: Ref<HTMLButtonElement>,
) {
  const { icone } = rotuloDaCategoria(categoria, catalogo);
  const framework = useCatalogoFramework(api, mesaId).data;
  const custos = custosDaCarta(tipo, conteudo, { narrador, calculados: calculados ?? calculadosDoConteudo(framework, tipo, conteudo) })
    .slice(0, narrador ? 4 : 2);
  const texto = typeof conteudo.texto === "string" ? conteudo.texto : "";
  const inclinacao = useInclinacao();

  const miolo = (
    <>
      <FaixaDaCarta conteudo={conteudo} categoria={categoria} icone={icone} api={api} mesaId={mesaId} />
      <span className="carta-ficha__volutas" aria-hidden="true">
        <VolutaDaCarta posicao="se" /><VolutaDaCarta posicao="sd" /><VolutaDaCarta posicao="fe" /><VolutaDaCarta posicao="fd" />
      </span>
      {selo && <span className="carta-ficha__selo">{selo}</span>}
      <span className="carta-ficha__corpo">
        <span className="carta-ficha__tipo">{ROTULO_TIPO[tipo]}</span>
        <span className="carta-ficha__titulo">{titulo}</span>
        <span className="carta-ficha__texto">{texto}</span>
        {custos.length > 0 && (
          <span className={`carta-ficha__custos carta-ficha__custos--${custos.length}`}>
            {custos.map((custo) => (
              <span key={custo.label} className="carta-ficha__custo">
                <span className="carta-ficha__custo-rotulo">{custo.label}</span>
                <span className="carta-ficha__custo-valor">{custo.value}</span>
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="carta-ficha__origem">{rodape}</span>
    </>
  );

  const classes = `carta-ficha carta-ficha--${tipo}`;
  if (!onAbrir) return <div className={`${classes} carta-ficha--figura`} {...inclinacao}>{miolo}</div>;
  return (
    <button ref={ref} type="button" className={classes} aria-label={rotulo} aria-haspopup="dialog" onClick={onAbrir} {...inclinacao}>
      {miolo}
    </button>
  );
});

export interface CartaDaFichaProps {
  carta: Carta;
  catalogo: CatalogoItens | undefined;
  narrador: boolean;
  api?: ApiClient;
  mesaId?: string;
  /** Sem `onAbrir`, a carta é só figura (no detalhe); com ele, é o botão que abre o detalhe. */
  onAbrir?: () => void;
}

export const CartaDaFicha = forwardRef(function CartaDaFicha(
  { carta, catalogo, narrador, api, mesaId, onAbrir }: CartaDaFichaProps, ref: Ref<HTMLButtonElement>,
) {
  const desatualizada = narrador && carta.versao_mais_recente != null && carta.versao_mais_recente > carta.carta.numero;
  return (
    <CartaVisual
      ref={ref} tipo={carta.tipo} conteudo={carta.carta.conteudo as Conteudo} calculados={carta.carta.calculados} titulo={tituloDaCarta(carta)}
      categoria={categoriaDaCarta(carta, catalogo)} catalogo={catalogo} narrador={narrador} rodape={rotuloDaOrigem(carta)}
      selo={desatualizada ? `v${carta.versao_mais_recente} disponível` : undefined}
      api={api} mesaId={mesaId} onAbrir={onAbrir} rotulo={rotuloDaCarta(carta)}
    />
  );
});
