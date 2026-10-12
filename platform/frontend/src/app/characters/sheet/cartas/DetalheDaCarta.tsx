import type { CSSProperties, ReactNode } from "react";

import { Dialog } from "../../../../ui/primitives";
import { ImagemAjustada } from "../../../assets/ImagemAjustada";
import { useAssetImage } from "../../../assets/useAssetImage";
import { ACOES_JOGADOR, ACOES_NARRADOR } from "../../../cards/acoesDeCartas";
import { ROTULO_TIPO, type AcaoCarta, type TipoCarta } from "../../../cards/types";
import type { ApiClient } from "../../types";
import { useCatalogoFramework, type CatalogoItens } from "../catalogoApi";
import { CantoDaFolha } from "../resumo/ornamentos";
import { categoriaDaCarta, imagemPropria, rotuloDaCategoria, tituloDaCarta, type Carta } from "./apresentacao";
import { dadosDaCarta, emColunas, type Dado } from "./dadosDoGrimorio";
import { EstrelaDoGrimorio, FechoDoLivro, IconeDoDado } from "./grimorio";
import { MedalhaoDaCarta } from "./emblemas";
import { ARTE_DO_GRIMORIO, arteDaCategoria, usePintura } from "./pinturasDasCartas";

type Conteudo = Record<string, unknown>;

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

export interface DetalheDaCartaProps {
  carta: Carta;
  catalogo: CatalogoItens | undefined;
  narrador: boolean;
  podeEditar: boolean;
  api: ApiClient;
  mesaId: string;
  pendente: boolean;
  erro: string | null;
  onAcao: (acao: AcaoCarta) => void;
  onMigrar: () => void;
  onRemover: () => void;
  onFechar: () => void;
}

/** Valor longo (como a origem da classe) diminui um pouco para caber no quadro, como no conceito. */
function escalaDoValor(valor: ReactNode): CSSProperties | undefined {
  if (typeof valor !== "string" || valor.length <= 22) return undefined;
  return { "--valor-escala": valor.length > 36 ? .86 : .93 } as CSSProperties;
}

/**
 * Arte da página esquerda: imagem própria → arte quadrada da categoria (o painel do conceito, com medalhão e
 * filigrana pintados) → medalhão em SVG. Com a arte pintada, a moldura e as estrelas em SVG saem: são dela.
 */
export function ArteDoGrimorio({ tipo, conteudo, categoria, catalogo, api, mesaId }: {
  tipo: TipoCarta; conteudo: Conteudo; categoria: string; catalogo: CatalogoItens | undefined; api: ApiClient; mesaId: string;
}) {
  const propria = imagemPropria(conteudo);
  const imagem = useAssetImage(api, mesaId, propria ?? "", { enabled: Boolean(propria) });
  const pintura = usePintura(arteDaCategoria(categoria));
  const { icone } = rotuloDaCategoria(categoria, catalogo);
  let arte: ReactNode;
  if (imagem.data) {
    // A imagem própria inteira, ajustada ao quadro, sobre a arte da categoria desfocada (como na faixa da carta).
    arte = (
      <>
        {pintura === "pronta"
          ? <img className="grimorio-arte__imagem grimorio-arte__imagem--fundo" src={arteDaCategoria(categoria)} alt="" />
          : <span className={`grimorio-arte__reserva grimorio-arte__reserva--${tipo}`} />}
        <ImagemAjustada className="grimorio-arte__imagem grimorio-arte__imagem--propria" src={imagem.data} alt="" />
      </>
    );
  }
  else if (pintura === "pronta") arte = <img className="grimorio-arte__imagem" src={arteDaCategoria(categoria)} alt="" />;
  else {
    arte = (
      <span className={`grimorio-arte__reserva grimorio-arte__reserva--${tipo}`}>
        <span className="grimorio-arte__estrelas"><EstrelaDoGrimorio /><EstrelaDoGrimorio /><EstrelaDoGrimorio /><EstrelaDoGrimorio /></span>
        <MedalhaoDaCarta icone={icone} />
      </span>
    );
  }
  return (
    <div className={`grimorio-arte${!imagem.data && pintura === "pronta" ? " grimorio-arte--pintada" : ""}`} aria-hidden="true">
      <span className="grimorio-arte__quadro">{arte}</span>
      <span className="grimorio-cantos"><CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" /></span>
      <span className="grimorio-arte__estrela grimorio-arte__estrela--alto"><EstrelaDoGrimorio /></span>
      <span className="grimorio-arte__estrela grimorio-arte__estrela--pe"><EstrelaDoGrimorio /></span>
      <span className="grimorio-arte__estrela grimorio-arte__estrela--esq"><EstrelaDoGrimorio /></span>
      <span className="grimorio-arte__estrela grimorio-arte__estrela--dir"><EstrelaDoGrimorio /></span>
    </div>
  );
}

