import type { ReactNode } from "react";
import type { components } from "../../api/generated/schema";
import { Glyph } from "../../ui/Display";
import { AuditLog } from "../audit/AuditLog";
import { NarratorLibrary } from "../cards/NarratorLibrary";
import { InviteTools } from "../InviteTools";
import { CoinStackSetting } from "../inventory/CoinStackSetting";
import { CharacterList } from "../characters/CharacterList";
import { useSolicitacoes } from "../characters/api";
import { PendingRequests } from "../characters/PendingRequests";
import { PublicEntities } from "../characters/PublicEntities";
import { RestDialog } from "../characters/RestDialog";
import type { ApiClient } from "../characters/types";
import type { TableView } from "../tableNavigation";
import { RoomView } from "../room/RoomView";
import type { RealtimeSession } from "../room/RoomPresence";
import { WorkspaceChrome } from "./WorkspaceChrome";

type Mesa = components["schemas"]["MesaResumo"];

const narratorCopy: Record<TableView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "PAINEL DO NARRADOR", title: "A mesa em um relance", description: "Convide jogadores, decida pendências e veja quem está em cena." },
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
  roomPresence?: ReactNode;
  realtime?: RealtimeSession;
}

/**
 * Shell do Narrador: além da navegação da mesa, mantém uma coluna de
 * ferramentas exclusivas na barra lateral e, na visão geral, um painel de
 * pendências ao lado do estado da mesa — estrutura que o shell do jogador não tem.
 */
export function NarratorShell({ mesa, view, onNavigate, onSignOut, api, userId, onOpenCharacter, roomPresence, realtime }: NarratorShellProps) {
  const copy = narratorCopy[view];
  const solicitacoes = useSolicitacoes(api, mesa.id);
  return (
    <WorkspaceChrome
      badges={{ overview: solicitacoes.data?.length ?? 0 }}
      role="narrador"
      mesaNome={mesa.nome}
      view={view}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      roleLabel="Você é o Narrador"
      headerTitle={copy.title}
      headerEyebrow={copy.eyebrow}
      headerDescription={copy.description}
      roomPresence={roomPresence}
      sidebarExtra={<NarratorToolsPanel api={api} mesaId={mesa.id} />}
    >
      {view === "character" ? (
        <CharacterList api={api} mesaId={mesa.id} userId={userId} role="narrador" onOpen={onOpenCharacter} />
      ) : view === "activity" ? (
        <AuditLog api={api} mesaId={mesa.id} role="narrador" />
      ) : view === "cards" ? (
        <NarratorLibrary api={api} mesaId={mesa.id} />
      ) : view === "room" ? (
        <RoomView api={api} mesaId={mesa.id} userId={userId} realtime={realtime} narrator />
      ) : view === "overview" ? (
        <div className="screen-content">
          <div className="workspace-status-row">
            <PublicEntities api={api} mesaId={mesa.id} />
            <aside className="panel narrator-aside" aria-label="Fila do Narrador">
              <div className="so-celular">
                <span className="eyebrow">DESCANSO DO GRUPO</span>
                <RestDialog api={api} mesaId={mesa.id} />
              </div>
              <span className="eyebrow">CONVIDAR JOGADORES</span>
              <h2>Convites</h2>
              <InviteTools api={api} mesaId={mesa.id} />
              <span className="eyebrow">CONFIGURAÇÕES DA CAMPANHA</span>
              <h2>Regras da campanha</h2>
              <p className="preview-note">Números que cada campanha ajusta, sem mudar o livro de regras.</p>
              <CoinStackSetting api={api} mesaId={mesa.id} />
              <span className="eyebrow">FILA DO NARRADOR</span>
              <h2>Pendências</h2>
              <PendingRequests api={api} mesaId={mesa.id} />
              <div className="narrator-aside__foot"><Glyph name="scroll" size={16} /><span>Somente o Narrador vê este painel.</span></div>
            </aside>
          </div>
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
