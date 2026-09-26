import { useRef, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { Glyph } from "../../../ui/Display";
import { CharacterCardsPanel } from "../../cards/CharacterCardsPanel";
import { useConnectivityStatus } from "../../connectivity/useConnectivityStatus";
import type { ApiClient } from "../types";
import { ActiveStateStrip } from "./ActiveStateStrip";
import { AttributeTable, type Alteracao } from "./AttributeTable";
import { DerivedValueGroup } from "./DerivedValueGroup";
import { EditableField } from "./EditableField";
import { EffectsPanel } from "./EffectsPanel";
import { personagemInfo, personalidadeInfo } from "./fichaAccess";
import { ImportDialog } from "./ImportDialog";
import { EquippedItemsPanel, InventoryItemsPanel } from "./InventoryPanel";
import {
  sheetKeys,
  useEfeitos,
  useDesgaste,
  useFichaSnapshot,
  useInventario,
  usePermissoesFicha,
  useSalvarCampoFicha,
  useValoresDerivados,
} from "./sheetApi";
import { SheetHeader } from "./SheetHeader";
import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS } from "./sheetCatalog";

const SECTIONS = [
  { id: "informacoes", label: "Informações básicas" },
  { id: "personalidade", label: "Personalidade" },
  { id: "atributos", label: "Atributos" },
  { id: "pericias", label: "Perícias" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "inventario", label: "Inventário" },
  { id: "status", label: "Status" },
  { id: "efeitos", label: "Efeitos" },
  { id: "cartas", label: "Habilidades e cartas" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
const DEFAULT_SECTION: SectionId = "informacoes";

/** Seções renomeadas continuam acessíveis por links antigos. */
const SECOES_ANTIGAS: Record<string, SectionId> = { habilidades: "cartas" };

function isSectionId(value: string | null): value is SectionId {
  return SECTIONS.some((section) => section.id === value);
}

export interface CharacterSheetPageProps {
  api: ApiClient;
  mesaId: string;
  personagemId: string;
  userId: string;
  onBack: () => void;
}

/**
 * Página da ficha viva: orquestra cabeçalho (6.2), navegação modular entre
 * seções preservada na URL (6.3), leitura com edição contextual autorizada
 * (6.4), efeitos (6.5), inventário e equipamento (6.6), explicação de valores
 * derivados (6.7) e importação (6.8). Cada seção compartilha os mesmos dados
 * já carregados aqui — alternar de seção nunca dispara uma nova busca.
 */
export function CharacterSheetPage({ api, mesaId, personagemId, userId, onBack }: CharacterSheetPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const secaoParam = searchParams.get("secao");
  const secaoPedida = secaoParam && secaoParam in SECOES_ANTIGAS ? SECOES_ANTIGAS[secaoParam] ?? null : secaoParam;
  const secao = isSectionId(secaoPedida) ? secaoPedida : DEFAULT_SECTION;
  const online = useConnectivityStatus() !== "offline";
  const queryClient = useQueryClient();

  function goTo(next: SectionId) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("secao", next);
    setSearchParams(nextParams, { replace: false });
  }

  const fichaQuery = useFichaSnapshot(api, mesaId, personagemId);
  const permissoesQuery = usePermissoesFicha(api, mesaId, personagemId);
  const inventarioQuery = useInventario(api, mesaId, personagemId);
  const efeitosQuery = useEfeitos(api, mesaId, personagemId);
  const valoresQuery = useValoresDerivados(api, mesaId, personagemId);
  const desgasteQuery = useDesgaste(api, mesaId, personagemId);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const salvarCampo = useSalvarCampoFicha(api, mesaId, personagemId, userId);

  if (fichaQuery.isPending) return <p>Carregando ficha…</p>;
  if (fichaQuery.isError) return <p role="alert">{fichaQuery.error.message}</p>;

  const ficha = fichaQuery.data.ficha;
  const versao = fichaQuery.data.versao;
  const permissoes = permissoesQuery.data;
  const info = personagemInfo(ficha);
  const personalidade = personalidadeInfo(ficha);

  async function saveField(path: string, value: string | number): Promise<{ status: "salvo" | "pendente" }> {
    const resultado = await salvarCampo.mutateAsync({ path, value, ficha, versao });
    void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
    return { status: resultado.status };
  }

  async function saveMany(alteracoes: Alteracao[]): Promise<{ status: "salvo" | "pendente" }> {
    const [primeira, ...demais] = alteracoes;
    if (!primeira) return { status: "salvo" };
    const resultado = await salvarCampo.mutateAsync({ path: primeira.path, value: primeira.value, ficha, versao, extras: demais });
    void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
    return { status: resultado.status };
  }

  function navegarAbas(event: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const destinos: Record<string, number> = {
      ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: SECTIONS.length - 1,
    };
    const destino = destinos[event.key];
    if (destino === undefined) return;
    event.preventDefault();
    const proximo = (destino + SECTIONS.length) % SECTIONS.length;
    const alvo = SECTIONS[proximo];
    if (!alvo) return;
    goTo(alvo.id);
    abas.current[proximo]?.focus();
  }

  function bumpVersao(novaVersao: number) {
    queryClient.setQueryData(sheetKeys.ficha(mesaId, personagemId), (old: typeof fichaQuery.data) =>
      old ? { ...old, versao: novaVersao } : old,
    );
  }

  return (
    <div className="screen-content">
      <div className="page-intro">
        <button type="button" className="text-action" onClick={onBack}><Glyph name="arrow" size={14} /> Voltar à mesa</button>
        <span className="eyebrow">FICHA VIVA</span>
        <h1>{info.nome}</h1>
      </div>

      {permissoes && !permissoes.editar && (
        <p className="preview-note" role="note"><Glyph name="eye" size={16} /> Você está vendo esta ficha em modo de leitura.</p>
      )}

      <SheetHeader ficha={ficha} />
      <ActiveStateStrip desgaste={desgasteQuery.data} efeitos={efeitosQuery.data} />

      <div className="sheet-tabs" role="tablist" aria-label="Seções da ficha">
        {SECTIONS.map((section, indice) => (
          <button
            key={section.id}
            ref={(el) => { abas.current[indice] = el; }}
            type="button"
            role="tab"
            id={`aba-${section.id}`}
            aria-controls={`painel-${section.id}`}
            aria-selected={secao === section.id}
            tabIndex={secao === section.id ? 0 : -1}
            onClick={() => goTo(section.id)}
            onKeyDown={(event) => navegarAbas(event, indice)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div hidden={secao !== "informacoes"} role="tabpanel" id="painel-informacoes" aria-labelledby="aba-informacoes" tabIndex={0}>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">IDENTIDADE</span><h2>Informações básicas</h2></div></div>
          <div className="detail-grid">
            <EditableField label="Nome" path="personagem.nome" value={info.nome} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Raça" path="personagem.raca" value={info.raca ?? ""} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Classe" path="personagem.classe" value={info.classe ?? ""} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Arquétipo" path="personagem.arquetipo" value={info.arquetipo ?? ""} permissoes={permissoes} onSave={saveField} />
          </div>
        </section>
      </div>

      <div hidden={secao !== "personalidade"} role="tabpanel" id="painel-personalidade" aria-labelledby="aba-personalidade" tabIndex={0}>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">QUEM É {info.nome.toUpperCase()}</span><h2>Personalidade</h2></div></div>
          <div className="detail-grid">
            <EditableField label="Alinhamento" path="personalidade.alinhamento" value={String(personalidade.alinhamento ?? "")} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Pecado" path="personalidade.pecado" value={String(personalidade.pecado ?? "")} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Lema" path="personalidade.meu_lema" kind="textarea" value={String(personalidade.meu_lema ?? "")} permissoes={permissoes} onSave={saveField} />
          </div>
        </section>
      </div>

      <div hidden={secao !== "atributos"} role="tabpanel" id="painel-atributos" aria-labelledby="aba-atributos" tabIndex={0}>
        {valoresQuery.isPending && <p>Carregando atributos…</p>}
        {valoresQuery.isError && <p role="alert">{valoresQuery.error.message}</p>}
        {valoresQuery.isSuccess && (
          <AttributeTable
            categoria="atributo" eyebrow="BASE MECÂNICA" titulo="Atributos" grupos={GRUPOS_ATRIBUTOS}
            ficha={ficha} valores={valoresQuery.data} permissoes={permissoes} onSave={saveMany}
          />
        )}
      </div>

      <div hidden={secao !== "pericias"} role="tabpanel" id="painel-pericias" aria-labelledby="aba-pericias" tabIndex={0}>
        {valoresQuery.isSuccess && (
          <AttributeTable
            categoria="pericia" eyebrow="ESPECIALIDADES" titulo="Perícias" grupos={GRUPOS_PERICIAS}
            ficha={ficha} valores={valoresQuery.data} permissoes={permissoes} onSave={saveMany}
          />
        )}
      </div>

      <div hidden={secao !== "equipamentos"} role="tabpanel" id="painel-equipamentos" aria-labelledby="aba-equipamentos" tabIndex={0}>
        {inventarioQuery.isPending && <p>Carregando equipamentos…</p>}
        {inventarioQuery.isError && <p role="alert">{inventarioQuery.error.message}</p>}
        {inventarioQuery.isSuccess && (
          <EquippedItemsPanel api={api} mesaId={mesaId} personagemId={personagemId} itens={inventarioQuery.data} versao={versao} permissoes={permissoes} online={online} onVersaoConfirmada={bumpVersao} />
        )}
      </div>

      <div hidden={secao !== "inventario"} role="tabpanel" id="painel-inventario" aria-labelledby="aba-inventario" tabIndex={0}>
        <div className="section-heading"><div /><ImportDialog api={api} mesaId={mesaId} personagemId={personagemId} versao={versao} permissoes={permissoes} onImported={(resultado) => {
          bumpVersao(resultado.versao);
          void queryClient.invalidateQueries({ queryKey: sheetKeys.inventario(mesaId, personagemId) });
          void queryClient.invalidateQueries({ queryKey: sheetKeys.efeitos(mesaId, personagemId) });
          void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
        }} /></div>
        {inventarioQuery.isPending && <p>Carregando inventário…</p>}
        {inventarioQuery.isError && <p role="alert">{inventarioQuery.error.message}</p>}
        {inventarioQuery.isSuccess && (
          <InventoryItemsPanel api={api} mesaId={mesaId} personagemId={personagemId} itens={inventarioQuery.data} versao={versao} permissoes={permissoes} online={online} onVersaoConfirmada={bumpVersao} />
        )}
      </div>

      <div hidden={secao !== "status"} role="tabpanel" id="painel-status" aria-labelledby="aba-status" tabIndex={0}>
        {valoresQuery.isSuccess && (
          <DerivedValueGroup eyebrow="ESTADO" title="Status" valores={valoresQuery.data} grupo="status" emptyMessage="Nenhum status calculado." />
        )}
      </div>

      <div hidden={secao !== "efeitos"} role="tabpanel" id="painel-efeitos" aria-labelledby="aba-efeitos" tabIndex={0}>
        {efeitosQuery.isPending && <p>Carregando efeitos…</p>}
        {efeitosQuery.isError && <p role="alert">{efeitosQuery.error.message}</p>}
        {efeitosQuery.isSuccess && (
          <EffectsPanel
            efeitos={efeitosQuery.data}
            admin={permissoes?.papel === "narrador" ? { api, mesaId, personagemId, versao, onVersaoConfirmada: bumpVersao } : undefined}
          />
        )}
      </div>

      <div hidden={secao !== "cartas"} role="tabpanel" id="painel-cartas" aria-labelledby="aba-cartas" tabIndex={0}>
        {permissoes && (
          <CharacterCardsPanel
            api={api} mesaId={mesaId} personagemId={personagemId} versao={versao}
            papel={permissoes.papel} podeEditar={permissoes.editar}
          />
        )}
        {info.habilidades.length > 0 && (
          <section className="panel legacy-skills" aria-label="Habilidades registradas na ficha antiga">
            <div className="section-heading"><div><span className="eyebrow">REGISTRO DA FICHA ANTIGA</span><h2>Habilidades anotadas</h2></div></div>
            <p className="preview-note">Anotações trazidas da ficha anterior. Não fazem parte do sistema de cartas e serão revisadas na migração de dados.</p>
            <div className="feature-list">
              {info.habilidades.map((habilidade, index) => (
                <div key={index}>
                  <span className="feature-list__icon"><Glyph name="book" size={20} /></span>
                  <div>
                    <strong>{String(habilidade.nome ?? "Sem nome")}</strong>
                    {habilidade.tipo !== undefined && <small>{String(habilidade.tipo)}</small>}
                  </div>
                  {habilidade.dano !== undefined && <b>{String(habilidade.dano)}</b>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

    </div>
  );
}
