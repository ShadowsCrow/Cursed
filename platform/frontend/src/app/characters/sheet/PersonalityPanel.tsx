import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import { Pergaminho } from "../../../ui/Tema";
import { campoEditavel } from "../fieldPolicy";
import { asRecord, asString, type FichaContrato, type PermissoesFicha } from "../types";
import type { ListasFicha } from "./catalogoApi";
import { EditableField } from "./EditableField";
import { IconePersonalidade } from "./personalidade/icones";
import { ehIconePersonalidade } from "./personalidade/nomesDosIcones";
import { PALETA_PERSONALIDADE } from "./personalidade/paleta";
import { lerTracos } from "./personalidade/tracos";
import { TracosField } from "./personalidade/TracosField";
import { paragrafosDaHistoria } from "./resumo/modelo";
import { Aspas, CantoFiligrana, DivisorDaHistoria, FiligranaDagua, FloreioDoDivisor, HasteTitulo } from "./personalidade/ornamentos";
import { RosaDosVentos } from "./resumo/ornamentos";
import { SelectField, type AlteracaoCampo } from "./SelectField";
import "./personalidade/personalidade.css";

/**
 * Pinturas opcionais da folha (reformular-personalidade-da-ficha, D6), geradas pelo usuário. Cada uma ocupa uma
 * área reservada pelo layout e, sem ela, o ornamento em SVG fica no lugar: nada se move quando ela chega.
 */
export interface ArteDaPersonalidade {
  escrivaninha?: string;
  historia?: string;
}

/** A paleta medida como variáveis CSS da folha (`--pers-*`). */
const VARIAVEIS_DA_PALETA = Object.fromEntries(Object.entries(PALETA_PERSONALIDADE).map(([nome, cor]) => [`--${nome}`, cor])) as CSSProperties;

const ARTE_DA_PERSONALIDADE: ArteDaPersonalidade = {
  escrivaninha: "/arte/personalidade/personalidade-escrivaninha.webp",
  historia: "/arte/personalidade/personalidade-historia.webp",
};

type Grupo = NonNullable<ListasFicha["grupos_personalidade"]>[number];
type Campo = ListasFicha["campos_personalidade"][number];

export interface PersonalityPanelProps {
  nome: string;
  ficha: FichaContrato;
  permissoes: PermissoesFicha | undefined;
  listas: ListasFicha | undefined;
  avisos: Record<string, string>;
  onSave: (alteracoes: AlteracaoCampo[]) => Promise<{ status: "salvo" | "pendente" }>;
  arte?: ArteDaPersonalidade;
}

function Icone({ nome, tamanho }: { nome: string | null | undefined; tamanho?: number }) {
  return ehIconePersonalidade(nome) ? <IconePersonalidade nome={nome} tamanho={tamanho} /> : null;
}

/** Área de uma pintura: a imagem, ou o ornamento em SVG quando ela falta ou falha. */
function Pintura({ src, tipo, reserva }: { src?: string; tipo: "escrivaninha" | "historia"; reserva: ReactNode }) {
  const [falhou, setFalhou] = useState(false);
  const pintada = Boolean(src) && !falhou;
  return (
    <div className={`personalidade-pintura personalidade-pintura--${tipo} ${pintada ? "" : "personalidade-pintura--reserva"}`.trim()} aria-hidden="true">
      {pintada ? <img src={src} alt="" loading={tipo === "historia" ? "lazy" : undefined} onError={() => setFalhou(true)} /> : reserva}
    </div>
  );
}

/** Uma linha de grupo: ícone do tema do campo ao lado do campo, que continua o mesmo de antes (D4). */
function Linha({ icone, vazia, children }: { icone: string | null | undefined; vazia: boolean; children: ReactNode }) {
  return (
    <div className={`personalidade-linha ${vazia ? "personalidade-linha--vazia" : ""}`.trim()}>
      <span className="personalidade-linha__icone"><Icone nome={icone} tamanho={40} /></span>
      {children}
    </div>
  );
}

