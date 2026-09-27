import type { ReactNode } from "react";

import { asNumber, asRecord, asString, type FichaContrato, type PermissoesFicha } from "../types";
import { acharPorNome, type ClasseCatalogo, type ListasFicha, type RacaCatalogo } from "./catalogoApi";
import { EditableField } from "./EditableField";
import { SelectField, type AlteracaoCampo, type Consequencias } from "./SelectField";

const TAMANHOS = ["Minúsculo", "Pequeno", "Médio", "Grande", "Enorme", "Colossal"];
const NIVEIS = Array.from({ length: 20 }, (_, i) => String(i + 1));

export interface IdentityPanelProps {
  ficha: FichaContrato;
  permissoes: PermissoesFicha | undefined;
  classes: ClasseCatalogo[];
  racas: RacaCatalogo[];
  listas: ListasFicha | undefined;
  /** Avisos do servidor por campo (valores fora das regras ou do catálogo). */
  avisos: Record<string, string>;
  onSave: (alteracoes: AlteracaoCampo[]) => Promise<{ status: "salvo" | "pendente" }>;
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

export function IdentityPanel({ ficha, permissoes, classes, racas, listas, avisos, onSave }: IdentityPanelProps) {
  const p = asRecord(ficha.personagem);
  const nome = asString(p.nome) ?? "";
  const classeNome = asString(p.classe) ?? "";
  const arquetipoNome = asString(p.arquetipo) ?? "";
  const racaNome = asString(p.raca) ?? "";
  const tamanho = asString(p.tamanho) ?? "";
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
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">IDENTIDADE</span><h2>Informações básicas</h2></div></div>
      <div className="detail-grid">
        <EditableField label="Nome" path="personagem.nome" value={nome} permissoes={permissoes}
          onSave={(path, value) => onSave([{ path, value }])} />
        <SelectField label="Classe" path="personagem.classe" value={classe?.nome ?? classeNome} options={opcoesClasse}
          permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.classe"]} consequencias={trocaDeClasse}
          exibicao={classe ? <span className="class-name">{classe.cor && <span className="class-swatch" style={{ background: classe.cor }} aria-hidden="true" />}{classe.nome}</span> : undefined} />
        <SelectField label="Arquétipo" path="personagem.arquetipo" value={arquetipo?.nome ?? arquetipoNome}
          options={opcoesArquetipo} permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.arquetipo"]}
          vazio="Sem arquétipo" consequencias={trocaDeArquetipo} />
        <SelectField label="Raça" path="personagem.raca" value={raca?.nome ?? racaNome} options={opcoesRaca}
          permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.raca"]} consequencias={trocaDeRaca} />
        <SelectField label="Nível" path="personagem.nivel" value={nivel !== undefined ? String(nivel) : ""} options={NIVEIS.map((n) => ({ valor: n, rotulo: n }))}
          permissoes={permissoes} somenteNarrador aviso={avisos["personagem.nivel"]} acaoComAviso="Editar"
          onSave={(alteracoes) => onSave(alteracoes.map((a) => ({ ...a, value: Number(a.value) })))} emptyLabel="Não definido" />
        <EditableField label="Idade" path="personagem.idade" kind="number" min={0}
          value={asNumber(p.idade) !== undefined ? String(asNumber(p.idade)) : ""} permissoes={permissoes}
          onSave={(path, value) => onSave([{ path, value: value === "" ? null : value }])} />
        <SelectField label="Sexo" path="personagem.sexo" value={asString(p.sexo) ?? ""}
          options={(listas?.sexos ?? []).map((s) => ({ valor: s, rotulo: s }))} vazio="Não informado"
          permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.sexo"]} />
        <div className="editable-field">
          <span className="eyebrow">Tamanho base</span>
          <strong>{raca?.tamanho ?? "—"}</strong>
          <small>{raca ? `Da raça ${raca.nome}` : "Escolha uma raça do catálogo"}</small>
        </div>
        <SelectField label="Tamanho atual" path="personagem.tamanho" value={tamanho}
          options={TAMANHOS.map((t) => ({ valor: t, rotulo: t }))} vazio="Sem exceção (usa a raça)"
          emptyLabel="Sem exceção" somenteNarrador permissoes={permissoes} onSave={onSave} aviso={avisos["personagem.tamanho"]} />
      </div>
      {arquetipo?.conceito && (
        <div className="archetype-concept">
          <span className="eyebrow">Conceito do arquétipo {arquetipo.nome}</span>
          <p>{arquetipo.conceito}</p>
        </div>
      )}
    </section>
  );
}
