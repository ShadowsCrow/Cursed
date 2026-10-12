import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";

import { Dialog } from "../../../ui/primitives";
import { Avatar, FaixaDeAbertura, Icone, MolduraOrnamentada } from "../../../ui/Ornamentos";
import { ImageUpload } from "../../assets/ImageUpload";
import type { ApiClient, ParticipanteResumo, PersonagemResumo } from "../../characters/types";
import { routes } from "../../routes";
import {
  atualizarCampanha, criarConvite, SISTEMAS, useFotoDoPerfil, useMesaDetalhe, usePersonagensDaMesa,
  usePoliticaDaMesa, type MesaResumo,
} from "../dados";
import { useCapa, useRetrato } from "../imagens";

function Participante({ api, participante }: { api: ApiClient; participante: ParticipanteResumo }) {
  const nome = participante.nome ?? "Participante";
  const foto = useFotoDoPerfil(api, participante.usuario_id, Boolean(participante.tem_foto));
  return (
    <li>
      <Avatar nome={nome} src={foto.data} tamanho={40} decorativo />
      <span><strong>{nome}</strong><small>{participante.papel === "narrador" ? "Narra" : "Joga"}</small></span>
    </li>
  );
}

const TIPOS: Record<PersonagemResumo["tipo"], string> = { personagem: "Personagem", npc: "NPC", monstro: "Monstro" };

function PersonagemDaCampanha({ api, userId, personagem }: { api: ApiClient; userId: string; personagem: PersonagemResumo }) {
  const retrato = useRetrato(api, personagem.mesa_id, personagem.retrato_objeto, personagem.tipo, true);
  return (
    <li className="campanha__pessoa">
      <Avatar nome={personagem.nome} src={retrato} tamanho={64} decorativo />
      <strong>{personagem.nome}</strong>
      <span>{TIPOS[personagem.tipo]}{personagem.proprietario_id === userId ? " · seu" : ""}{personagem.visibilidade === "narrador" ? " · oculto" : ""}</span>
    </li>
  );
}

function DialogoEditar({ api, mesa, aberto, onFechar }: { api: ApiClient; mesa: MesaResumo; aberto: boolean; onFechar: () => void }) {
  const [nome, setNome] = useState(mesa.nome);
  const [sinopse, setSinopse] = useState(mesa.sinopse ?? "");
  const campo = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const atualizarListas = () => queryClient.invalidateQueries({ predicate: (consulta) => ["mesas", "mesa"].includes(String(consulta.queryKey[0])) });
  const gravar = useMutation({
    mutationFn: () => atualizarCampanha(api, mesa.id, nome.trim(), sinopse),
    onSuccess: async () => { await atualizarListas(); onFechar(); },
  });
  return (
    <Dialog open={aberto} onClose={onFechar} title="Editar campanha" initialFocusRef={campo}>
      <form className="formulario-dialogo" onSubmit={(evento) => { evento.preventDefault(); if (nome.trim()) gravar.mutate(); }}>
        <label>Nome da campanha
          <input ref={campo} required maxLength={200} value={nome} onChange={(evento) => setNome(evento.target.value)} />
        </label>
        <label>Sinopse
          <textarea rows={6} maxLength={2000} value={sinopse} onChange={(evento) => setSinopse(evento.target.value)} />
          <small className="perfil__dica">{sinopse.length} de 2.000 caracteres. Todos os participantes veem a sinopse.</small>
        </label>
        {gravar.isError && <p role="alert" className="field-error">{gravar.error.message}</p>}
        <button type="submit" className="button button--primary" disabled={gravar.isPending || !nome.trim()}>
          {gravar.isPending ? "Gravando…" : "Gravar"}
        </button>
      </form>
      <fieldset className="formulario-dialogo__capa">
        <legend>Capa</legend>
        <p className="perfil__dica">Aparece na lista e no topo da campanha. Sem capa, fica a ilustração padrão.</p>
        <ImageUpload api={api} mesaId={mesa.id} destino="capa" alvo={mesa.id} rotulo="capa" temImagem={Boolean(mesa.capa_objeto)}
          onConcluido={() => void atualizarListas()} />
      </fieldset>
    </Dialog>
  );
}

