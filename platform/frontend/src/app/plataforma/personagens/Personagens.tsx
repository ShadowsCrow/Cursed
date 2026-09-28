import { Navigate, useNavigate, useParams } from "react-router";

import { AlternanciaSegmentada, MolduraOrnamentada } from "../../../ui/Ornamentos";
import type { ApiClient } from "../../characters/types";
import { routes } from "../../routes";
import { useAcervo, type AcervoPersonagem, type Colecao } from "../dados";
import { MiniaturaDoRetrato } from "../Miniaturas";
import { ItemLateral } from "../ItemLateral";
import { Vitrine } from "./Vitrine";

const COLECOES: { id: Colecao; rotulo: string; vazio: string }[] = [
  { id: "meus", rotulo: "Meus personagens", vazio: "Seus personagens de jogador aparecem aqui quando você cria um numa campanha." },
  { id: "npcs", rotulo: "NPCs", vazio: "NPCs aparecem aqui quando você narra uma campanha e cria NPCs nela." },
  { id: "monstros", rotulo: "Monstros", vazio: "Monstros aparecem aqui quando você narra uma campanha e cria monstros nela." },
];

function subtitulo(personagem: AcervoPersonagem): string {
  const papel = personagem.classe ?? (personagem.tipo === "npc" ? "NPC" : personagem.tipo === "monstro" ? "Monstro" : "Sem classe");
  return `${papel} · ${personagem.mesa_nome}`;
}

function eColecao(valor: string | undefined): valor is Colecao {
  return valor === "meus" || valor === "npcs" || valor === "monstros";
}

/**
 * Personagens: escolha entre Meus personagens, NPCs e Monstros, lista lateral e vitrine do
 * selecionado. Coleção e seleção ficam no endereço.
 */
export function Personagens({ api, userId }: { api: ApiClient; userId: string }) {
  const { colecao: bruta, mesaId, personagemId } = useParams<"colecao" | "mesaId" | "personagemId">();
  const navigate = useNavigate();
  const colecao: Colecao = eColecao(bruta) ? bruta : "meus";
  const acervo = useAcervo(api, colecao);

  if (!eColecao(bruta)) return <Navigate to={routes.personagens("meus")} replace />;

  const lista = acervo.data ?? [];
  const selecionado = lista.find((p) => p.mesa_id === mesaId && p.personagem_id === personagemId);
  const primeiro = lista[0];
  if (acervo.isSuccess && !personagemId && primeiro) {
    return <Navigate to={routes.personagemDoAcervo(colecao, primeiro.mesa_id, primeiro.personagem_id)} replace />;
  }
  const info = COLECOES.find((c) => c.id === colecao) ?? { id: colecao, rotulo: "Personagens", vazio: "" };

  return (
    <div className="secao-lateral">
      <aside className="lateral" aria-labelledby="personagens-titulo">
        <h1 id="personagens-titulo" className="lateral__titulo">Personagens</h1>
        <AlternanciaSegmentada<Colecao>
          rotulo="Mostrar personagens"
          className="alternancia--tres"
          valor={colecao}
          onChange={(nova) => navigate(routes.personagens(nova))}
          opcoes={COLECOES.map(({ id, rotulo }) => ({ id, rotulo }))}
        />
        {acervo.isPending && <p role="status">Carregando personagens…</p>}
        {acervo.isError && <p role="alert">{acervo.error.message}</p>}
        {acervo.isSuccess && lista.length === 0 && <p className="lateral__vazio">{info.vazio}</p>}
        {lista.length > 0 && (
          <ul className="lateral__lista" aria-label={info.rotulo}>
            {lista.map((personagem) => (
              <li key={`${personagem.mesa_id}/${personagem.personagem_id}`}>
                <ItemLateral para={routes.personagemDoAcervo(colecao, personagem.mesa_id, personagem.personagem_id)}
                  imagem={<MiniaturaDoRetrato api={api} personagem={personagem} />}
                  titulo={personagem.nome} subtitulo={subtitulo(personagem)} />
              </li>
            ))}
          </ul>
        )}
      </aside>
      <div className="painel-principal">
        {selecionado
          ? <Vitrine key={`${selecionado.mesa_id}/${selecionado.personagem_id}`} api={api} userId={userId} personagem={selecionado} colecao={colecao} />
          : acervo.isSuccess && personagemId && (
            <MolduraOrnamentada tipo="painel" className="painel-principal__vazio"><p>Este personagem não está nesta coleção.</p></MolduraOrnamentada>
          )}
      </div>
    </div>
  );
}
