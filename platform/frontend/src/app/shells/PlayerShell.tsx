import type { ReactNode } from "react";
import type { components } from "../../api/generated/schema";
import { Portrait } from "../../ui/Display";
import { AuditLog } from "../audit/AuditLog";
import { contarOfertasPendentes, useOfertas } from "../cards/api";
import { PlayerLibrary, PresentationOverlay } from "../cards/PlayerLibrary";
import { CharacterList } from "../characters/CharacterList";
import { PublicEntities } from "../characters/PublicEntities";
import type { ApiClient } from "../characters/types";
import type { TableView } from "../tableNavigation";
import { RoomView } from "../room/RoomView";
import type { RealtimeSession } from "../room/RoomPresence";
import { WorkspaceChrome } from "./WorkspaceChrome";

type Mesa = components["schemas"]["MesaResumo"];

const playerCopy: Record<TableView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "GRUPO", title: "Sua companhia", description: "Os personagens visíveis do grupo aparecerão aqui quando as consultas de ficha estiverem disponíveis." },
  character: { eyebrow: "MINHA FICHA", title: "Seu personagem em foco", description: "Abra, crie ou exclua suas fichas conforme a política definida pelo Narrador desta mesa." },
  activity: { eyebrow: "REGISTRO", title: "Registro", description: "As ações que dizem respeito a você e ao grupo, na ordem em que aconteceram." },
  cards: { eyebrow: "BIBLIOTECA", title: "Suas cartas", description: "Ofertas do Narrador aguardando sua escolha." },
  room: { eyebrow: "SALA", title: "Cena compartilhada", description: "A sala mostrará somente a cena e os elementos revelados ao grupo quando o módulo estiver ativo." },
};

/** Cartão do próprio personagem, exclusivo do jogador, sempre visível na barra lateral. */
function PlayerSnapshotPanel() {
  return (
    <section className="player-aside-nav" aria-label="Seu personagem">
      <span className="eyebrow">SEU PERSONAGEM</span>
      <div className="player-aside-nav__identity">
        <Portrait name="Jogador" hue="violet" />
        <p>Seus recursos aparecerão aqui quando a ficha estiver conectada.</p>
      </div>
    </section>
  );
}

export interface PlayerShellProps {
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
 * Shell do jogador: layout de uma só coluna focado no próprio personagem, com
 * um cartão exclusivo de "seu personagem" na barra lateral — sem a fila de
 * pendências nem os atalhos que só fazem sentido para o Narrador.
 */
export function PlayerShell({ mesa, view, onNavigate, onSignOut, api, userId, onOpenCharacter, roomPresence, realtime }: PlayerShellProps) {
  const copy = playerCopy[view];
  const ofertas = useOfertas(api, mesa.id);
  return (
    <WorkspaceChrome
      badges={{ cards: contarOfertasPendentes(ofertas.data) }}
      role="jogador"
      mesaNome={mesa.nome}
      view={view}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      roleLabel="Você é jogador"
      headerTitle={copy.title}
      headerEyebrow={copy.eyebrow}
      headerDescription={copy.description}
      roomPresence={roomPresence}
      sidebarExtra={<PlayerSnapshotPanel />}
    >
      {view === "character" ? (
        <CharacterList api={api} mesaId={mesa.id} userId={userId} role="jogador" onOpen={onOpenCharacter} />
      ) : view === "activity" ? (
        <AuditLog api={api} mesaId={mesa.id} role="jogador" />
      ) : view === "cards" ? (
        <PlayerLibrary api={api} mesaId={mesa.id} />
      ) : view === "room" ? (
        <RoomView api={api} mesaId={mesa.id} userId={userId} realtime={realtime} narrator={false} />
      ) : view === "overview" ? (
        <div className="screen-content">
          <section className="panel panel--wide workspace-status">
            <div>
              <span className="eyebrow">MESA ATIVA</span>
              <h2>{mesa.nome}</h2>
              <p>O acesso e a navegação refletem seu papel de jogador nesta mesa. Cartas e sala ainda não são apresentadas nesta área.</p>
            </div>
            <span className="workspace-status__pill">Jogador</span>
          </section>
          <PublicEntities api={api} mesaId={mesa.id} />
        </div>
      ) : (
        <section className="panel panel--wide workspace-status">
          <div>
            <span className="eyebrow">MESA ATIVA</span>
            <h2>{mesa.nome}</h2>
            <p>O acesso e a navegação refletem seu papel de jogador nesta mesa. Cartas e sala ainda não são apresentadas nesta área.</p>
          </div>
          <span className="workspace-status__pill">Jogador</span>
        </section>
      )}
      <PresentationOverlay api={api} mesaId={mesa.id} />
    </WorkspaceChrome>
  );
}