function Convite({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const gerar = useMutation({ mutationFn: () => criarConvite(api, mesaId) });
  return (
    <div className="campanha__convite">
      <button type="button" className="button button--secondary" disabled={gerar.isPending} onClick={() => gerar.mutate()}>
        <Icone nome="pessoas" tamanho={18} /> {gerar.data ? "Gerar outro convite" : "Convidar jogadores"}
      </button>
      {gerar.isError && <p role="alert" className="field-error">{gerar.error.message}</p>}
      {gerar.data && (
        <div role="status">
          <p>Envie este código ao jogador. Vale para uma entrada até {new Date(gerar.data.expira_em).toLocaleString("pt-BR")}.</p>
          <code>{gerar.data.codigo}</code>
        </div>
      )}
    </div>
  );
}

/** Campanha selecionada: capa, nome, sistema, sinopse, personagens visíveis, participantes e a mesa. */
export function CampanhaSelecionada({ api, userId, mesa }: { api: ApiClient; userId: string; mesa: MesaResumo }) {
  const detalhe = useMesaDetalhe(api, mesa.id);
  const personagens = usePersonagensDaMesa(api, mesa.id);
  const narra = mesa.papel === "narrador";
  const politica = usePoliticaDaMesa(api, narra ? undefined : mesa.id);
  const capa = useCapa(api, mesa, "faixa");
  const [editando, setEditando] = useState(false);

  const visiveis = (personagens.data ?? []).filter((p) => !p.excluido_em);
  const temProprio = visiveis.some((p) => p.proprietario_id === userId);
  const podeCriar = !narra && !temProprio && politica.data?.permitir_criacao_propria === true;

  return (
    <>
      <MolduraOrnamentada as="article" tipo="painel" className="campanha" aria-labelledby="campanha-nome">
        <div className="painel__faixa sangria-topo">
          <FaixaDeAbertura src={capa} largura={1536} altura={512}>
            <h1 id="campanha-nome">{mesa.nome}</h1>
            <p>{SISTEMAS[mesa.sistema]} · {narra ? "Você narra esta campanha" : "Você joga nesta campanha"}</p>
          </FaixaDeAbertura>
        </div>
        <div className="abas-simples"><h2 className="sr-only">Seções da campanha</h2><span>Visão geral</span></div>

        <div className="campanha__grade">
          <MolduraOrnamentada as="section" className="campanha__sinopse" aria-labelledby="campanha-sinopse">
            <img className="campanha__sinopse-arte sangria-topo" src={capa} alt="" width={1536} height={512} />
            <h3 id="campanha-sinopse">Sinopse</h3>
            {mesa.sinopse
              ? <p>{mesa.sinopse}</p>
              : <p className="campanha__sem-sinopse">{narra ? "Sem sinopse ainda. Use “Editar campanha” para apresentar a história." : "A pessoa que narra ainda não escreveu a sinopse."}</p>}
          </MolduraOrnamentada>

          <MolduraOrnamentada as="section" className="campanha__mesa" aria-labelledby="campanha-mesa">
            <h3 id="campanha-mesa">Mesa</h3>
            <Link to={routes.table(mesa.id)} className="button button--primary">Entrar na mesa <Icone nome="seta" tamanho={18} /></Link>
            {podeCriar && <Link to={routes.createCharacter(mesa.id)} className="button button--secondary">Criar personagem</Link>}
            {!narra && !temProprio && politica.data && !politica.data.permitir_criacao_propria &&
              <p>Nesta campanha, quem narra cria os personagens.</p>}
            {narra && (
              <>
                <button type="button" className="button button--secondary" onClick={() => setEditando(true)}>
                  <Icone nome="lapis" tamanho={18} /> Editar campanha
                </button>
                <Convite api={api} mesaId={mesa.id} />
              </>
            )}
          </MolduraOrnamentada>

          <MolduraOrnamentada as="section" className="campanha__personagens" aria-labelledby="campanha-personagens">
            <h3 id="campanha-personagens">Personagens</h3>
            {personagens.isPending && <p role="status">Carregando personagens…</p>}
            {personagens.isError && <p role="alert">{personagens.error.message}</p>}
            {personagens.isSuccess && visiveis.length === 0 && <p className="campanha__sem-sinopse">Nenhum personagem visível ainda.</p>}
            {visiveis.length > 0 && (
              <ul className="campanha__pessoas">
                {visiveis.map((personagem) => (
                  <PersonagemDaCampanha key={personagem.id} api={api} userId={userId} personagem={personagem} />
                ))}
              </ul>
            )}
          </MolduraOrnamentada>

          <MolduraOrnamentada as="section" className="campanha__participantes-quadro" aria-labelledby="campanha-participantes">
            <h3 id="campanha-participantes">Participantes</h3>
            {detalhe.isPending && <p role="status">Carregando participantes…</p>}
            {detalhe.isError && <p role="alert">{detalhe.error.message}</p>}
            {detalhe.data && (
              <ul className="campanha__participantes">
                {detalhe.data.participantes.map((participante) => (
                  <Participante key={participante.usuario_id} api={api} participante={participante} />
                ))}
              </ul>
            )}
          </MolduraOrnamentada>
        </div>
      </MolduraOrnamentada>
      {narra && editando && <DialogoEditar api={api} mesa={mesa} aberto onFechar={() => setEditando(false)} />}
    </>
  );
}
