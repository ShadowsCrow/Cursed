import type { components } from "../../api/generated/schema";
import { Glyph } from "../../ui/Display";
import { AuditLog } from "../audit/AuditLog";
import { NarratorLibrary } from "../cards/NarratorLibrary";
import { InviteTools } from "../InviteTools";
import { CharacterList } from "../characters/CharacterList";
import { PublicEntities } from "../characters/PublicEntities";
import { RestDialog } from "../characters/RestDialog";
import type { ApiClient } from "../characters/types";
import type { TableView } from "../tableNavigation";
import { WorkspaceChrome } from "./WorkspaceChrome";

type Mesa = components["schemas"]["MesaResumo"];

const narratorCopy: Record<TableView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "PAINEL DO NARRADOR", title: "A campanha começa aqui.", description: "Este é o espaço da mesa para acompanhar personagens, decisões e cenas conforme os próximos módulos forem conectados." },
  character: { eyebrow: "PERSONAGENS", title: "O elenco da mesa", description: "Crie, abra, transfira e administre os personagens desta mesa, incluindo NPCs e fichas ocultas." },
  activity: { eyebrow: "REGISTRO", title: "História das mudanças", description: "Acompanhe, filtre e corrija as ações confirmadas desta mesa." },
  cards: { eyebrow: "BIBLIOTECA", title: "Cartas da campanha", description: "Crie, publique, ofereça e apresente habilidades, magias, itens e efeitos." },
  room: { eyebrow: "SALA", title: "Cena compartilhada", description: "A sala em tempo real será ativada quando o módulo de grid estiver implementado para esta mesa." },
};

/** Ferramentas exclusivas do Narrador, sempre visíveis na barra lateral, em toda seção da mesa. */
function NarratorToolsPanel({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  return (
    <section className="narrator-aside-nav" aria-label="Ferramentas do Narrador">
      <span className="eyebrow">ATALHOS DO NARRADOR</span>
      <p>Auditoria e ofertas de cartas chegam nas próximas etapas.</p>
      <RestDialog api={api} mesaId={mesaId} />
    </section>
  );
}

export interface NarratorShellProps {
  mesa: Mesa;
  view: TableView;
  onNavigate: (view: TableView) => void;
  onSignOut: () => void;
  api: ApiClient;
  userId: string;
  onOpenCharacter: (personagemId: string) => void;
}

/**
 * Shell do Narrador: além da navegação da mesa, mantém uma coluna de
 * ferramentas exclusivas na barra lateral e, na visão geral, um painel de
 * pendências ao lado do estado da mesa — estrutura que o shell do jogador não tem.
 */
export function NarratorShell({ mesa, view, onNavigate, onSignOut, api, userId, onOpenCharacter }: NarratorShellProps) {
  const copy = narratorCopy[view];
  return (
    <WorkspaceChrome
      role="narrador"
      mesaNome={mesa.nome}
      view={view}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      roleLabel="Você é o Narrador"
      headerTitle={copy.title}
      headerEyebrow={copy.eyebrow}
      headerDescription={copy.description}
      sidebarExtra={<NarratorToolsPanel api={api} mesaId={mesa.id} />}
    >
      {view === "character" ? (
        <CharacterList api={api} mesaId={mesa.id} userId={userId} role="narrador" onOpen={onOpenCharacter} />
      ) : view === "activity" ? (
        <AuditLog api={api} mesaId={mesa.id} role="narrador" />
      ) : view === "cards" ? (
        <NarratorLibrary api={api} mesaId={mesa.id} />
      ) : view === "overview" ? (
        <div className="screen-content">
          <div className="workspace-status-row">
            <section className="panel panel--wide workspace-status">
              <div>
                <span className="eyebrow">MESA ATIVA</span>
                <h2>{mesa.nome}</h2>
                <p>O acesso e a navegação refletem seu papel de Narrador nesta mesa. Cartas e sala ainda não são apresentadas nesta área.</p>
              </div>
              <span className="workspace-status__pill">Narrador</span>
            </section>
            <aside className="panel narrator-aside" aria-label="Fila do Narrador">
              <span className="eyebrow">CONVIDAR JOGADORES</span>
              <h2>Convites</h2>
              <InviteTools api={api} mesaId={mesa.id} />
              <span className="eyebrow">FILA DO NARRADOR</span>
              <h2>Pendências</h2>
              <p className="body-copy">Solicitações de aprovação e ofertas de cartas aparecerão aqui quando as ferramentas do Narrador forem conectadas.</p>
              <div className="narrator-aside__foot"><Glyph name="scroll" size={16} /><span>Somente o Narrador vê este painel.</span></div>
            </aside>
          </div>
          <PublicEntities api={api} mesaId={mesa.id} />
        </div>
      ) : (
        <section className="panel panel--wide workspace-status">
          <div>
            <span className="eyebrow">MESA ATIVA</span>
            <h2>{mesa.nome}</h2>
            <p>O acesso e a navegação refletem seu papel de Narrador nesta mesa. Cartas e sala ainda não são apresentadas nesta área.</p>
          </div>
          <span className="workspace-status__pill">Narrador</span>
        </section>
      )}
    </WorkspaceChrome>
  );
}