/**
 * Detalhe da carta (redesenhar-aba-cartas, D8 revisto): um grimório aberto, cópia fiel do conceito aprovado
 * pelo usuário (`referencia/detalhe-grimorio.png`). Na página da esquerda, a arte, o tipo e o título; na da
 * direita, o texto inteiro num quadro de citação, os dados em quadros de duas colunas e as ações de hoje,
 * com as mesmas permissões do painel antigo.
 */
export function DetalheDaCarta({
  carta, catalogo, narrador, podeEditar, api, mesaId, pendente, erro, onAcao, onMigrar, onRemover, onFechar,
}: DetalheDaCartaProps) {
  const framework = useCatalogoFramework(api, mesaId).data;
  const acoes = [
    ...(narrador || podeEditar ? ACOES_JOGADOR[carta.estado] ?? [] : []),
    ...(narrador ? ACOES_NARRADOR[carta.estado] ?? [] : []),
  ];
  const migravel = narrador && carta.versao_mais_recente != null && carta.versao_mais_recente > carta.carta.numero;
  return (
    <Grimorio
      tipo={carta.tipo} conteudo={carta.carta.conteudo as Conteudo} titulo={tituloDaCarta(carta)}
      categoria={categoriaDaCarta(carta, catalogo)} catalogo={catalogo} dados={dadosDaCarta(carta, narrador, framework)}
      api={api} mesaId={mesaId} onFechar={onFechar}
    >
      {(erro || acoes.length > 0 || migravel || narrador) && (
        <div className="grimorio-acoes">
          {erro && <p role="alert" className="detalhe-carta__erro">{erro}</p>}
          {acoes.map(({ acao, rotulo }) => (
            <button key={acao} type="button" className="grimorio-acao grimorio-acao--principal" disabled={pendente} onClick={() => onAcao(acao)}>{rotulo}</button>
          ))}
          {migravel && (
            <button type="button" className="grimorio-acao" onClick={onMigrar}>Migrar para a versão {carta.versao_mais_recente}</button>
          )}
          {narrador && <button type="button" className="grimorio-acao grimorio-acao--discreta" onClick={onRemover}>Remover</button>}
        </div>
      )}
    </Grimorio>
  );
}

export interface GrimorioProps {
  tipo: TipoCarta;
  conteudo: Conteudo;
  titulo: string;
  /** Categoria do filtro de tipo: escolhe a arte quadrada da página esquerda. */
  categoria: string;
  catalogo: CatalogoItens | undefined;
  /** Quadros da página direita, na ordem em que aparecem. */
  dados: Dado[];
  api: ApiClient;
  mesaId: string;
  onFechar: () => void;
  /** Friso de ações no pé do diálogo, abaixo do livro. */
  children?: ReactNode;
}

/** Os quatro cantos de filigrana de uma moldura do grimório. */
export function CantosDoGrimorio() {
  return <><CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" /></>;
}

export interface MolduraDoGrimorioProps {
  titulo: string;
  onFechar: () => void;
  /** Pintura do livro aberto; sem ela, o livro é desenhado em CSS. */
  pintura?: string;
  /** Classes a mais do diálogo (ex.: o editor, que tem outra geometria). */
  className?: string;
  children: ReactNode;
}

/**
 * O diálogo do grimório, sem as páginas: a cena pintada (ou o livro em CSS) e a moldura de fora. O detalhe da
 * carta e o editor de cartas (simplificar-criacao-de-cartas, D1) o compõem com as próprias páginas.
 */
