import type { ReactNode } from "react";
import { Link } from "react-router";

import { Glyph, Portrait } from "../../ui/Display";
import { CabecalhoIlustrado } from "../../ui/Arte";
import { Marca, Selo, TituloOrnado } from "../../ui/Tema";
import { ConnectivityBadge } from "../connectivity/ConnectivityBadge";
import { routes } from "../routes";
import { tableNavigation, type TableRole, type TableView } from "../tableNavigation";

export interface WorkspaceChromeProps {
  role: TableRole;
  mesaNome: string;
  /** Mesa atual: o caminho de volta abre a campanha selecionada em Campanhas. */
  mesaId?: string;
  view: TableView;
  onNavigate: (view: TableView) => void;
  onSignOut: () => void;
  roleLabel: string;
  headerTitle: string;
  headerEyebrow: string;
  headerDescription?: string;
  roomPresence?: ReactNode;
  /** Pendências por visão (ofertas, aprovações), exibidas como contador na navegação. */
  badges?: Partial<Record<TableView, number>>;
  /** Bloco de navegação exclusivo do papel, mostrado abaixo da navegação comum na barra lateral. */
  sidebarExtra?: ReactNode;
  /** Substitui o painel de abertura padrão (ex.: cabeçalho ilustrado do assistente de criação). */
  hero?: ReactNode;
  children: ReactNode;
}

function Navigation({ role, view, onNavigate, badges = {}, mobile = false }: { role: TableRole; view: TableView; onNavigate: (view: TableView) => void; badges?: Partial<Record<TableView, number>>; mobile?: boolean }) {
  return (
    <nav aria-label={mobile ? "Navegação móvel da mesa" : "Navegação da mesa"} className={mobile ? "mobile-nav" : "sidebar__nav"}>
      {tableNavigation[role].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          aria-current={view === item.id ? "page" : undefined}
          className={mobile ? (view === item.id ? "mobile-nav__active" : "") : `nav-item ${view === item.id ? "nav-item--active" : ""}`}
        >
          <Glyph name={item.icon} size={mobile ? 20 : 19} />
          <span>{item.label}</span>
          {(badges[item.id] ?? 0) > 0 && (
            <>
              <span className="nav-badge" aria-hidden="true">{badges[item.id]}</span>
              <span className="sr-only">, {badges[item.id]} pendente(s)</span>
            </>
          )}
          {!mobile && view === item.id && <span className="nav-item__accent" />}
        </button>
      ))}
    </nav>
  );
}

/**
 * Estrutura comum às duas experiências da mesa (barra lateral, cabeçalho, navegação
 * móvel e rodapé), reaproveitada por `NarratorShell` e `PlayerShell` — que compõem
 * conteúdo e navegação lateral exclusivos por papel através de `sidebarExtra` e `children`.
 */
export function WorkspaceChrome({
  role,
  mesaNome,
  mesaId,
  view,
  onNavigate,
  onSignOut,
  roleLabel,
  headerTitle,
  headerEyebrow,
  sidebarExtra,
  headerDescription,
  roomPresence,
  badges,
  hero,
  children,
}: WorkspaceChromeProps) {
  const voltar = mesaId ? routes.campanha(mesaId) : routes.campanhas();
  return (
    <div className={`preview-app workspace-app workspace-app--${role}`}>
      <aside className="sidebar">
        <div className="brand"><Marca tamanho={44} /></div>
        <div className="sidebar__campaign">
          <span className="eyebrow">CAMPANHA ATUAL</span>
          <strong>{mesaNome}</strong>
          <Selo tom={role === "narrador" ? "sangue" : "ouro"}>{roleLabel}</Selo>
        </div>
        <div className="sidebar__label">MESA</div>
        <Navigation role={role} view={view} onNavigate={onNavigate} badges={badges} />
        {sidebarExtra}
        <div className="sidebar__bottom">
          <Link className="nav-item" to={voltar}><Glyph name="grid" size={19} /><span>Campanhas</span></Link>
        </div>
      </aside>
      <div className="preview-main">
        <header className="preview-header">
          <div className="preview-header__title">
            <span className="eyebrow">{mesaNome} <span className="header-separator">/</span> {role === "narrador" ? "NARRADOR" : "JOGADOR"}</span>
            <strong>{headerTitle}</strong>
          </div>
          <div className="preview-header__actions">
            <ConnectivityBadge />
            {roomPresence}
            <span className="workspace-role">Papel nesta mesa: {role === "narrador" ? "Narrador" : "jogador"}</span>
            <Link className="workspace-switch-link" to={voltar} aria-label="Voltar às campanhas"><Glyph name="grid" size={18} /></Link>
            <button className="button button--ghost workspace-signout" type="button" onClick={onSignOut}>Sair</button>
            <Portrait name={role === "narrador" ? "Narrador" : "Jogador"} hue={role === "narrador" ? "copper" : "violet"} />
          </div>
        </header>
        <main id="main-content" className="preview-content">
          <div className="screen-content">
            {hero ?? (
              <CabecalhoIlustrado className={`hero-panel--tema ${role === "jogador" ? "hero-panel--player" : ""}`.trim()}>
                <TituloOrnado nivel={1} sobretitulo={headerEyebrow}>{headerTitle}</TituloOrnado>
                {headerDescription && <p>{headerDescription}</p>}
              </CabecalhoIlustrado>
            )}
            {children}
          </div>
        </main>
        <footer className="preview-footer"><span>CURSED <span>✦</span> PLATAFORMA RPG</span><span>Área autenticada · {mesaNome}</span></footer>
      </div>
      <Navigation role={role} view={view} onNavigate={onNavigate} badges={badges} mobile />
    </div>
  );
}
