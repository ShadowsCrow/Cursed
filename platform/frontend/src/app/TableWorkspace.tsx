import { Link, useSearchParams } from "react-router";
import type { components } from "../api/generated/schema";
import { Glyph, Portrait } from "../ui/Display";
import { routes } from "./routes";
import { permittedTableView, tableNavigation, type TableRole, type TableView } from "./tableNavigation";

type Mesa = components["schemas"]["MesaResumo"];

const pageCopy: Record<TableRole, Record<TableView, { eyebrow: string; title: string; description: string }>> = {
  narrador: {
    overview: { eyebrow: "PAINEL DO NARRADOR", title: "A campanha começa aqui.", description: "Este é o espaço da mesa para acompanhar personagens, decisões e cenas conforme os próximos módulos forem conectados." },
    character: { eyebrow: "PERSONAGENS", title: "O elenco da mesa", description: "A listagem e a administração de personagens serão conectadas à API na etapa de gestão de fichas." },
    activity: { eyebrow: "REGISTRO", title: "História das mudanças", description: "As ações confirmadas aparecerão aqui quando a auditoria da mesa estiver disponível." },
    cards: { eyebrow: "BIBLIOTECA", title: "Cartas da campanha", description: "O catálogo versionado e as ofertas serão adicionados em uma etapa própria." },
    room: { eyebrow: "SALA", title: "Cena compartilhada", description: "A sala em tempo real será ativada quando o módulo de grid estiver implementado para esta mesa." },
  },
  jogador: {
    overview: { eyebrow: "GRUPO", title: "Sua companhia", description: "Os personagens visíveis do grupo aparecerão aqui quando as consultas de ficha estiverem disponíveis." },
    character: { eyebrow: "MINHA FICHA", title: "Seu personagem em foco", description: "As suas fichas e recursos de jogo serão exibidos aqui quando a gestão de personagens estiver conectada." },
    activity: { eyebrow: "REGISTRO", title: "Registro", description: "" },
    cards: { eyebrow: "BIBLIOTECA", title: "Suas cartas", description: "Habilidades, magias e itens autorizados aparecerão aqui quando o catálogo estiver conectado." },
    room: { eyebrow: "SALA", title: "Cena compartilhada", description: "A sala mostrará somente a cena e os elementos revelados ao grupo quando o módulo estiver ativo." },
  },
};

function Navigation({ role, view, onNavigate, mobile = false }: { role: TableRole; view: TableView; onNavigate: (view: TableView) => void; mobile?: boolean }) {
  return <nav aria-label={mobile ? "Navegação móvel da mesa" : "Navegação da mesa"} className={mobile ? "mobile-nav" : "sidebar__nav"}>
    {tableNavigation[role].map((item) => <button key={item.id} type="button" onClick={() => onNavigate(item.id)} aria-current={view === item.id ? "page" : undefined} className={mobile ? (view === item.id ? "mobile-nav__active" : "") : `nav-item ${view === item.id ? "nav-item--active" : ""}`}><Glyph name={item.icon} size={mobile ? 20 : 19} /><span>{item.label}</span>{!mobile && view === item.id && <span className="nav-item__accent" />}</button>)}
  </nav>;
}

export function TableWorkspace({ mesa, onSignOut }: { mesa: Mesa; onSignOut: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = mesa.papel;
  const view = permittedTableView(role, searchParams.get("painel"));
  const copy = pageCopy[role][view];

  function navigate(next: TableView) {
    setSearchParams({ painel: next });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  return <div className="preview-app workspace-app">
    <aside className="sidebar">
      <div className="brand"><span className="brand__mark"><Glyph name="spark" size={24} /></span><div><strong>CURSED</strong><small>PLATAFORMA RPG</small></div></div>
      <div className="sidebar__campaign"><span className="eyebrow">CAMPANHA ATUAL</span><strong>{mesa.nome}</strong><small><Glyph name="shield" size={14} /> {role === "narrador" ? "Você é o Narrador" : "Você é jogador"}</small></div>
      <div className="sidebar__label">MESA</div>
      <Navigation role={role} view={view} onNavigate={navigate} />
      <div className="sidebar__bottom"><Link className="nav-item" to={routes.home()}><Glyph name="grid" size={19} /><span>Trocar de mesa</span></Link><div className="sidebar__edition">ÁREA DA MESA <span>·</span> EM CONSTRUÇÃO</div></div>
    </aside>
    <div className="preview-main">
      <header className="preview-header"><div className="preview-header__title"><span className="eyebrow">{mesa.nome} <span className="header-separator">/</span> {role === "narrador" ? "NARRADOR" : "JOGADOR"}</span><strong>{role === "narrador" ? "Painel do Narrador" : "Painel do Jogador"}</strong></div><div className="preview-header__actions"><span className="workspace-role">Papel nesta mesa: {role === "narrador" ? "Narrador" : "jogador"}</span><Link className="workspace-switch-link" to={routes.home()} aria-label="Trocar de mesa"><Glyph name="grid" size={18} /></Link><button className="button button--ghost workspace-signout" type="button" onClick={onSignOut}>Sair</button><Portrait name={role === "narrador" ? "Narrador" : "Jogador"} hue={role === "narrador" ? "copper" : "violet"} /></div></header>
      <main id="main-content" className="preview-content"><div className="screen-content"><section className={`hero-panel ${role === "jogador" ? "hero-panel--player" : ""}`}><div className="hero-panel__stars" aria-hidden="true" /><div className="hero-panel__copy"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p><div className="hero-panel__actions"><Link className="button button--ghost" to={routes.home()}>Ver minhas mesas <Glyph name="arrow" size={17} /></Link></div></div><div className="hero-panel__sigil" aria-hidden="true"><span>{role === "narrador" ? "✧" : "✦"}</span><div className="hero-panel__sigil-ring" /></div></section><section className="panel panel--wide workspace-status"><div><span className="eyebrow">MESA ATIVA</span><h2>{mesa.nome}</h2><p>O acesso e a navegação refletem seu papel nesta mesa. Os dados de personagens, registro, cartas e sala ainda não são apresentados nesta área.</p></div><span className="workspace-status__pill">{role === "narrador" ? "Narrador" : "Jogador"}</span></section></div></main>
      <footer className="preview-footer"><span>CURSED <span>✦</span> PLATAFORMA RPG</span><span>Área autenticada · {mesa.nome}</span></footer>
    </div>
    <Navigation role={role} view={view} onNavigate={navigate} mobile />
  </div>;
}
