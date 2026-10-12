import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router";

import { Avatar, MolduraOrnamentada } from "../../../ui/Ornamentos";
import { EstadoDePagina, Marca, TituloOrnado } from "../../../ui/Tema";
import { TIPOS_IMAGEM } from "../../assets/imagensApi";
import type { ApiClient } from "../../characters/types";
import { routes } from "../../routes";
import {
  chaves, enviarFotoDoPerfil, gravarApelido, removerFotoDoPerfil, useFotoDoPerfil, usePerfil, type PerfilResposta,
} from "../dados";

const LIMITE_FOTO_MB = 5;
const PROVEDORES: Record<string, string> = { email: "E-mail e senha", google: "Google", desenvolvimento: "Modo de desenvolvimento" };

function FotoDoPerfil({ api, userId, perfil }: { api: ApiClient; userId: string; perfil: PerfilResposta }) {
  const foto = useFotoDoPerfil(api, userId, perfil.tem_foto);
  const entrada = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const atualizar = async () => {
    await queryClient.invalidateQueries({ queryKey: chaves.perfil });
    await queryClient.invalidateQueries({ queryKey: chaves.foto(userId) });
  };
  const enviar = useMutation({ mutationFn: (arquivo: File) => enviarFotoDoPerfil(api, arquivo), onSuccess: atualizar, onError: (e) => setErro(e.message) });
  const remover = useMutation({ mutationFn: () => removerFotoDoPerfil(api), onSuccess: atualizar, onError: (e) => setErro(e.message) });
  const nome = perfil.apelido ?? perfil.apelido_sugerido ?? "Você";

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    setErro(null);
    if (!arquivo) return;
    if (arquivo.type && !TIPOS_IMAGEM.includes(arquivo.type)) { setErro("Envie uma imagem PNG, JPEG ou WEBP."); return; }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) { setErro(`A foto passa do limite de ${LIMITE_FOTO_MB} MB.`); return; }
    enviar.mutate(arquivo);
  }

  const pendente = enviar.isPending || remover.isPending;
  return (
    <div className="perfil__foto">
      <Avatar nome={nome} src={perfil.tem_foto ? foto.data : null} tamanho={96} />
      <div>
        <input ref={entrada} type="file" accept={TIPOS_IMAGEM.join(",")} hidden onChange={escolher} aria-label="Arquivo da foto do perfil" data-testid="upload-foto" />
        <button type="button" className="button button--secondary" disabled={pendente} onClick={() => entrada.current?.click()}>
          {enviar.isPending ? "Enviando…" : perfil.tem_foto ? "Trocar foto" : "Enviar foto"}
        </button>
        {perfil.tem_foto && (
          <button type="button" className="text-action" disabled={pendente} onClick={() => remover.mutate()}>Remover foto</button>
        )}
        <p className="perfil__dica">Opcional. PNG, JPEG ou WEBP, até {LIMITE_FOTO_MB} MB. Quem joga com você vê a foto; sem ela, aparecem as iniciais.</p>
        {erro && <p role="alert" className="field-error">{erro}</p>}
      </div>
    </div>
  );
}

function FormularioDoApelido({ api, perfil, rotuloBotao, onGravado }: {
  api: ApiClient; perfil: PerfilResposta; rotuloBotao: string; onGravado?: () => void;
}) {
  const [apelido, setApelido] = useState(perfil.apelido ?? perfil.apelido_sugerido);
  const queryClient = useQueryClient();
  const gravar = useMutation({
    mutationFn: () => gravarApelido(api, apelido),
    onSuccess: (novo) => {
      queryClient.setQueryData(chaves.perfil, novo);
      // O apelido aparece em participantes e no histórico das mesas.
      void queryClient.invalidateQueries({ predicate: (consulta) => consulta.queryKey[0] === "mesa" });
      onGravado?.();
    },
  });
  const limpo = apelido.trim();
  const valido = limpo.length >= 2 && limpo.length <= 40;
  return (
    <form onSubmit={(evento) => { evento.preventDefault(); if (valido) gravar.mutate(); }}>
      <label>Apelido
        <input type="text" required value={apelido} maxLength={40} autoComplete="nickname" aria-describedby="dica-apelido"
          onChange={(evento) => setApelido(evento.target.value)} />
        <span id="dica-apelido" className="perfil__dica">De 2 a 40 caracteres. É o nome que aparece para o seu grupo em todas as campanhas.</span>
      </label>
      {gravar.isError && <p role="alert" className="field-error">{gravar.error.message}</p>}
      {gravar.isSuccess && !onGravado && <p role="status">Apelido gravado.</p>}
      <button type="submit" className="button button--primary" disabled={!valido || gravar.isPending}>
        {gravar.isPending ? "Gravando…" : rotuloBotao}
      </button>
    </form>
  );
}

/** Primeiro acesso: confirmar o apelido sugerido e, se quiser, enviar a foto. */
export function BoasVindas({ api, userId }: { api: ApiClient; userId: string }) {
  const perfil = usePerfil(api);
  const navigate = useNavigate();
  if (perfil.isPending) return <EstadoDePagina><p>Carregando seu perfil…</p></EstadoDePagina>;
  if (perfil.isError) return <EstadoDePagina alerta><p>{perfil.error.message}</p></EstadoDePagina>;
  if (perfil.data.confirmado) return <Navigate to={routes.home()} replace />;
  return (
    <main className="boas-vindas">
      <MolduraOrnamentada tipo="painel" className="perfil">
        <Marca tamanho={56} subtitulo={null} />
        <TituloOrnado nivel={1} sobretitulo="Primeiro acesso">Como o seu grupo vai chamar você?</TituloOrnado>
        <FotoDoPerfil api={api} userId={userId} perfil={perfil.data} />
        <FormularioDoApelido api={api} perfil={perfil.data} rotuloBotao="Confirmar e entrar" onGravado={() => navigate(routes.home(), { replace: true })} />
      </MolduraOrnamentada>
    </main>
  );
}

/** Meu perfil: apelido, foto, e-mail e modo de entrada. */
export function MeuPerfil({ api, userId }: { api: ApiClient; userId: string }) {
  const perfil = usePerfil(api);
  if (perfil.isPending) return <p role="status" className="pagina-central">Carregando seu perfil…</p>;
  if (perfil.isError) return <p role="alert" className="pagina-central">{perfil.error.message}</p>;
  return (
    <div className="pagina-central">
    <MolduraOrnamentada tipo="painel" className="perfil">
      <TituloOrnado nivel={1}>Meu perfil</TituloOrnado>
      <FotoDoPerfil api={api} userId={userId} perfil={perfil.data} />
      <FormularioDoApelido api={api} perfil={perfil.data} rotuloBotao="Gravar apelido" />
      <dl className="perfil__conta">
        <dt>E-mail</dt><dd>{perfil.data.email ?? "—"}</dd>
        <dt>Entrada</dt><dd>{perfil.data.provedor ? PROVEDORES[perfil.data.provedor] ?? perfil.data.provedor : "—"}</dd>
      </dl>
    </MolduraOrnamentada>
    </div>
  );
}
