import type { components } from "../../api/generated/schema";
import { Glyph } from "../../ui/Display";
import type { TableView } from "../tableNavigation";
import { WorkspaceChrome } from "./WorkspaceChrome";

type Mesa = components["schemas"]["MesaResumo"];

const narratorCopy: Record<TableView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "PAINEL DO NARRADOR", title: "A campanha começa aqui.", description: "Este é o espaço da mesa para acompanhar personagens, decisões e cenas conforme os próximos módulos forem conectados." },
  character: { eyebrow: "PERSONAGENS", title: "O elenco da mesa", description: "A listagem e a administração de personagens serão conectadas à API na etapa de gestão de fichas." },
  activity: { eyebrow: "REGISTRO", title: "História das mudanças", description: "As ações confirmadas aparecerão aqui quando a auditoria da mesa estiver disponível." },
  cards: { eyebrow: "BIBLIOTECA", title: "Cartas da campanha", description: "O catálogo versionado e as ofertas serão adicionados em uma etapa própria." },
  room: { eyebrow: "SALA", title: "Cena compartilhada", description: "A sala em tempo real será ativada quando o módulo de grid estiver implementado para esta mesa." },
};

/** Ferramentas exclusivas do Narrador, sempre visíveis na barra lateral, em toda seção da mesa. */
function NarratorToolsPanel() {
  return (
    <section className="narrator-aside-nav" aria-label="Ferramentas do Narrador">
      <span className="eyebrow">ATALHOS DO NARRADOR</span>
      <p>Auditoria, ofertas de cartas e preparação de descanso chegam nas próximas etapas.</p>
    </section>
  );
}

export interface NarratorShellProps {
  mesa: Mesa;
  view: TableView;
  onNavigate: (view: TableView) => void;
  onSignOut: () => void;
}

/**
 * Shell do Narrador: além da navegação da mesa, mantém uma coluna de
 * ferramentas exclusivas na barra lateral e, na visão geral, um painel de
 * pendências ao lado do estado da mesa — estrutura que o shell do jogador não tem.
 */
export function NarratorShell({ mesa, view, onNavigate, onSignOut }: NarratorShellProps) {
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
      sidebarExtra={<NarratorToolsPanel />}
    >
      <div className="workspace-status-row">
        <section className="panel panel--wide workspace-status">
          <div>
            <span className="eyebrow">MESA ATIVA</span>
            <h2>{mesa.nome}</h2>
            <p>O acesso e a navegação refletem seu papel de Narrador nesta mesa. Personagens, registro, cartas e sala ainda não são apresentados nesta área.</p>
          </div>
          <span className="workspace-status__pill">Narrador</span>
        </section>
        <aside className="panel narrator-aside" aria-label="Fila do Narrador">
          <span className="eyebrow">FILA DO NARRADOR</span>
          <h2>Pendências</h2>
          <p className="body-copy">Solicitações de aprovação, pedidos de descanso e ofertas de cartas aparecerão aqui quando as ferramentas do Narrador forem conectadas.</p>
          <div className="narrator-aside__foot"><Glyph name="scroll" size={16} /><span>Somente o Narrador vê este painel.</span></div>
        </aside>
      </div>
    </WorkspaceChrome>
  );
}
