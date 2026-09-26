import type { ReactNode } from "react";
import { Link } from "react-router";

import { Glyph, Portrait } from "../../ui/Display";
import { ConnectivityBadge } from "../connectivity/ConnectivityBadge";
import { routes } from "../routes";
import { tableNavigation, type TableRole, type TableView } from "../tableNavigation";

export interface WorkspaceChromeProps {
  role: TableRole;
  mesaNome: string;
  view: TableView;
  onNavigate: (view: TableView) => void;
  onSignOut: () => void;
  roleLabel: string;
  headerTitle: string;
  headerEyebrow: string;
  headerDescription?: string;
  /** Pendências por visão (ofertas, aprovações), exibidas como contador na navegação. */
  badges?: Partial<Record<TableView, number>>;
  /** Bloco de navegação exclusivo do papel, mostrado abaixo da navegação comum na barra lateral. */
  sidebarExtra?: ReactNode;
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
  view,
  onNavigate,
  onSignOut,
  roleLabel,
  headerTitle,
  headerEyebrow,
  sidebarExtra,
  headerDescription,
  badges,
  children,
}: WorkspaceChromeProps) {
  return (
    <div className={`preview-app workspace-app workspace-app--${role}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand__mark"><Glyph name="spark" size={24} /></span><div><strong>CURSED</strong><small>PLATAFORMA RPG</small></div></div>
        <div className="sidebar__campaign">
          <span className="eyebrow">CAMPANHA ATUAL</span>
          <strong>{mesaNome}</strong>
          <small><Glyph name="shield" size={14} /> {roleLabel}</small>
        </div>
        <div className="sidebar__label">MESA</div>
        <Navigation role={role} view={view} onNavigate={onNavigate} badges={badges} />
        {sidebarExtra}
        <div className="sidebar__bottom">
          <Link className="nav-item" to={routes.home()}><Glyph name="grid" size={19} /><span>Trocar de mesa</span></Link>
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
            <span className="workspace-role">Papel nesta mesa: {role === "narrador" ? "Narrador" : "jogador"}</span>
            <Link className="workspace-switch-link" to={routes.home()} aria-label="Trocar de mesa"><Glyph name="grid" size={18} /></Link>
            <button className="button button--ghost workspace-signout" type="button" onClick={onSignOut}>Sair</button>
            <Portrait name={role === "narrador" ? "Narrador" : "Jogador"} hue={role === "narrador" ? "copper" : "violet"} />
          </div>
        </header>
        <main id="main-content" className="preview-content">
          <div className="screen-content">
            <section className={`hero-panel ${role === "jogador" ? "hero-panel--player" : ""}`}>
              <div className="hero-panel__stars" aria-hidden="true" />
              <div className="hero-panel__copy">
                <span className="eyebrow">{headerEyebrow}</span>
                <h1>{headerTitle}</h1>
                {headerDescription && <p>{headerDescription}</p>}
              </div>
              <div className="hero-panel__sigil" aria-hidden="true"><span>{role === "narrador" ? "✧" : "✦"}</span><div className="hero-panel__sigil-ring" /></div>
            </section>
            {children}
          </div>
        </main>
        <footer className="preview-footer"><span>CURSED <span>✦</span> PLATAFORMA RPG</span><span>Área autenticada · {mesaNome}</span></footer>
      </div>
      <Navigation role={role} view={view} onNavigate={onNavigate} badges={badges} mobile />
    </div>
  );
}
