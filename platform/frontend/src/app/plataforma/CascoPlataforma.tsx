import { useId, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router";

import { Menu } from "../../ui/primitives";
import { Avatar, CantoDoSite, Icone } from "../../ui/Ornamentos";
import { EstadoDePagina, Marca } from "../../ui/Tema";
import type { ApiClient } from "../characters/types";
import { routes } from "../routes";
import { useFotoDoPerfil, usePerfil } from "./dados";

const SECOES = [
  { rotulo: "Início", para: routes.home(), fim: true },
  { rotulo: "Campanhas", para: routes.campanhas(), fim: false },
  { rotulo: "Personagens", para: "/personagens", fim: false },
  { rotulo: "Biblioteca", para: routes.biblioteca(), fim: false },
] as const;

export interface CascoProps {
  api: ApiClient;
  userId: string;
  onSignOut: () => void;
}

/**
 * Casco das seções fora da mesa: barra superior (marca, Início, Campanhas, Personagens, Biblioteca,
 * avatar) e o conteúdo da seção. Enquanto o apelido não foi confirmado, leva ao primeiro acesso.
 */
export function CascoPlataforma({ api, userId, onSignOut }: CascoProps) {
  const perfil = usePerfil(api);
  const foto = useFotoDoPerfil(api, userId, Boolean(perfil.data?.tem_foto));
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const idNav = useId();

  if (perfil.isPending) return <EstadoDePagina><p>Carregando seu perfil…</p></EstadoDePagina>;
  if (perfil.isError) {
    return (
      <EstadoDePagina alerta>
        <p>{perfil.error.message}</p>
        <button type="button" className="button" onClick={() => void perfil.refetch()}>Tentar de novo</button>
      </EstadoDePagina>
    );
  }
  if (!perfil.data.confirmado) return <Navigate to={routes.boasVindas()} replace />;

  const apelido = perfil.data.nome_exibido;
  return (
    <div className="plataforma">
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
      <div className="plataforma__moldura" aria-hidden="true">
        <CantoDoSite posicao="se" /><CantoDoSite posicao="sd" /><CantoDoSite posicao="ie" /><CantoDoSite posicao="id" />
      </div>
      <header className="barra-superior">
        <Link to={routes.home()} className="barra-superior__marca" aria-label="Cursed, ir ao Início">
          <Marca tamanho={44} subtitulo={null} />
        </Link>
        <button type="button" className="barra-superior__menu-botao" aria-expanded={menuAberto} aria-controls={idNav}
          onClick={() => setMenuAberto((aberto) => !aberto)}>
          <Icone nome={menuAberto ? "fechar" : "menu"} /> Seções
        </button>
        <nav id={idNav} className="barra-superior__nav" aria-label="Seções da plataforma" data-aberta={menuAberto}>
          <ul>
            {SECOES.map((secao) => (
              <li key={secao.para}>
                <NavLink to={secao.para} end={secao.fim} className="barra-superior__link" onClick={() => setMenuAberto(false)}>{secao.rotulo}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="barra-superior__perfil">
          <Menu
            label={`Conta de ${apelido}`}
            triggerClassName="menu-trigger"
            triggerContent={<>
              <Avatar nome={apelido} src={foto.data} tamanho={40} decorativo />
              <span className="sr-only">Conta de {apelido}</span>
              <span className="barra-superior__apelido" aria-hidden="true">{apelido}</span>
            </>}
            items={[
              { id: "perfil", label: "Meu perfil", onSelect: () => navigate(routes.perfil()) },
              { id: "sair", label: "Sair", onSelect: onSignOut },
            ]}
          />
        </div>
      </header>
      <main id="conteudo" className="plataforma__conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
