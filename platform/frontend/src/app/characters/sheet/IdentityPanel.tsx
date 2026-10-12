import { useId, useState, type ReactNode } from "react";

import { Pergaminho } from "../../../ui/Tema";
import { asNumber, asRecord, asString, type FichaContrato, type PermissoesFicha } from "../types";
import { acharPorNome, type ClasseCatalogo, type ListasFicha, type RacaCatalogo } from "./catalogoApi";
import { lerAltura } from "../creation/altura";
import { EditableField } from "./EditableField";
import { EmblemaQuadro, IconeInformacao, LivroAberto, Pena, type NomeIconeInformacao } from "./informacoes/icones";
import { iconeDoSexo } from "./informacoes/sexo";
import { CantoDaFolha, DivisorOrnado, FlorDaBorda, Remate, RosaDosVentos, VolutaTitulo } from "./resumo/ornamentos";
import { Pintura } from "./resumo/ResumoVisual";
import { SelectField, type AlteracaoCampo, type Consequencias } from "./SelectField";

const TAMANHOS = ["Minúsculo", "Pequeno", "Médio", "Grande", "Enorme", "Colossal"];
const NIVEIS = Array.from({ length: 20 }, (_, i) => String(i + 1));

/**
 * Pinturas opcionais da folha (redesenhar-informacoes-basicas, D4 a D6), geradas fora do repositório. Cada uma
 * some sem deixar imagem quebrada; a folha continua completa só com os ornamentos em SVG.
 */
export interface ArteDasInformacoes {
  /** Paisagem em sépia à direita do título; sem ela, a rosa dos ventos. */
  paisagem?: string;
  /** Natureza-morta à esquerda da faixa do conceito. */
  conceitoEsquerda?: string;
  /** Natureza-morta à direita da faixa do conceito. */
  conceitoDireita?: string;
}

const ARTE_DAS_INFORMACOES: ArteDasInformacoes = {
  paisagem: "/arte/informacoes-paisagem.webp",
  conceitoEsquerda: "/arte/resumo-natureza-morta.webp",
  conceitoDireita: "/arte/informacoes-conceito-direita.webp",
};

export interface IdentityPanelProps {
  ficha: FichaContrato;
  permissoes: PermissoesFicha | undefined;
  classes: ClasseCatalogo[];
  racas: RacaCatalogo[];
  listas: ListasFicha | undefined;
  /** Avisos do servidor por campo (valores fora das regras ou do catálogo). */
  avisos: Record<string, string>;
  onSave: (alteracoes: AlteracaoCampo[]) => Promise<{ status: "salvo" | "pendente" }>;
  arte?: ArteDasInformacoes;
}

function nomes(habilidades: { nome: string }[] | undefined): string[] {
  return (habilidades ?? []).map((h) => h.nome);
}

/** Lista das cartas de habilidade que saem e entram numa troca de classe, arquétipo ou raça. */
function TrocaDeCartas({ saem, entram }: { saem: string[]; entram: string[] }) {
  if (!saem.length && !entram.length) return null;
  return (
    <div className="card-swap" aria-label="Cartas de habilidade na troca">
      {saem.length > 0 && <p><strong>Saem:</strong> {saem.join(", ")}</p>}
      {entram.length > 0 && <p><strong>Entram, já aprendidas:</strong> {entram.join(", ")}</p>}
      <p className="preview-note">Habilidades recebidas por outras vias continuam com o personagem.</p>
    </div>
  );
}

/** Uma linha de quadro: ícone decorativo ao lado do campo, que continua o mesmo de antes (D3). */
function Linha({ icone, children }: { icone: NomeIconeInformacao; children: ReactNode }) {
  return (
    <div className="info-linha">
      <span className="info-linha__icone"><IconeInformacao nome={icone} /></span>
      {children}
    </div>
  );
}

/** Quadro emoldurado da folha, com emblema e título (D2). */
function Quadro({ tipo, titulo, children }: { tipo: "pessoal" | "origem"; titulo: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={`info-quadro info-quadro--${tipo}`} aria-labelledby={id}>
      <Remate />
      <header className="info-quadro__cabeca">
        <EmblemaQuadro tipo={tipo} />
        <h3 id={id} className="info-quadro__titulo">{titulo}</h3>
      </header>
      <div className="info-quadro__linhas">{children}</div>
    </section>
  );
}

/**
 * Aba Informações básicas (redesenhar-informacoes-basicas): folha de pergaminho do Resumo com dois quadros de
 * campos e a faixa do conceito do arquétipo. A edição de cada campo é a mesma de antes.
 */