export function MolduraDoGrimorio({ titulo, onFechar, pintura = ARTE_DO_GRIMORIO, className = "", children }: MolduraDoGrimorioProps) {
  const pintado = usePintura(pintura) === "pronta";
  return (
    <Dialog open title={titulo} onClose={onFechar} className={`grimorio${pintado ? " grimorio--pintado" : ""} ${className}`.trim()} closeLabel="Fechar">
      {/* Com a pintura, o livro aberto e a cena de velas são a própria imagem; sem ela, o livro é desenhado em CSS. */}
      <span className="grimorio-fundo" aria-hidden="true">
        {pintado && <img className="grimorio-fundo__pintura" src={pintura} alt="" />}
      </span>
      <span className="grimorio-livro" aria-hidden="true">
        <span className="grimorio-folha grimorio-folha--esquerda" />
        <span className="grimorio-folha grimorio-folha--direita" />
        <span className="grimorio-livro__lombada"><i /><i /><i /><i /></span>
        <span className="grimorio-livro__fechos">
          <FechoDoLivro lado="esquerda" /><FechoDoLivro lado="esquerda" /><FechoDoLivro lado="direita" /><FechoDoLivro lado="direita" />
        </span>
      </span>
      <span className="grimorio-moldura" aria-hidden="true">
        <CantosDoGrimorio />
        <span className="grimorio-moldura__estrela grimorio-moldura__estrela--alto"><EstrelaDoGrimorio /></span>
        <span className="grimorio-moldura__estrela grimorio-moldura__estrela--pe"><EstrelaDoGrimorio /></span>
      </span>
      {children}
    </Dialog>
  );
}

/** O grimório aberto, sem as ações: a ficha (carta do personagem) e a biblioteca da mesa (carta do catálogo) o usam. */
export function Grimorio({ tipo, conteudo, titulo, categoria, catalogo, dados, api, mesaId, onFechar, children }: GrimorioProps) {
  // O conceito tem três linhas de quadros; com mais dados (magias, visão do Narrador), eles se compactam.
  const quadros = emColunas(dados);
  const linhas = quadros.reduce((n, q) => n + (q.coluna === "direita" ? 0 : 1), 0);
  const cantos = <CantosDoGrimorio />;

  return (
    <MolduraDoGrimorio titulo={titulo} onFechar={onFechar} className="detalhe-carta">
      <div className="grimorio-pagina grimorio-pagina--esquerda">
        <ArteDoGrimorio tipo={tipo} conteudo={conteudo} categoria={categoria} catalogo={catalogo} api={api} mesaId={mesaId} />
        <div className="grimorio-titulo">
          <span className="grimorio-cantos" aria-hidden="true">{cantos}</span>
          <span className="grimorio-titulo__estrela grimorio-titulo__estrela--alto" aria-hidden="true"><EstrelaDoGrimorio /></span>
          <p className="grimorio-titulo__tipo">{ROTULO_TIPO[tipo]}</p>
          {/* O título do diálogo, para leitores de tela, é o mesmo: aqui ele é só a composição da página. */}
          <p className="grimorio-titulo__nome" aria-hidden="true"
            style={{ "--titulo-escala": Math.max(.55, Math.min(1, 11 / titulo.length)) } as CSSProperties}>{titulo}</p>
          <span className="grimorio-titulo__estrela grimorio-titulo__estrela--pe" aria-hidden="true"><EstrelaDoGrimorio /></span>
        </div>
      </div>

      <div className="grimorio-pagina grimorio-pagina--direita">
        <div className="grimorio-citacao">
          <span className="grimorio-cantos" aria-hidden="true">{cantos}</span>
          <span className="grimorio-citacao__estrela grimorio-citacao__estrela--alto" aria-hidden="true"><EstrelaDoGrimorio /></span>
          {/* Texto longo rola dentro do quadro: a região recebe foco para rolar pelo teclado. */}
          <p className="grimorio-citacao__texto detalhe-carta__descricao" role="region" aria-label="Texto da carta" tabIndex={0}>
            {texto(conteudo.texto) || "Sem texto."}
          </p>
          <span className="grimorio-citacao__estrela grimorio-citacao__estrela--pe" aria-hidden="true"><EstrelaDoGrimorio /></span>
        </div>
        <div className="grimorio-dados" role="region" aria-label="Dados da carta" tabIndex={0}>
          <dl className={`grimorio-dados__lista grimorio-dados__lista--${linhas <= 3 ? "tres" : linhas === 4 ? "quatro" : "cinco"}`}>
          {quadros.map((dado) => (
            <div key={dado.rotulo} className={`grimorio-dado grimorio-dado--${dado.coluna}`}>
              <span className="grimorio-dado__icone" aria-hidden="true"><IconeDoDado nome={dado.icone} /></span>
              <dt className="grimorio-dado__rotulo">{dado.rotulo}</dt>
              <dd className="grimorio-dado__valor" style={escalaDoValor(dado.valor)}>{dado.valor}</dd>
              <span className="grimorio-dado__estrela" aria-hidden="true"><EstrelaDoGrimorio /></span>
            </div>
          ))}
          </dl>
        </div>
      </div>

      {/* O conceito não mostra ações: elas ficam num friso no pé do diálogo, abaixo do livro. */}
      {children}
    </MolduraDoGrimorio>
  );
}
