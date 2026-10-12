import { useNavigate } from "react-router";
import type { components } from "../../../api/generated/schema";

import { CabecalhoIlustrado } from "../../../ui/Arte";
import { TituloOrnado } from "../../../ui/Tema";
import { routes } from "../../routes";
import { WorkspaceChrome } from "../../shells/WorkspaceChrome";
import type { TableView } from "../../tableNavigation";
import { usePoliticaMesa } from "../api";
import type { ApiClient } from "../types";
import { AssistenteCriacao } from "./AssistenteCriacao";

type Mesa = components["schemas"]["MesaResumo"];

/** Rota `/mesas/:mesaId/criar-personagem`: o assistente dentro da moldura da mesa (design D1). */
export function CriarPersonagemPage({ mesa, api, userId, onSignOut }: { mesa: Mesa; api: ApiClient; userId: string; onSignOut: () => void }) {
  const navigate = useNavigate();
  const politica = usePoliticaMesa(api, mesa.id);
  const voltarParaFichas = () => navigate(`${routes.table(mesa.id)}?painel=character`);
  const permitido = mesa.papel === "jogador" && politica.data?.permitir_criacao_propria === true;

  return (
    <WorkspaceChrome
      role={mesa.papel}
      mesaNome={mesa.nome}
      mesaId={mesa.id}
      view="character"
      onNavigate={(view: TableView) => navigate(`${routes.table(mesa.id)}?painel=${view}`)}
      onSignOut={onSignOut}
      roleLabel={mesa.papel === "narrador" ? "Você é o Narrador" : "Você é jogador"}
      headerTitle="Criar personagem"
      headerEyebrow="MINHA FICHA"
      hero={(
        <CabecalhoIlustrado>
          <TituloOrnado nivel={1} sobretitulo={mesa.nome}>Criar personagem</TituloOrnado>
          <p>Siga as etapas do capítulo Criação de Personagem. Nada é gravado até você concluir na Conferência.</p>
        </CabecalhoIlustrado>
      )}
    >
      {politica.isPending && <p role="status">Verificando a política da mesa…</p>}
      {politica.isError && <p role="alert">{politica.error.message}</p>}
      {politica.isSuccess && !permitido && (
        <section className="panel" aria-label="Criação indisponível">
          <p>{mesa.papel === "narrador"
            ? "O Narrador cria personagens, NPCs e monstros pela opção Nova entidade, na lista de personagens."
            : "Criação de personagem não permitida nesta mesa."}</p>
          <button type="button" className="button button--secondary" onClick={voltarParaFichas}>Voltar às fichas</button>
        </section>
      )}
      {permitido && (
        <AssistenteCriacao api={api} mesaId={mesa.id} userId={userId} onSair={voltarParaFichas}
          onCriado={(personagemId) => navigate(`${routes.character(mesa.id, personagemId)}?novo=1`)} />
      )}
    </WorkspaceChrome>
  );
}
