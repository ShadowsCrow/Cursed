import { useId, useState, type CSSProperties, type ReactNode } from "react";

import { Glyph } from "../../../../ui/Display";
import { Pergaminho } from "../../../../ui/Tema";
import {
  IMAGEM_PADRAO, paragrafosDaHistoria,
  type HabilidadeDoResumo, type ItemDoResumo, type LinhaDoResumo, type ModeloDoResumo, type RecursoDoResumo, type SecaoDoResumo, type ValorDoResumo,
} from "./modelo";
import {
  Asa, CantoDaFolha, Crista, DivisorOrnado, Estandarte, FlorDaBorda, IconeFicha, Medalhao, Remate, RosaDosVentos, Voluta,
  VolutaTitulo, type TipoMedalhao,
} from "./ornamentos";

/**
 * Pinturas opcionais da cena (tarefa 4A.2), geradas fora do repositório. Cada uma some sem deixar
 * imagem quebrada; a folha continua completa só com os ornamentos em SVG.
 */
export interface ArteDoResumo {
  /** Paisagem atrás da figura; sem ela, a própria imagem central desfocada. */
  cena?: string;
  /** Pedras e arbustos aos pés da figura. */
  primeiroPlano?: string;
  /** Livros, vela e caveira no canto inferior esquerdo. */
  naturezaMorta?: string;
  /** Bússola de latão no canto inferior direito; sem ela, a rosa dos ventos em SVG. */
  bussola?: string;
}

export interface ResumoVisualProps {
  modelo: ModeloDoResumo;
  /** Atalho de cada quadro para a aba correspondente; sem ele, os quadros não têm atalho. */
  onAbrir?: (secao: SecaoDoResumo) => void;
  /** Quem pode editar vê o convite para escrever a História. */
  podeEditar?: boolean;
  /** Ação junto à imagem central (envio da ilustração), só para quem pode editar. */
  acaoImagem?: ReactNode;
  arte?: ArteDoResumo;
}

const ROTULO_SECAO: Record<SecaoDoResumo, string> = {
  informacoes: "Informações básicas",
  status: "Status",
  atributos: "Atributos",
  pericias: "Perícias",
  equipamentos: "Equipamentos",
  cartas: "Habilidades e cartas",
  personalidade: "Personalidade",
};

function Atalho({ secao, onAbrir }: { secao: SecaoDoResumo; onAbrir?: (secao: SecaoDoResumo) => void }) {
  if (!onAbrir) return null;
  return (
    <button type="button" className="resumo-atalho" onClick={() => onAbrir(secao)} aria-label={`Abrir ${ROTULO_SECAO[secao]}`} title={`Abrir ${ROTULO_SECAO[secao]}`}>
      <Glyph name="arrow" size={14} />
    </button>
  );
}

