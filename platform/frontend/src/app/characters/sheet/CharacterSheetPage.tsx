import { useEffect, useRef, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { Glyph } from "../../../ui/Display";
import { useCartasDoPersonagem } from "../../cards/api";
import { CartasFicha } from "./cartas/CartasFicha";
import { useConnectivityStatus } from "../../connectivity/useConnectivityStatus";
import type { ApiClient } from "../types";
import { ActiveStateStrip } from "./ActiveStateStrip";
import type { Alteracao } from "./useEdicaoEmLote";
import { AtributosFicha } from "./atributos/AtributosFicha";
import { DerivedValueGroup } from "./DerivedValueGroup";
import { ConsequencesPanel } from "./ConsequencesPanel";
import { EffectsPanel } from "./EffectsPanel";
import { campoEditavel } from "../fieldPolicy";
import { useClasses, useListasFicha, useRacas } from "./catalogoApi";
import { personagemInfo } from "./fichaAccess";
import { IdentityPanel } from "./IdentityPanel";
import { IconeSecao, MolduraSecao } from "./MolduraSecao";
import { PersonalityPanel } from "./PersonalityPanel";
import { PericiasFicha } from "./pericias/PericiasFicha";
import type { AlteracaoCampo } from "./SelectField";
import { ImportDialog } from "./ImportDialog";
import { EquippedItemsPanel } from "./InventoryPanel";
import { InventoryGridPanel } from "./InventoryGridPanel";
import {
  sheetKeys,
  useConsequencias,
  useEfeitos,
  useDesgaste,
  useFichaSnapshot,
  useInventario,
  usePermissoesFicha,
  useSalvarCampoFicha,
  useValoresDerivados,
} from "./sheetApi";
import { ResumoFicha } from "./resumo/ResumoFicha";
import { SheetHeader } from "./SheetHeader";
import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS } from "./sheetCatalog";

