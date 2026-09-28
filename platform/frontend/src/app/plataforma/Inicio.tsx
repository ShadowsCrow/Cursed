import { useState } from "react";
import { Link } from "react-router";

import { ARTE } from "../../ui/Arte";
import { FaixaDeAbertura, Icone, MolduraOrnamentada, type NomeIcone } from "../../ui/Ornamentos";
import type { ApiClient } from "../characters/types";
import { routes } from "../routes";
import { DialogoCriarCampanha } from "./campanhas/DialogoCriarCampanha";

const ATALHOS: { para: string; icone: NomeIcone; titulo: string; descricao: string }[] = [
  { para: routes.campanhas(), icone: "pessoas", titulo: "Campanhas", descricao: "Narre e jogue suas histórias" },
  { para: routes.personagens(), icone: "busto", titulo: "Personagens", descricao: "Heróis, NPCs e monstros" },
  { para: routes.biblioteca(), icone: "livro", titulo: "Biblioteca", descricao: "Visão geral e regras do Cursed" },
];

/**
 * Início: abertura de ponta a ponta sob a barra superior, com "Criar campanha" e "Gestão de mesas",
 * e os atalhos em quadros sobrepostos à base da ilustração, como na referência.
 */
export function Inicio({ api, userId }: { api: ApiClient; userId: string }) {
  const [criando, setCriando] = useState(false);
  return (
    <div className="inicio">
      <section className="inicio__abertura" aria-labelledby="inicio-titulo">
        <FaixaDeAbertura
          src={`${ARTE}/abertura-inicio-1536.webp`}
          srcSet={`${ARTE}/abertura-inicio-768.webp 768w, ${ARTE}/abertura-inicio-1536.webp 1536w`}
          largura={1536} altura={864}>
          <h1 id="inicio-titulo" className="inicio__titulo">Histórias vivem aqui</h1>
          <p className="inicio__texto">Crie campanhas, reúna o seu grupo e mergulhe no mundo sombrio do Cursed.</p>
          <div className="inicio__acoes">
            <button type="button" className="button button--primary" onClick={() => setCriando(true)}>
              Criar campanha <Icone nome="seta" tamanho={18} />
            </button>
            <Link to={routes.campanhas()} className="button button--secondary">Gestão de mesas</Link>
          </div>
        </FaixaDeAbertura>
      </section>
      <nav aria-label="Atalhos" className="inicio__atalhos-nav">
        <ul className="inicio__atalhos">
          {ATALHOS.map((atalho) => (
            <li key={atalho.para}>
              <MolduraOrnamentada as={Link} to={atalho.para} className="cartao-atalho">
                <Icone nome={atalho.icone} tamanho={44} />
                <strong>{atalho.titulo}</strong>
                <small>{atalho.descricao}</small>
              </MolduraOrnamentada>
            </li>
          ))}
        </ul>
      </nav>
      <DialogoCriarCampanha api={api} userId={userId} aberto={criando} onFechar={() => setCriando(false)} />
    </div>
  );
}