function Quadro({ area, titulo, secao, onAbrir, destaque = false, ornamento, children }: {
  area: string; titulo: string; secao: SecaoDoResumo; onAbrir?: (secao: SecaoDoResumo) => void;
  /** Moldura maior, com lanças nos cantos (identidade e recursos). */
  destaque?: boolean;
  /** Ornamento sobre a borda de cima; por padrão, o remate em flor. */
  ornamento?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={`resumo-quadro ${destaque ? "resumo-quadro--destaque" : ""} resumo-quadro--${area}`} aria-labelledby={id}>
      {ornamento ?? <Remate />}
      <div className="resumo-quadro__cabeca">
        <h2 id={id} className="resumo-quadro__titulo"><VolutaTitulo /><span>{titulo}</span><VolutaTitulo espelhada /></h2>
        <Atalho secao={secao} onAbrir={onAbrir} />
      </div>
      {children}
    </section>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="resumo-vazio">{children}</p>;
}

/** Valor calculado pelo servidor; sem valor, "—" (quem chama escreve o motivo logo abaixo). */
function Numero({ valor }: { valor: number | null }) {
  if (valor === null) {
    return (
      <span className="resumo-numero resumo-numero--ausente">
        <span aria-hidden="true">—</span><span className="sr-only">Sem valor calculado</span>
      </span>
    );
  }
  return <span className="resumo-numero">{valor}</span>;
}

function Recurso({ tipo, rotulo, rotuloCompleto, valor }: {
  tipo: TipoMedalhao; rotulo: string; rotuloCompleto: string; valor: RecursoDoResumo | ValorDoResumo;
}) {
  const atual = "atual" in valor ? valor.atual : undefined;
  return (
    <div className={`resumo-recurso resumo-recurso--${tipo}`}>
      <Medalhao tipo={tipo} />
      <dt><span aria-hidden="true">{rotulo}</span><span className="sr-only">{rotuloCompleto}</span></dt>
      <dd>
        {valor.valor === null
          ? <Numero valor={null} />
          : atual !== undefined
            ? <span className="resumo-numero"><span className="sr-only">{atual} de {valor.valor}</span><span aria-hidden="true">{atual}<small>/{valor.valor}</small></span></span>
            : <Numero valor={valor.valor} />}
        {valor.valor === null && valor.motivo && <small className="resumo-motivo">{valor.motivo}</small>}
      </dd>
    </div>
  );
}

function Plaqueta({ rotulo, valor }: { rotulo: string; valor: ValorDoResumo }) {
  return (
    <div className="resumo-plaqueta">
      <dt>{rotulo}</dt>
      <dd><Numero valor={valor.valor} />{valor.valor === null && valor.motivo && <small className="resumo-motivo">{valor.motivo}</small>}</dd>
    </div>
  );
}

function Linhas({ linhas, circulo = false }: { linhas: LinhaDoResumo[]; circulo?: boolean }) {
  return (
    <ul className="resumo-linhas">
      {linhas.map((linha) => (
        <li key={linha.nome}>
          <span className={`resumo-linhas__icone ${circulo ? "resumo-linhas__icone--circulo" : ""}`.trim()}>
            {linha.icone && <IconeFicha nome={linha.icone} />}
          </span>
          <span className="resumo-linhas__nome" title={linha.nome}>{linha.nome}</span>
          <Numero valor={linha.valor} />
        </li>
      ))}
    </ul>
  );
}

function Mais({ restantes }: { restantes: number }) {
  return restantes > 0 ? <p className="resumo-mais">e mais {restantes}</p> : null;
}

const GLIFO_ITEM = { arma: "sword", armadura: "shield", outro: "bag" } as const;

function Item({ item }: { item: ItemDoResumo }) {
  return (
    <li>
      <span className="resumo-itens__arte">
        {item.arte ?? (item.imagem ? <img src={item.imagem} alt="" loading="lazy" /> : <Glyph name={GLIFO_ITEM[item.tipo]} size={26} />)}
      </span>
      <span className="resumo-itens__texto">
        <strong>{item.nome}{item.quantidade > 1 && <span className="resumo-itens__qtd"> (×{item.quantidade})</span>}</strong>
        {item.descricao && <small>{item.descricao}</small>}
      </span>
    </li>
  );
}

function Habilidade({ habilidade }: { habilidade: HabilidadeDoResumo }) {
  return (
    <li>
      <span className={`resumo-itens__arte resumo-itens__arte--carta resumo-itens__arte--${habilidade.tipo}`}>
        {habilidade.arte ?? (habilidade.imagem ? <img src={habilidade.imagem} alt="" loading="lazy" /> : <Glyph name={habilidade.tipo === "magia" ? "spark" : "bolt"} size={24} />)}
      </span>
      <span className="resumo-itens__texto">
        <strong>{habilidade.nome}</strong>
        {habilidade.descricao && <small>{habilidade.descricao}</small>}
      </span>
    </li>
  );
}

function Figura({ modelo, acaoImagem, primeiroPlano }: { modelo: ModeloDoResumo; acaoImagem?: ReactNode; primeiroPlano?: string }) {
  const [falhou, setFalhou] = useState(false);
  const src = falhou ? IMAGEM_PADRAO : modelo.imagem.src;
  const padrao = falhou || modelo.imagem.origem === "padrao";
  return (
    <figure className={`resumo-ficha__figura ${padrao ? "resumo-ficha__figura--padrao" : ""}`.trim()}>
      <img className="resumo-ficha__figura-imagem" src={src} alt={padrao ? `${modelo.nome}, ainda sem imagem` : `Ilustração de ${modelo.nome}`}
        onError={() => { if (!falhou) setFalhou(true); }} />
      <Pintura src={primeiroPlano} className="resumo-pintura--primeiro-plano" />
      {acaoImagem && <figcaption className="resumo-ficha__acao-imagem">{acaoImagem}</figcaption>}
    </figure>
  );
}

/** Pintura decorativa opcional; avisa se carregou para a folha abrir espaço, e some se faltar. */
function Pintura({ src, className, onCarregada }: { src?: string; className: string; onCarregada?: (ok: boolean) => void }) {
  const [falhou, setFalhou] = useState(false);
  if (!src || falhou) return null;
  return (
    <img className={`resumo-pintura ${className}`} src={src} alt="" aria-hidden="true" loading="lazy"
      onLoad={() => onCarregada?.(true)} onError={() => { setFalhou(true); onCarregada?.(false); }} />
  );
}

/** Cena pintada atrás da figura; sem ela, a própria imagem central desfocada faz o papel. */
function Cena({ src, reserva }: { src?: string; reserva: string }) {
  const [falhou, setFalhou] = useState(false);
  const pintada = Boolean(src) && !falhou;
  return (
    <div className={`resumo-ficha__cena ${pintada ? "" : "resumo-ficha__cena--reserva"}`.trim()} aria-hidden="true">
      {pintada
        ? <img key="cena" src={src} alt="" onError={() => setFalhou(true)} />
        : <img key="reserva" src={reserva} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
    </div>
  );
}

/**
 * Resumo da ficha (aba-resumo-da-ficha): pergaminho com a figura ao centro e os quadros de
 * identidade, recursos, atributos, perícias, equipamentos, habilidades e história. Só leitura.
 */
export function ResumoVisual({ modelo, onAbrir, podeEditar = false, acaoImagem, arte = {} }: ResumoVisualProps) {
  const idHistoria = useId();
  const [naturezaMorta, setNaturezaMorta] = useState(false);
  const [bussola, setBussola] = useState(false);
  const paragrafos = paragrafosDaHistoria(modelo.historia);
  const estilo = modelo.corClasse ? ({ "--resumo-classe": modelo.corClasse } as CSSProperties) : undefined;
  const identidade: [string, ReactNode][] = [
    ["Classe", modelo.classe],
    ["Arquétipo", modelo.arquetipo],
    ["Raça", modelo.raca],
    ["Nível", modelo.nivel],
  ];

  return (
    // O contêiner mede a largura disponível: o layout muda pela largura do Resumo, não da janela.
    <div className="resumo-ficha-conteiner">
      <Pergaminho as="article" className={["resumo-ficha", naturezaMorta && "resumo-ficha--natureza-morta", bussola && "resumo-ficha--bussola"].filter(Boolean).join(" ")}
        style={estilo} aria-label={`Resumo de ${modelo.nome}`}>
        <span className="resumo-ficha__moldura" aria-hidden="true">
          <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
          <FlorDaBorda lado="esquerda" /><FlorDaBorda lado="direita" />
        </span>
        <Estandarte lado="esquerda" cor={modelo.corClasse} />
        <Estandarte lado="direita" cor={modelo.corClasse} />

        <div className="resumo-ficha__placa" aria-hidden="true">
          <Voluta lado="esquerda" />
          <span className="resumo-ficha__placa-texto">Ficha de Personagem</span>
          <Voluta lado="direita" />
        </div>

        <div className="resumo-ficha__corpo">
          <Cena src={arte.cena} reserva={modelo.imagem.src} />

          <div className="resumo-ficha__lado resumo-ficha__lado--esquerdo">
            <section className="resumo-quadro resumo-quadro--destaque resumo-quadro--identidade" aria-labelledby="resumo-nome">
              <div className="resumo-quadro__cabeca resumo-quadro__cabeca--identidade">
                <h1 id="resumo-nome" className="resumo-identidade__nome">{modelo.nome}</h1>
                <Atalho secao="informacoes" onAbrir={onAbrir} />
              </div>
              <dl className="resumo-identidade">
                {identidade.map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt>{rotulo}</dt>
                    <dd>{valor === undefined || valor === "" ? <span aria-label="Não informado">—</span> : valor}</dd>
                  </div>
                ))}
              </dl>
              <span className="resumo-selo-rosa" aria-hidden="true"><RosaDosVentos tamanho={40} /></span>
            </section>

            <Quadro area="atributos" titulo="Atributos" secao="atributos" onAbrir={onAbrir}>
              {modelo.atributos.map((grupo) => (
                <div key={grupo.titulo} className="resumo-grupo">
                  <h3 className="resumo-grupo__titulo">{grupo.titulo}</h3>
                  <Linhas linhas={grupo.itens} />
                </div>
              ))}
            </Quadro>

            <Quadro area="equipamentos" titulo="Equipamentos" secao="equipamentos" onAbrir={onAbrir}>
              {modelo.equipamentos.visiveis.length > 0
                ? <ul className="resumo-itens">{modelo.equipamentos.visiveis.map((item, i) => <Item key={`${item.nome}-${i}`} item={item} />)}</ul>
                : <Vazio>Nada equipado no momento.</Vazio>}
              <Mais restantes={modelo.equipamentos.restantes} />
            </Quadro>
          </div>

          <Figura modelo={modelo} acaoImagem={acaoImagem} primeiroPlano={arte.primeiroPlano} />

          <div className="resumo-ficha__lado resumo-ficha__lado--direito">
            <Quadro area="recursos" titulo="Recursos" secao="status" onAbrir={onAbrir} destaque ornamento={<Crista />}>
              <dl className="resumo-recursos">
                <Recurso tipo="vida" rotulo="Vida" rotuloCompleto="Pontos de Vida" valor={modelo.recursos.pv} />
                <Recurso tipo="proposito" rotulo="Propósito" rotuloCompleto="Pontos de Propósito" valor={modelo.recursos.pp} />
                <Recurso tipo="defesa" rotulo="Defesa" rotuloCompleto="Defesa (Esquiva)" valor={modelo.recursos.defesa} />
              </dl>
              <div className="resumo-pingente">
                <Asa lado="esquerda" />
                <dl className="resumo-plaquetas">
                  <Plaqueta rotulo="Defesa (Armadura)" valor={modelo.recursos.armadura} />
                  <Plaqueta rotulo="RDB (Armadura)" valor={modelo.recursos.rdb} />
                </dl>
                <Asa lado="direita" />
              </div>
            </Quadro>

            <Quadro area="pericias" titulo="Perícias" secao="pericias" onAbrir={onAbrir}>
              {modelo.pericias.length > 0
                ? <Linhas linhas={modelo.pericias} circulo />
                : <Vazio>Nenhuma perícia tem valor acima de 0.</Vazio>}
            </Quadro>

            <Quadro area="habilidades" titulo="Habilidades" secao="cartas" onAbrir={onAbrir}>
              {modelo.habilidades.visiveis.length > 0
                ? <ul className="resumo-itens">{modelo.habilidades.visiveis.map((h, i) => <Habilidade key={`${h.nome}-${i}`} habilidade={h} />)}</ul>
                : <Vazio>Nenhuma habilidade ou magia aprendida ainda.</Vazio>}
              <Mais restantes={modelo.habilidades.restantes} />
            </Quadro>
          </div>
        </div>

        <section className="resumo-historia" aria-labelledby={idHistoria}>
          <div className="resumo-historia__cabeca">
            <RosaDosVentos tamanho={30} />
            <h2 id={idHistoria} className="resumo-historia__titulo">História</h2>
            <DivisorOrnado className="resumo-historia__divisor" />
            <Atalho secao="personalidade" onAbrir={onAbrir} />
          </div>
          {paragrafos.length > 0 ? (
            <div className="resumo-historia__texto">
              {paragrafos.map((p, i) => <p key={i} className={i === 0 ? "resumo-historia__primeiro" : undefined}>{p}</p>)}
            </div>
          ) : podeEditar ? (
            <div className="resumo-historia__convite">
              <p>A história de {modelo.nome} ainda não foi escrita.</p>
              {onAbrir && <button type="button" className="button button--secondary" onClick={() => onAbrir("personalidade")}>Escrever a história</button>}
            </div>
          ) : (
            <Vazio>História não escrita.</Vazio>
          )}
        </section>

        <DivisorOrnado className="resumo-ficha__fecho" />
        <Pintura src={arte.naturezaMorta} className="resumo-pintura--natureza-morta" onCarregada={setNaturezaMorta} />
        <Pintura src={arte.bussola} className="resumo-pintura--bussola" onCarregada={setBussola} />
        {!bussola && <span className="resumo-bussola-svg" aria-hidden="true"><RosaDosVentos tamanho={120} /></span>}
      </Pergaminho>
    </div>
  );
}
