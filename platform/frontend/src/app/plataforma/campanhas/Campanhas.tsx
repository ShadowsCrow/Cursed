import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router";

import { Dialog } from "../../../ui/primitives";
import { AlternanciaSegmentada, Icone, MolduraOrnamentada } from "../../../ui/Ornamentos";
import type { ApiClient } from "../../characters/types";
import { routes } from "../../routes";
import { aceitarConvite, chaves, ladoInicial, lerLadoSalvo, salvarLado, SISTEMAS, useMesas, type Lado } from "../dados";
import { MiniaturaDaCapa } from "../Miniaturas";
import { ItemLateral } from "../ItemLateral";
import { CampanhaSelecionada } from "./CampanhaSelecionada";
import { DialogoCriarCampanha } from "./DialogoCriarCampanha";

function DialogoConvite({ api, userId, aberto, onFechar }: { api: ApiClient; userId: string; aberto: boolean; onFechar: () => void }) {
  const [codigo, setCodigo] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const aceitar = useMutation({
    mutationFn: () => aceitarConvite(api, codigo.trim()),
    onSuccess: async (mesa) => {
      await queryClient.invalidateQueries({ queryKey: chaves.mesas(userId) });
      salvarLado(userId, "jogando");
      setCodigo("");
      onFechar();
      navigate(routes.campanha(mesa.id));
    },
  });
  return (
    <Dialog open={aberto} onClose={onFechar} title="Entrar com convite" initialFocusRef={campo}
      description="Cole o código que a pessoa que narra enviou. Você entra na campanha como jogador.">
      <form className="formulario-dialogo" onSubmit={(evento) => { evento.preventDefault(); if (codigo.trim()) aceitar.mutate(); }}>
        <label>Código do convite
          <input ref={campo} required autoComplete="off" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} />
        </label>
        {aceitar.isError && <p role="alert" className="field-error">{aceitar.error.message}</p>}
        <button type="submit" className="button button--primary" disabled={aceitar.isPending || !codigo.trim()}>
          {aceitar.isPending ? "Entrando…" : "Entrar na campanha"}
        </button>
      </form>
    </Dialog>
  );
}

/**
 * Campanhas: lista lateral com Narrando/Jogando e, à direita, a campanha selecionada. A seleção fica
 * no endereço (`/campanhas/:mesaId`); sem seleção, abre a primeira do lado atual.
 */
export function Campanhas({ api, userId }: { api: ApiClient; userId: string }) {
  const { mesaId } = useParams<"mesaId">();
  const mesas = useMesas(api, userId);
  const navigate = useNavigate();
  const [ladoEscolhido, setLadoEscolhido] = useState<Lado | null>(null);
  const [dialogo, setDialogo] = useState<"criar" | "convite" | null>(null);
  const papelSelecionado = mesas.data?.find((mesa) => mesa.id === mesaId)?.papel;
  useEffect(() => {
    if (papelSelecionado) salvarLado(userId, papelSelecionado === "narrador" ? "narrando" : "jogando");
  }, [papelSelecionado, userId]);

  if (mesas.isPending) return <p role="status">Carregando campanhas…</p>;
  if (mesas.isError) return <p role="alert">{mesas.error.message}</p>;

  const todas = mesas.data;
  const selecionada = todas.find((mesa) => mesa.id === mesaId);
  // A campanha selecionada manda no lado (ela precisa aparecer na lista); sem seleção, vale a escolha.
  const lado = selecionada ? ladoInicial(todas, selecionada, null) : ladoEscolhido ?? ladoInicial(todas, undefined, lerLadoSalvo(userId));
  const papel = lado === "narrando" ? "narrador" : "jogador";
  const doLado = todas.filter((mesa) => mesa.papel === papel);

  const primeiraDoLado = doLado[0];
  if (!mesaId && primeiraDoLado) return <Navigate to={routes.campanha(primeiraDoLado.id)} replace />;

  function trocarLado(novo: Lado) {
    setLadoEscolhido(novo);
    salvarLado(userId, novo);
    const primeira = todas.find((mesa) => mesa.papel === (novo === "narrando" ? "narrador" : "jogador"));
    navigate(primeira ? routes.campanha(primeira.id) : routes.campanhas());
  }

  return (
    <div className="secao-lateral">
      <aside className="lateral" aria-labelledby="campanhas-titulo">
        <h1 id="campanhas-titulo" className="lateral__titulo">Campanhas</h1>
        <AlternanciaSegmentada<Lado>
          rotulo="Mostrar campanhas"
          valor={lado}
          onChange={trocarLado}
          opcoes={[
            { id: "narrando", rotulo: "Narrando", contagem: todas.filter((mesa) => mesa.papel === "narrador").length },
            { id: "jogando", rotulo: "Jogando", contagem: todas.filter((mesa) => mesa.papel === "jogador").length },
          ]}
        />
        {doLado.length === 0
          ? <p className="lateral__vazio">{lado === "narrando"
            ? "Você ainda não narra nenhuma campanha. Crie uma para convidar o seu grupo."
            : "Você ainda não joga em nenhuma campanha. Peça um código de convite a quem narra."}</p>
          : (
            <ul className="lateral__lista" aria-label={lado === "narrando" ? "Campanhas que você narra" : "Campanhas que você joga"}>
              {doLado.map((mesa) => (
                <li key={mesa.id}>
                  <ItemLateral para={routes.campanha(mesa.id)} imagem={<MiniaturaDaCapa api={api} mesa={mesa} />}
                    titulo={mesa.nome} subtitulo={SISTEMAS[mesa.sistema]} />
                </li>
              ))}
            </ul>
          )}
        {lado === "narrando"
          ? <button type="button" className="button button--secondary lateral__acao" onClick={() => setDialogo("criar")}><Icone nome="mais" tamanho={18} /> Nova campanha</button>
          : <button type="button" className="button button--secondary lateral__acao" onClick={() => setDialogo("convite")}><Icone nome="mais" tamanho={18} /> Entrar com convite</button>}
      </aside>
      <div className="painel-principal">
        {selecionada
          ? <CampanhaSelecionada key={selecionada.id} api={api} userId={userId} mesa={selecionada} />
          : (
            <MolduraOrnamentada tipo="painel" className="painel-principal__vazio">
              <p>{mesaId ? "Esta campanha não está entre as suas campanhas ativas." : "Escolha ou crie uma campanha."}</p>
            </MolduraOrnamentada>
          )}
      </div>
      <DialogoCriarCampanha api={api} userId={userId} aberto={dialogo === "criar"} onFechar={() => setDialogo(null)} />
      <DialogoConvite api={api} userId={userId} aberto={dialogo === "convite"} onFechar={() => setDialogo(null)} />
    </div>
  );
}
