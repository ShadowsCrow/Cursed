import type { ReactNode } from "react";
import { Link } from "react-router";

import { Glyph, Portrait } from "../../ui/Display";
import { CabecalhoIlustrado } from "../../ui/Arte";
import { Marca, Selo, TituloOrnado } from "../../ui/Tema";
import { ConnectivityBadge } from "../connectivity/ConnectivityBadge";
import { routes } from "../routes";
import { tableNavigation, type TableRole, type TableView } from "../tableNavigation";
import { useBarraRecolhida } from "./usePreferenciaLocal";

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
  /** Palco: a seção ocupa toda a área abaixo da barra superior, sem cabeçalho ilustrado nem rodapé (a Sala). */
  palco?: boolean;
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
          data-dica={mobile ? undefined : item.label}
        >
          <Glyph name={item.icon} size={mobile ? 20 : 19} />
          <span className={mobile ? undefined : "nav-item__rotulo"}>{item.label}</span>
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
  palco = false,
  children,
}: WorkspaceChromeProps) {
  const voltar = mesaId ? routes.campanha(mesaId) : routes.campanhas();
  const [recolhida, setRecolhida] = useBarraRecolhida();
  const classes = ["preview-app", "workspace-app", `workspace-app--${role}`,
    recolhida && "workspace-app--barra-recolhida", palco && "workspace-app--palco"].filter(Boolean).join(" ");
  const acaoBarra = recolhida ? "Expandir barra lateral" : "Recolher barra lateral";
  return (
    <div className={classes}>
      <aside className="sidebar" id="barra-lateral-mesa">
        <div className="brand">
          <Marca tamanho={44} compacta={recolhida} />
          <button type="button" className="sidebar__alternar" aria-expanded={!recolhida} aria-controls="barra-lateral-mesa"
            aria-label={acaoBarra} title={acaoBarra} onClick={() => setRecolhida(!recolhida)}>
            <Glyph name="chevron" size={18} />
          </button>
        </div>
        <div className="sidebar__campaign" hidden={recolhida}>
          <span className="eyebrow">CAMPANHA ATUAL</span>
          <strong>{mesaNome}</strong>
          <Selo tom={role === "narrador" ? "sangue" : "ouro"}>{roleLabel}</Selo>
        </div>
        <div className="sidebar__label" hidden={recolhida}>MESA</div>
        <Navigation role={role} view={view} onNavigate={onNavigate} badges={badges} />
        {sidebarExtra && <div className="sidebar__extra" hidden={recolhida}>{sidebarExtra}</div>}
        <div className="sidebar__bottom">
          <Link className="nav-item" to={voltar} data-dica="Campanhas"><Glyph name="grid" size={19} /><span className="nav-item__rotulo">Campanhas</span></Link>
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
        {palco ? (
          <main id="main-content" className="preview-content preview-content--palco">{children}</main>
        ) : (
          <>
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
          </>
        )}
      </div>
      <Navigation role={role} view={view} onNavigate={onNavigate} badges={badges} mobile />
    </div>
  );
}
