import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { Glyph } from "../../../ui/Display";
import { CharacterCardsPanel } from "../../cards/CharacterCardsPanel";
import { useConnectivityStatus } from "../../connectivity/useConnectivityStatus";
import type { ApiClient } from "../types";
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
  { id: "habilidades", label: "Habilidades" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "inventario", label: "Inventário" },
  { id: "status", label: "Status" },
  { id: "efeitos", label: "Efeitos" },
  { id: "cartas", label: "Cartas" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
const DEFAULT_SECTION: SectionId = "informacoes";

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
  const secao = isSectionId(secaoParam) ? secaoParam : DEFAULT_SECTION;
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

      <SheetHeader ficha={ficha} />

      <nav className="sheet-tabs" role="tablist" aria-label="Seções da ficha">
        {SECTIONS.map((section) => (
          <button key={section.id} type="button" role="tab" aria-selected={secao === section.id} onClick={() => goTo(section.id)}>
            {section.label}
          </button>
        ))}
      </nav>

      <div hidden={secao !== "informacoes"}>
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

      <div hidden={secao !== "personalidade"}>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">QUEM É {info.nome.toUpperCase()}</span><h2>Personalidade</h2></div></div>
          <div className="detail-grid">
            <EditableField label="Alinhamento" path="personalidade.alinhamento" value={String(personalidade.alinhamento ?? "")} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Pecado" path="personalidade.pecado" value={String(personalidade.pecado ?? "")} permissoes={permissoes} onSave={saveField} />
            <EditableField label="Lema" path="personalidade.meu_lema" kind="textarea" value={String(personalidade.meu_lema ?? "")} permissoes={permissoes} onSave={saveField} />
          </div>
        </section>
      </div>

      <div hidden={secao !== "atributos"}>
        {valoresQuery.isPending && <p>Carregando atributos…</p>}
        {valoresQuery.isError && <p role="alert">{valoresQuery.error.message}</p>}
        {valoresQuery.isSuccess && (
          <AttributeTable
            categoria="atributo" eyebrow="BASE MECÂNICA" titulo="Atributos" grupos={GRUPOS_ATRIBUTOS}
            ficha={ficha} valores={valoresQuery.data} permissoes={permissoes} onSave={saveMany}
          />
        )}
      </div>

      <div hidden={secao !== "pericias"}>
        {valoresQuery.isSuccess && (
          <AttributeTable
            categoria="pericia" eyebrow="ESPECIALIDADES" titulo="Perícias" grupos={GRUPOS_PERICIAS}
            ficha={ficha} valores={valoresQuery.data} permissoes={permissoes} onSave={saveMany}
          />
        )}
      </div>

      <div hidden={secao !== "habilidades"}>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">EM DESTAQUE</span><h2>Habilidades</h2></div></div>
          {info.habilidades.length === 0 ? (
            <p className="preview-note">Nenhuma habilidade registrada.</p>
          ) : (
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
          )}
        </section>
      </div>

      <div hidden={secao !== "equipamentos"}>
        {inventarioQuery.isPending && <p>Carregando equipamentos…</p>}
        {inventarioQuery.isError && <p role="alert">{inventarioQuery.error.message}</p>}
        {inventarioQuery.isSuccess && (
          <EquippedItemsPanel api={api} mesaId={mesaId} personagemId={personagemId} itens={inventarioQuery.data} versao={versao} permissoes={permissoes} online={online} onVersaoConfirmada={bumpVersao} />
        )}
      </div>

      <div hidden={secao !== "inventario"}>
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

      <div hidden={secao !== "status"}>
        {valoresQuery.isSuccess && (
          <DerivedValueGroup eyebrow="ESTADO" title="Status" valores={valoresQuery.data} grupo="status" emptyMessage="Nenhum status calculado." />
        )}
      </div>

      <div hidden={secao !== "efeitos"}>
        {efeitosQuery.isPending && <p>Carregando efeitos…</p>}
        {efeitosQuery.isError && <p role="alert">{efeitosQuery.error.message}</p>}
        {efeitosQuery.isSuccess && (
          <EffectsPanel
            efeitos={efeitosQuery.data}
            admin={permissoes?.papel === "narrador" ? { api, mesaId, personagemId, versao, onVersaoConfirmada: bumpVersao } : undefined}
          />
        )}
      </div>

      <div hidden={secao !== "cartas"}>
        {permissoes && (
          <CharacterCardsPanel
            api={api} mesaId={mesaId} personagemId={personagemId} versao={versao}
            papel={permissoes.papel} podeEditar={permissoes.editar}
          />
        )}
      </div>

      {permissoes && !permissoes.editar && (
        <p className="preview-note"><Glyph name="eye" size={16} /> Você está vendo esta ficha em modo de leitura.</p>
      )}
    </div>
  );
}