const SECTIONS = [
  { id: "resumo", label: "Resumo" },
  { id: "informacoes", label: "Informações básicas" },
  { id: "personalidade", label: "Personalidade" },
  { id: "atributos", label: "Atributos" },
  { id: "pericias", label: "Perícias" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "inventario", label: "Inventário" },
  { id: "status", label: "Status" },
  { id: "efeitos", label: "Efeitos" },
  { id: "cartas", label: "Cartas" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
/** O Resumo abre a ficha; links com `?secao=` continuam abrindo a seção pedida. */
const DEFAULT_SECTION: SectionId = "resumo";

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
  const consequenciasQuery = useConsequencias(api, mesaId, personagemId);
  // Na página, e não só no painel de cartas: o Resumo e o painel dividem a mesma consulta.
  const cartasQuery = useCartasDoPersonagem(api, mesaId, personagemId);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const barraAbas = useRef<HTMLDivElement | null>(null);
  // A barra rola dentro de si quando as abas não cabem: a aba ativa é trazida à vista.
  useEffect(() => {
    const indice = SECTIONS.findIndex((s) => s.id === secao);
    const aba = abas.current[indice];
    const barra = barraAbas.current;
    if (!aba || !barra || barra.scrollWidth <= barra.clientWidth) return;
    aba.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    // As abas só existem depois que a ficha carrega: a aba pedida pela URL também é trazida à vista.
  }, [secao, fichaQuery.isSuccess]);
  const salvarCampo = useSalvarCampoFicha(api, mesaId, personagemId, userId);
  const classesQuery = useClasses(api, mesaId);
  const racasQuery = useRacas(api, mesaId);
  const listasQuery = useListasFicha(api, mesaId);

  if (fichaQuery.isPending) return <p>Carregando ficha…</p>;
  if (fichaQuery.isError) return <p role="alert">{fichaQuery.error.message}</p>;

  const ficha = fichaQuery.data.ficha;
  const versao = fichaQuery.data.versao;
  const permissoes = permissoesQuery.data;
  const info = personagemInfo(ficha);
  const avisos = Object.fromEntries((fichaQuery.data.avisos ?? []).map((a) => [a.campo, a.mensagem]));
  const narrador = permissoes?.papel === "narrador";

  async function saveCampos(alteracoes: AlteracaoCampo[]): Promise<{ status: "salvo" | "pendente" }> {
    const [primeira, ...demais] = alteracoes;
    if (!primeira) return { status: "salvo" };
    const resultado = await salvarCampo.mutateAsync({ path: primeira.path, value: primeira.value, ficha, versao, extras: demais });
    // Classe, nível e atributos mudam PV/PP; a troca de classe muda as cartas concedidas.
    void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
    void queryClient.invalidateQueries({ queryKey: ["cartas-personagem", mesaId, personagemId] });
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
        <button type="button" className="text-action" onClick={onBack}><span className="glyph-back"><Glyph name="arrow" size={14} /></span> Voltar à mesa</button>
        <span className="eyebrow">FICHA VIVA</span>
      </div>

      {searchParams.get("novo") === "1" && (
        <div className="aviso-criado" role="status">
          <p>
            <strong>{info.nome} foi criado no nível 1.</strong>{" "}
            {campoEditavel("personagem.imagem_ativo", permissoes)
              ? "Quer dar um rosto a ele? Envie uma ilustração de corpo inteiro pelo botão abaixo da imagem do Resumo."
              : "Vantagens e Desvantagens, equipamento e Acessos são combinados com o Narrador."}
          </p>
          <button type="button" className="button button--ghost" onClick={() => {
            const semAviso = new URLSearchParams(searchParams);
            semAviso.delete("novo");
            setSearchParams(semAviso, { replace: true });
          }}>Dispensar</button>
        </div>
      )}

      {permissoes && !permissoes.editar && (
        <p className="preview-note" role="note"><Glyph name="eye" size={16} /> Você está vendo esta ficha em modo de leitura.</p>
      )}

      {/* O Resumo já traz imagem, identidade e recursos: o cabeçalho aparece nas demais seções. */}
      {secao !== "resumo" && <SheetHeader
        ficha={ficha} api={api} mesaId={mesaId} classes={classesQuery.data}
        envioRetrato={campoEditavel("personagem.imagem_ativo", permissoes) ? {
          personagemId, versao,
          onConcluido: () => { void queryClient.invalidateQueries({ queryKey: sheetKeys.ficha(mesaId, personagemId) }); },
        } : undefined}
        recursos={{
          valores: valoresQuery.data,
          avisoNivel: avisos["personagem.nivel"]?.includes("migração") ? avisos["personagem.nivel"] : undefined,
          ajuste: narrador ? {
            api, mesaId, personagemId, versao,
            onAjustado: () => {
              void queryClient.invalidateQueries({ queryKey: sheetKeys.ficha(mesaId, personagemId) });
              void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
            },
          } : undefined,
          onConfirmarNivel: narrador ? () => saveCampos([{ path: "personagem.nivel_pela_migracao", value: false }]) : undefined,
        }}
      />}
      <ActiveStateStrip
        desgaste={desgasteQuery.data} efeitos={efeitosQuery.data} consequencias={consequenciasQuery.data} api={api} mesaId={mesaId}
        controles={permissoes ? {
          api, mesaId, personagemId, versao, consequencias: consequenciasQuery.data ?? [],
          narrador, esforco: permissoes.editar,
        } : undefined}
      />

      <div className="sheet-tabs" role="tablist" aria-label="Seções da ficha" ref={barraAbas}>
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
            <IconeSecao nome={section.id} />
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      <div hidden={secao !== "resumo"} role="tabpanel" className="ficha-secao ficha-secao--resumo" id="painel-resumo" aria-labelledby="aba-resumo" tabIndex={0}>
        {valoresQuery.isPending && <p>Carregando resumo…</p>}
        {valoresQuery.isError && <p role="alert">{valoresQuery.error.message}</p>}
        {valoresQuery.isSuccess && (
          <ResumoFicha
            api={api} mesaId={mesaId} personagemId={personagemId} ficha={ficha} versao={versao}
            valores={valoresQuery.data} inventario={inventarioQuery.data ?? []} cartas={cartasQuery.data ?? []}
            listas={listasQuery.data} classes={classesQuery.data} permissoes={permissoes}
            onAbrir={goTo}
            onIlustracaoAlterada={() => { void queryClient.invalidateQueries({ queryKey: sheetKeys.ficha(mesaId, personagemId) }); }}
          />
        )}
      </div>

      <div hidden={secao !== "informacoes"} role="tabpanel" className="ficha-secao ficha-secao--moldura" id="painel-informacoes" aria-labelledby="aba-informacoes" tabIndex={0}>
        {/* Folha própria, a do Resumo, no lugar da moldura comum (redesenhar-informacoes-basicas, D1). */}
        <IdentityPanel ficha={ficha} permissoes={permissoes} classes={classesQuery.data ?? []} racas={racasQuery.data ?? []}
          listas={listasQuery.data} avisos={avisos} onSave={saveCampos} />
      </div>

      <div hidden={secao !== "personalidade"} role="tabpanel" className="ficha-secao ficha-secao--moldura" id="painel-personalidade" aria-labelledby="aba-personalidade" tabIndex={0}>
        {/* Folha própria, cópia fiel da referência, no lugar da moldura comum (reformular-personalidade-da-ficha, D1). */}
        <PersonalityPanel nome={info.nome} ficha={ficha} permissoes={permissoes} listas={listasQuery.data}
          avisos={avisos} onSave={saveCampos} />
      </div>

      <div hidden={secao !== "atributos"} role="tabpanel" className="ficha-secao ficha-secao--atributos" id="painel-atributos" aria-labelledby="aba-atributos" tabIndex={0}>
        {valoresQuery.isPending && <p>Carregando atributos…</p>}
        {valoresQuery.isError && <p role="alert">{valoresQuery.error.message}</p>}
        {valoresQuery.isSuccess && (
          <AtributosFicha
            grupos={GRUPOS_ATRIBUTOS} ficha={ficha} valores={valoresQuery.data} permissoes={permissoes} onSave={saveMany}
            aplicarLimites={fichaQuery.data.tipo === "personagem"}
          />
        )}
      </div>

      <div hidden={secao !== "pericias"} role="tabpanel" className="ficha-secao ficha-secao--pericias" id="painel-pericias" aria-labelledby="aba-pericias" tabIndex={0}>
        {valoresQuery.isPending && <p>Carregando perícias…</p>}
        {valoresQuery.isError && <p role="alert">{valoresQuery.error.message}</p>}
        {valoresQuery.isSuccess && (
          <PericiasFicha
            grupos={GRUPOS_PERICIAS} ficha={ficha} valores={valoresQuery.data} permissoes={permissoes} onSave={saveMany}
            aplicarLimites={fichaQuery.data.tipo === "personagem"}
          />
        )}
      </div>

      <div hidden={secao !== "equipamentos"} role="tabpanel" className="ficha-secao ficha-secao--moldura" id="painel-equipamentos" aria-labelledby="aba-equipamentos" tabIndex={0}>
        <MolduraSecao nome="equipamentos" titulo="Equipamentos" subtitulo="O que está vestido e empunhado agora.">
          {inventarioQuery.isPending && <p>Carregando equipamentos…</p>}
          {inventarioQuery.isError && <p role="alert">{inventarioQuery.error.message}</p>}
          {inventarioQuery.isSuccess && (
            <EquippedItemsPanel api={api} mesaId={mesaId} personagemId={personagemId} itens={inventarioQuery.data} versao={versao} permissoes={permissoes} online={online} onVersaoConfirmada={bumpVersao} />
          )}
        </MolduraSecao>
      </div>

      <div hidden={secao !== "inventario"} role="tabpanel" className="ficha-secao ficha-secao--moldura" id="painel-inventario" aria-labelledby="aba-inventario" tabIndex={0}>
        <InventoryGridPanel api={api} mesaId={mesaId} personagemId={personagemId} permissoes={permissoes} versao={versao} online={online}
          onVersaoConfirmada={bumpVersao} efeitos={efeitosQuery.data}
          ferramentas={<ImportDialog api={api} mesaId={mesaId} personagemId={personagemId} versao={versao} permissoes={permissoes} onImported={(resultado) => {
            bumpVersao(resultado.versao);
            void queryClient.invalidateQueries({ queryKey: sheetKeys.inventario(mesaId, personagemId) });
            void queryClient.invalidateQueries({ queryKey: sheetKeys.grade(mesaId, personagemId) });
            void queryClient.invalidateQueries({ queryKey: sheetKeys.efeitos(mesaId, personagemId) });
            void queryClient.invalidateQueries({ queryKey: sheetKeys.valoresDerivados(mesaId, personagemId) });
          }} />} />
      </div>

      <div hidden={secao !== "status"} role="tabpanel" className="ficha-secao ficha-secao--moldura" id="painel-status" aria-labelledby="aba-status" tabIndex={0}>
        <MolduraSecao nome="status" titulo="Status" subtitulo="Recursos e valores calculados pelas regras.">
          {valoresQuery.isSuccess && (
            <>
              <DerivedValueGroup eyebrow="REGRAS DA CLASSE" title="Recursos" valores={valoresQuery.data} grupo="recurso" emptyMessage="Nenhum recurso calculado." />
              <DerivedValueGroup eyebrow="ESTADO" title="Status" valores={valoresQuery.data} grupo="status" emptyMessage="Nenhum status calculado." />
            </>
          )}
        </MolduraSecao>
      </div>

      <div hidden={secao !== "efeitos"} role="tabpanel" className="ficha-secao ficha-secao--moldura" id="painel-efeitos" aria-labelledby="aba-efeitos" tabIndex={0}>
        <MolduraSecao nome="efeitos" titulo="Efeitos" subtitulo="Condições, efeitos e consequências em curso.">
          {efeitosQuery.isPending && <p>Carregando efeitos…</p>}
          {efeitosQuery.isError && <p role="alert">{efeitosQuery.error.message}</p>}
          {efeitosQuery.isSuccess && (
            <EffectsPanel
              efeitos={efeitosQuery.data} api={api} mesaId={mesaId} semTitulo
              admin={permissoes?.papel === "narrador" || permissoes?.editar
                ? { api, mesaId, personagemId, versao, onVersaoConfirmada: bumpVersao, papel: narrador ? "narrador" : "jogador" }
                : undefined}
            />
          )}
          {consequenciasQuery.isError && <p role="alert">{consequenciasQuery.error.message}</p>}
          {consequenciasQuery.isSuccess && (
            <ConsequencesPanel consequencias={consequenciasQuery.data}
              admin={narrador ? { api, mesaId, personagemId, versao } : undefined} />
          )}
        </MolduraSecao>
      </div>

      <div hidden={secao !== "cartas"} role="tabpanel" className="ficha-secao ficha-secao--cartas" id="painel-cartas" aria-labelledby="aba-cartas" tabIndex={0}>
        {permissoes && (
          <CartasFicha
            key={personagemId} api={api} mesaId={mesaId} personagemId={personagemId} versao={versao}
            papel={permissoes.papel} podeEditar={permissoes.editar} habilidadesLegadas={info.habilidades}
          />
        )}
      </div>

    </div>
  );
}