export function IdentityPanel({ ficha, permissoes, classes, racas, listas, avisos, onSave, arte = ARTE_DAS_INFORMACOES }: IdentityPanelProps) {
  const idTitulo = useId();
  const idConceito = useId();
  const [paisagem, setPaisagem] = useState(false);
  const [conceitoEsquerda, setConceitoEsquerda] = useState(false);
  const [conceitoDireita, setConceitoDireita] = useState(false);
  const p = asRecord(ficha.personagem);
  const nome = asString(p.nome) ?? "";
  const classeNome = asString(p.classe) ?? "";
  const arquetipoNome = asString(p.arquetipo) ?? "";
  const racaNome = asString(p.raca) ?? "";
  const tamanho = asString(p.tamanho) ?? "";
  const sexo = asString(p.sexo) ?? "";
  const nivel = asNumber(p.nivel);
  const narrador = permissoes?.papel === "narrador";

  const classe = acharPorNome(classes, classeNome);
  const arquetipo = classe ? acharPorNome(classe.arquetipos, arquetipoNome) : undefined;
  const raca = acharPorNome(racas, racaNome);

  function trocaDeClasse(novo: string): Consequencias {
    const nova = acharPorNome(classes, novo);
    const arquetipoFica = nova && acharPorNome(nova.arquetipos, arquetipoNome);
    const extras: AlteracaoCampo[] = arquetipoNome && !arquetipoFica ? [{ path: "personagem.arquetipo", value: "" }] : [];
    const saem = [...nomes(classe?.habilidades), ...(extras.length ? nomes(arquetipo?.habilidades) : [])];
    return {
      extras,
      detalhes: (
        <>
          {extras.length > 0 && (
            <p className="preview-note">O arquétipo {arquetipoNome} não pertence à nova classe e será limpo; escolha outro depois.</p>
          )}
          <TrocaDeCartas saem={saem} entram={nomes(nova?.habilidades)} />
        </>
      ),
    };
  }

  function trocaDeArquetipo(novo: string): Consequencias {
    const novoArquetipo = classe ? acharPorNome(classe.arquetipos, novo) : undefined;
    return { detalhes: <TrocaDeCartas saem={nomes(arquetipo?.habilidades)} entram={nomes(novoArquetipo?.habilidades)} /> };
  }

  function trocaDeRaca(novo: string): Consequencias {
    const nova = acharPorNome(racas, novo);
    const detalhes: ReactNode = (
      <>
        <TrocaDeCartas saem={nomes(raca?.habilidades)} entram={nomes(nova?.habilidades)} />
        {nova && nova.habilidades.length === 0 && <p className="preview-note">Não há habilidades registradas para {nova.nome}.</p>}
      </>
    );
    if (!tamanho) return { detalhes };
    if (!narrador) {
      return { detalhes, bloqueio: `O Tamanho atual (${tamanho}) foi definido pelo Narrador. Peça a ele para trocar a raça.` };
    }
    return {
      detalhes,
      escolha: {
        pergunta: `O personagem tem Tamanho atual ${tamanho}, uma exceção à raça. O que fazer com ela?`,
        opcoes: [
          { id: "limpar", rotulo: `Limpar e usar o Tamanho de ${novo}${nova?.tamanho ? ` (${nova.tamanho})` : ""}`,
            extras: [{ path: "personagem.tamanho", value: "" }] },
          { id: "manter", rotulo: `Manter ${tamanho} também para ${novo}`,
            extras: [{ path: "personagem.tamanho_raca", value: novo }] },
        ],
      },
    };
  }

  const opcoesClasse = classes.map((c) => ({ valor: c.nome, rotulo: c.nome }));
  const opcoesArquetipo = (classe?.arquetipos ?? []).map((a) => ({ valor: a.nome, rotulo: a.nome }));
  const opcoesRaca = racas.map((r) => ({ valor: r.nome, rotulo: r.nome }));

  return (
    // O contêiner mede a largura disponível: a disposição muda pela largura da folha, não da janela (D7).
    <div className="info-folha-conteiner">
      <Pergaminho as="section" aria-labelledby={idTitulo}
        className={["info-folha", paisagem && "info-folha--paisagem"].filter(Boolean).join(" ")}>
        <span className="info-folha__moldura" aria-hidden="true">
          <CantoDaFolha posicao="se" /><CantoDaFolha posicao="sd" /><CantoDaFolha posicao="ie" /><CantoDaFolha posicao="id" />
          <FlorDaBorda lado="esquerda" /><FlorDaBorda lado="direita" />
        </span>

        <header className="info-folha__cabecalho">
          <span className="info-folha__etiqueta">Identidade</span>
          <div className="info-folha__linha-titulo">
            <h2 id={idTitulo} className="info-folha__titulo">Informações básicas</h2>
            <Pena />
          </div>
          <p className="info-folha__subtitulo">Dados fundamentais sobre o personagem.</p>
          <span className="info-folha__friso" aria-hidden="true"><VolutaTitulo /></span>
          <Pintura src={arte.paisagem} className="info-pintura info-pintura--paisagem" onCarregada={setPaisagem} />
          {!paisagem && <span className="info-folha__rosa" aria-hidden="true"><RosaDosVentos tamanho={120} /></span>}
        </header>

        <div className="info-quadros">
          <Quadro tipo="pessoal" titulo="Características pessoais">
            <Linha icone="nome">
              <EditableField label="Nome" path="personagem.nome" value={nome} permissoes={permissoes}
                onSave={(path, value) => onSave([{ path, value }])} />
            </Linha>
            <Linha icone="arquetipo">
              <SelectField label="Arquétipo" path="personagem.arquetipo" value={arquetipo?.nome ?? arquetipoNome}
                options={opcoesArquetipo} permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.arquetipo"]}
                vazio="Sem arquétipo" consequencias={trocaDeArquetipo} />
            </Linha>
            <Linha icone="nivel">
              <SelectField label="Nível" path="personagem.nivel" value={nivel !== undefined ? String(nivel) : ""} options={NIVEIS.map((n) => ({ valor: n, rotulo: n }))}
                permissoes={permissoes} somenteNarrador aviso={avisos["personagem.nivel"]} acaoComAviso="Editar"
                onSave={(alteracoes) => onSave(alteracoes.map((a) => ({ ...a, value: Number(a.value) })))} emptyLabel="Não definido" />
            </Linha>
            <Linha icone="altura">
              <EditableField label="Altura (m)" path="personagem.altura" placeholder="ex.: 1,75" aviso={avisos["personagem.altura"]}
                value={asNumber(p.altura) !== undefined ? String(asNumber(p.altura)).replace(".", ",") : ""} permissoes={permissoes}
                onSave={(path, value) => {
                  // Vírgula ou ponto; texto que não é altura vai como está, e o servidor explica o problema.
                  const lida = lerAltura(String(value));
                  return onSave([{ path, value: lida.vazia ? null : lida.valor ?? String(value) }]);
                }} />
            </Linha>
            <Linha icone="tamanho-base">
              {/* Vem da raça: sem "Editar", e a coluna do botão fica vazia para alinhar as linhas. */}
              <div className="editable-field">
                <span className="eyebrow">Tamanho base</span>
                <strong>{raca?.tamanho ?? "—"}</strong>
                <small>{raca ? `Da raça ${raca.nome}` : "Escolha uma raça do catálogo"}</small>
              </div>
            </Linha>
          </Quadro>

          <Quadro tipo="origem" titulo="Classificação e origem">
            <Linha icone="classe">
              <SelectField label="Classe" path="personagem.classe" value={classe?.nome ?? classeNome} options={opcoesClasse}
                permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.classe"]} consequencias={trocaDeClasse}
                exibicao={classe ? <span className="class-name">{classe.cor && <span className="class-swatch" style={{ background: classe.cor }} aria-hidden="true" />}{classe.nome}</span> : undefined} />
            </Linha>
            <Linha icone="raca">
              <SelectField label="Raça" path="personagem.raca" value={raca?.nome ?? racaNome} options={opcoesRaca}
                permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.raca"]} consequencias={trocaDeRaca} />
            </Linha>
            <Linha icone="idade">
              <EditableField label="Idade" path="personagem.idade" kind="number" min={0}
                value={asNumber(p.idade) !== undefined ? String(asNumber(p.idade)) : ""} permissoes={permissoes}
                onSave={(path, value) => onSave([{ path, value: value === "" ? null : value }])} />
            </Linha>
            <Linha icone={iconeDoSexo(sexo)}>
              <SelectField label="Sexo" path="personagem.sexo" value={sexo}
                options={(listas?.sexos ?? []).map((s) => ({ valor: s, rotulo: s }))} vazio="Não informado"
                permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.sexo"]} />
            </Linha>
            <Linha icone="tamanho-atual">
              <SelectField label="Tamanho atual" path="personagem.tamanho" value={tamanho}
                options={TAMANHOS.map((t) => ({ valor: t, rotulo: t }))} vazio="Sem exceção (usa a raça)"
                emptyLabel="Sem exceção" somenteNarrador permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.tamanho"]} />
            </Linha>
          </Quadro>
        </div>

        {arquetipo?.conceito && (
          <section aria-labelledby={idConceito} className={["info-conceito", conceitoEsquerda && "info-conceito--esquerda",
            conceitoDireita && "info-conceito--direita"].filter(Boolean).join(" ")}>
            <Pintura src={arte.conceitoEsquerda} className="info-pintura info-pintura--conceito-esquerda" onCarregada={setConceitoEsquerda} />
            <div className="info-conceito__texto">
              <div className="info-conceito__cabeca">
                <LivroAberto />
                <h3 id={idConceito} className="info-conceito__titulo">Conceito do arquétipo {arquetipo.nome}</h3>
              </div>
              <DivisorOrnado className="info-conceito__divisor" />
              <p>{arquetipo.conceito}</p>
            </div>
            <Pintura src={arte.conceitoDireita} className="info-pintura info-pintura--conceito-direita" onCarregada={setConceitoDireita} />
          </section>
        )}
      </Pergaminho>
    </div>
  );
}