/** Grupos do JSON; sem arrumação no catálogo, um só quadro com todos os campos curtos. */
function gruposDasListas(listas: ListasFicha | undefined): Grupo[] {
  if (listas?.grupos_personalidade?.length) return listas.grupos_personalidade;
  const topo = listas?.personalidade_topo;
  const curtos = (listas?.campos_personalidade ?? [])
    .filter((c) => !c.longo && c.chave !== topo?.citacao && c.chave !== topo?.etiquetas).map((c) => c.chave);
  return [{ id: "campos", titulo: "Traços e essência", subtitulo: "", emblema: "rosa_dos_ventos", campos: ["alinhamento", "pecado", ...curtos] }];
}

/**
 * Aba Personalidade (reformular-personalidade-da-ficha): cópia fiel da referência do usuário. Folha de
 * pergaminho com o topo (título, Frase marcante e Traços), um quadro por grupo do JSON, com uma linha por campo,
 * e o quadro da História. A edição de cada campo é a mesma de antes, pelo "Editar" da linha.
 */
export function PersonalityPanel({ nome, ficha, permissoes, listas, avisos, onSave, arte = ARTE_DA_PERSONALIDADE }: PersonalityPanelProps) {
  const idTitulo = useId();
  const idHistoria = useId();
  const personalidade = asRecord(ficha.personalidade);
  const valor = (chave: string) => asString(personalidade[chave]) ?? "";
  const pecadoGravado = valor("pecado");
  // A grafia antiga "Ganancia" é a mesma opção que "Ganância".
  const pecado = (listas?.pecados ?? []).find((p) => p.nome === pecadoGravado || (p.equivalentes ?? []).includes(pecadoGravado));
  const campos = new Map<string, Campo>((listas?.campos_personalidade ?? []).map((c) => [c.chave, c]));
  const icones = listas?.icones_personalidade ?? {};
  const topo = listas?.personalidade_topo;
  const citacao = topo?.citacao ? campos.get(topo.citacao) : undefined;
  const etiquetas = topo?.etiquetas ? campos.get(topo.etiquetas) : undefined;
  const historia = (listas?.campos_personalidade ?? []).find((c) => c.longo);
  const salvarTexto = (path: string, value: string | number) => onSave([{ path, value }]);
  // Vazio: quem só lê vê "Não informado"; quem edita vê a dica do JSON.
  const vazio = (path: string, dica: string) => (campoEditavel(path, permissoes) && dica ? dica : "Não informado");

  function campoDaLinha(chave: string): ReactNode {
    if (chave === "alinhamento") {
      return (
        <SelectField label="Alinhamento" path="personalidade.alinhamento" value={valor("alinhamento")}
          options={(listas?.alinhamentos ?? []).map((a) => ({ valor: a, rotulo: a }))} vazio="Não informado"
          permissoes={permissoes} onSave={onSave} aviso={avisos["personalidade.alinhamento"]} />
      );
    }
    if (chave === "pecado") {
      // O valor aparece só pelo nome: o ícone da linha já é o do tema do campo. O emoji fica nas opções.
      return (
        <SelectField label="Pecado Capital" path="personalidade.pecado" value={pecado?.nome ?? pecadoGravado}
          options={(listas?.pecados ?? []).map((p) => ({ valor: p.nome, rotulo: `${p.icone} ${p.nome}`.trim() }))} vazio="Não informado"
          permissoes={permissoes} onSave={onSave} aviso={avisos["personalidade.pecado"]} />
      );
    }
    const campo = campos.get(chave);
    if (!campo) return null;
    const path = `personalidade.${campo.chave}`;
    return (
      <EditableField label={campo.rotulo} path={path} kind="textarea" limite={campo.limite}
        value={valor(campo.chave)} emptyLabel={vazio(path, campo.dica)} placeholder={campo.dica}
        permissoes={permissoes} onSave={salvarTexto} aviso={avisos[path]} />
    );
  }

  const iconeDoCampo = (chave: string) => icones[chave] ?? campos.get(chave)?.icone;
  const frase = citacao ? valor(citacao.chave) : "";
  const fraseEditavel = citacao ? campoEditavel(`personalidade.${citacao.chave}`, permissoes) : false;
  const tracos = etiquetas ? lerTracos(personalidade[etiquetas.chave]) : [];
  const tracosEditaveis = etiquetas ? campoEditavel(`personalidade.${etiquetas.chave}`, permissoes) : false;
  const textoHistoria = historia ? valor(historia.chave) : "";
  const paragrafos = paragrafosDaHistoria(textoHistoria);

  return (
    // O contêiner mede a largura disponível: a disposição muda pela largura da folha, não da janela (D9).
    <div className="personalidade-conteiner">
      <Pergaminho as="section" aria-labelledby={idTitulo} className="folha-personalidade" style={VARIAVEIS_DA_PALETA}>
        <span className="folha-personalidade__moldura" aria-hidden="true">
          <CantoFiligrana posicao="se" /><CantoFiligrana posicao="sd" /><CantoFiligrana posicao="ie" /><CantoFiligrana posicao="id" />
        </span>

        <header className="folha-personalidade__topo">
          <span className="folha-personalidade__haste" aria-hidden="true"><HasteTitulo /></span>
          <div className="folha-personalidade__titulos">
            <span className="folha-personalidade__eyebrow">Quem é {nome}</span>
            <h2 id={idTitulo} className="folha-personalidade__titulo">Personalidade</h2>
            <span className="folha-personalidade__linha-titulo" aria-hidden="true" />
            <p className="folha-personalidade__subtitulo">Traços, valores e marcas que definem o personagem.</p>
          </div>
          <div className="folha-personalidade__destaques">
            {citacao && (frase || fraseEditavel) && (
              <div className="personalidade-citacao">
                <Aspas />
                <EditableField label={citacao.rotulo} path={`personalidade.${citacao.chave}`} limite={citacao.limite}
                  value={frase} emptyLabel={citacao.dica || "Não informado"} placeholder={citacao.dica}
                  permissoes={permissoes} onSave={salvarTexto}
                  aviso={avisos[`personalidade.${citacao.chave}`]} />
              </div>
            )}
            {etiquetas && (tracos.length > 0 || tracosEditaveis) && (
              <TracosField rotulo={etiquetas.rotulo} path={`personalidade.${etiquetas.chave}`} valor={tracos}
                maximo={etiquetas.maximo ?? 6} limite={etiquetas.limite} dica={etiquetas.dica}
                permissoes={permissoes} onSave={onSave} aviso={avisos[`personalidade.${etiquetas.chave}`]} />
            )}
          </div>
          <Pintura src={arte.escrivaninha} tipo="escrivaninha" reserva={<RosaDosVentos tamanho={150} />} />
        </header>
        <span className="folha-personalidade__divisor" aria-hidden="true"><FloreioDoDivisor /></span>

        <div className="personalidade-grupos">
          {gruposDasListas(listas).map((grupo) => (
            <GrupoDaFolha key={grupo.id} grupo={grupo} icone={(chave) => iconeDoCampo(chave)} campo={campoDaLinha}
              vazio={(chave) => !valor(chave).trim()} />
          ))}
        </div>

        {historia && (
          <section className="personalidade-historia" aria-labelledby={idHistoria}>
            <div className="personalidade-historia__corpo">
              <header className="personalidade-historia__cabeca">
                <span className="personalidade-historia__icone" aria-hidden="true"><Icone nome={historia.icone} tamanho={52} /></span>
                <div>
                  <h3 id={idHistoria} className="personalidade-historia__titulo">{historia.rotulo}</h3>
                  <p className="personalidade-historia__subtitulo">O passado que moldou o presente.</p>
                </div>
                <div className="personalidade-historia__editar">
                  <EditableField label={historia.rotulo} path={`personalidade.${historia.chave}`} kind="textarea" longo limite={historia.limite}
                    value={textoHistoria} emptyLabel="" placeholder={historia.dica} permissoes={permissoes} onSave={salvarTexto}
                    aviso={avisos[`personalidade.${historia.chave}`]} />
                </div>
              </header>
              <DivisorDaHistoria />
              {paragrafos.length > 0 ? (
                <div className="personalidade-historia__texto">
                  {paragrafos.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              ) : (
                <p className="personalidade-historia__texto personalidade-historia__texto--vazio">
                  {campoEditavel(`personalidade.${historia.chave}`, permissoes) ? `A história de ${nome} ainda não foi escrita.` : "História não escrita."}
                </p>
              )}
            </div>
            <Pintura src={arte.historia} tipo="historia" reserva={<RosaDosVentos tamanho={120} />} />
            <FiligranaDagua />
            <span className="personalidade-historia__cantos" aria-hidden="true">
              <CantoFiligrana posicao="se" /><CantoFiligrana posicao="sd" /><CantoFiligrana posicao="ie" /><CantoFiligrana posicao="id" />
            </span>
          </section>
        )}
      </Pergaminho>
    </div>
  );
}

function GrupoDaFolha({ grupo, icone, campo, vazio }: {
  grupo: Grupo; icone: (chave: string) => string | null | undefined; campo: (chave: string) => ReactNode;
  /** Campo sem valor: a linha mostra "Não informado" (ou a dica) em itálico, como na referência. */
  vazio: (chave: string) => boolean;
}) {
  const id = useId();
  const linhas = useRef<HTMLDivElement>(null);
  const rotulo = useLarguraDosRotulos(linhas, grupo.campos.join("|"));
  const estilo = { "--linhas": grupo.campos.length, ...(rotulo ? { "--rotulo": `${rotulo}px` } : {}) } as CSSProperties;
  return (
    <section className={`personalidade-grupo personalidade-grupo--${grupo.id}`} aria-labelledby={id} style={estilo}>
      <header className="personalidade-grupo__cabeca">
        <span className="personalidade-grupo__emblema" aria-hidden="true"><Icone nome={grupo.emblema} tamanho={70} /></span>
        <div>
          <h3 id={id} className="personalidade-grupo__titulo">{grupo.titulo}</h3>
          {grupo.subtitulo && <p className="personalidade-grupo__subtitulo">{grupo.subtitulo}</p>}
        </div>
      </header>
      <span className="personalidade-grupo__divisor" aria-hidden="true" />
      <div className="personalidade-grupo__linhas" ref={linhas}>
        {grupo.campos.map((chave) => <Linha key={chave} icone={icone(chave)} vazia={vazio(chave)}>{campo(chave)}</Linha>)}
      </div>
    </section>
  );
}

/**
 * Largura da coluna dos rótulos, como na referência: a linha mais larga de cada rótulo depois da quebra (um rótulo
 * longo quebra no limite do CSS e ocupa só a largura da linha mais larga). O CSS não encolhe uma caixa até o texto
 * quebrado, então a medida vem das caixas das linhas; sem layout (testes), fica a coluna do CSS.
 */
function useLarguraDosRotulos(linhas: RefObject<HTMLDivElement | null>, chave: string): number | null {
  const [largura, setLargura] = useState<number | null>(null);
  useLayoutEffect(() => {
    let vivo = true;
    const medir = () => {
      const alvo = linhas.current;
      if (!alvo || !vivo) return;
      let maior = 0;
      for (const rotulo of Array.from(alvo.querySelectorAll(".editable-field > .eyebrow"))) {
        const faixa = document.createRange();
        // Sem layout (jsdom), não há caixas de linha: fica a coluna do CSS.
        if (typeof faixa.getClientRects !== "function") return;
        faixa.selectNodeContents(rotulo);
        for (const caixa of Array.from(faixa.getClientRects())) maior = Math.max(maior, caixa.width);
      }
      setLargura(maior > 0 ? Math.ceil(maior) : null);
    };
    medir();
    void document.fonts?.ready.then(medir);
    return () => { vivo = false; };
  }, [linhas, chave]);
  return largura;
}
