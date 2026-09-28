import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router";

import {
  requestPasswordReset, signInWithGoogle, signInWithPassword, signUp, updatePassword,
} from "../../../auth/supabase";
import { ARTE, Ilustracao } from "../../../ui/Arte";
import { MolduraOrnamentada } from "../../../ui/Ornamentos";
import { Marca } from "../../../ui/Tema";
import { routes } from "../../routes";

export type ModoEntrada = "entrar" | "cadastro" | "recuperar" | "redefinir";

const TITULOS: Record<ModoEntrada, string> = {
  entrar: "Entrar", cadastro: "Criar conta", recuperar: "Recuperar senha", redefinir: "Escolher nova senha",
};
const SENHA_MINIMA = 8;

/** O botão do Google só aparece com o provedor configurado no Supabase (VITE_LOGIN_GOOGLE=1). */
export const LOGIN_GOOGLE = import.meta.env.VITE_LOGIN_GOOGLE === "1";

function textoDoErro(causa: unknown): string {
  return typeof causa === "object" && causa !== null && "message" in causa ? String(causa.message) : "";
}

function mensagemDeEntrada(causa: unknown): string {
  const texto = textoDoErro(causa);
  // Não diz qual campo errou: e-mail inexistente e senha errada têm a mesma resposta.
  if (/email not confirmed/i.test(texto)) return "Confirme o seu e-mail pelo link que enviamos antes de entrar.";
  if (/invalid login|invalid credentials|invalid email or password/i.test(texto)) return "E-mail ou senha não conferem.";
  return "Não foi possível entrar agora. Tente de novo em instantes.";
}

function mensagemDeSenha(causa: unknown): string {
  const texto = textoDoErro(causa);
  if (/password/i.test(texto) && /(short|least|weak)/i.test(texto)) return `Use uma senha mais forte, com pelo menos ${SENHA_MINIMA} caracteres.`;
  return "Não foi possível concluir agora. Tente de novo em instantes.";
}

/**
 * Telas antes de entrar: entrar, criar conta, recuperar e redefinir a senha. As mensagens de cadastro
 * e de recuperação são as mesmas para e-mails com ou sem conta.
 */
export function Entrada({ auth, modo, loginGoogle = LOGIN_GOOGLE, onSenhaRedefinida }: {
  auth: SupabaseClient; modo: ModoEntrada; loginGoogle?: boolean; onSenhaRedefinida?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);
  const origem = window.location.origin;

  async function executar(acao: () => Promise<void>, sucesso: string | null, erroDe: (causa: unknown) => string) {
    setPendente(true);
    setErro(null);
    setAviso(null);
    try {
      await acao();
      if (sucesso) setAviso(sucesso);
    } catch (causa) {
      setErro(erroDe(causa));
    } finally {
      setPendente(false);
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if ((modo === "cadastro" || modo === "redefinir") && senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }
    if (modo === "entrar") void executar(() => signInWithPassword(auth, email.trim(), senha), null, mensagemDeEntrada);
    if (modo === "cadastro") {
      void executar(() => signUp(auth, email.trim(), senha, `${origem}${routes.boasVindas()}`),
        `Se o e-mail puder ser usado, enviamos para ${email.trim()} um link de confirmação. Abra o link para entrar.`, mensagemDeSenha);
    }
    if (modo === "recuperar") {
      // Qualquer resposta vira a mesma mensagem: não revela se o e-mail tem conta.
      void executar(() => requestPasswordReset(auth, email.trim(), `${origem}${routes.redefinirSenha()}`).catch(() => undefined),
        "Se houver uma conta com esse e-mail, enviamos um link para escolher uma nova senha.", mensagemDeSenha);
    }
    if (modo === "redefinir") void executar(async () => { await updatePassword(auth, senha); onSenhaRedefinida?.(); }, "Senha trocada.", mensagemDeSenha);
  }

  const pedeEmail = modo !== "redefinir";
  const pedeSenha = modo !== "recuperar";
  const confirmaSenha = modo === "cadastro" || modo === "redefinir";

  return (
    <main className="entrada">
      <div className="entrada__arte" aria-hidden="true">
        <picture>
          <source media="(max-width: 720px)" srcSet={`${ARTE}/abertura-entrada-768.webp`} />
          <Ilustracao src={`${ARTE}/abertura-entrada-1536.webp`} largura={1536} altura={1024} />
        </picture>
      </div>
      <MolduraOrnamentada tipo="painel" className="entrada__cartao">
        <Marca tamanho={64} subtitulo={null} />
        <h1>{TITULOS[modo]}</h1>
        {aviso && <p role="status" className="entrada__mensagem">{aviso}</p>}
        {!(aviso && (modo === "cadastro" || modo === "recuperar")) && (
          <form onSubmit={enviar}>
            {pedeEmail && (
              <label>E-mail
                <input type="email" required autoComplete="email" value={email} onChange={(evento) => setEmail(evento.target.value)} />
              </label>
            )}
            {pedeSenha && (
              <label>{modo === "redefinir" ? "Nova senha" : "Senha"}
                <input type="password" required minLength={modo === "entrar" ? undefined : SENHA_MINIMA}
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  value={senha} onChange={(evento) => setSenha(evento.target.value)} />
              </label>
            )}
            {confirmaSenha && (
              <label>Repita a senha
                <input type="password" required minLength={SENHA_MINIMA} autoComplete="new-password"
                  value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} />
              </label>
            )}
            {erro && <p role="alert" className="field-error">{erro}</p>}
            <button type="submit" className="button button--primary" disabled={pendente}>
              {pendente ? "Aguarde…" : TITULOS[modo]}
            </button>
          </form>
        )}
        {loginGoogle && (modo === "entrar" || modo === "cadastro") && (
          <>
            <p className="entrada__ou">ou</p>
            <button type="button" className="button button--secondary" disabled={pendente}
              onClick={() => void executar(() => signInWithGoogle(auth, `${origem}${routes.home()}`), null, mensagemDeEntrada)}>
              Entrar com Google
            </button>
          </>
        )}
        <div className="entrada__links">
          {modo !== "entrar" && <Link to={routes.entrar()}>Já tenho conta: entrar</Link>}
          {modo === "entrar" && <Link to={routes.cadastro()}>Criar uma conta</Link>}
          {modo === "entrar" && <Link to={routes.recuperarSenha()}>Esqueci minha senha</Link>}
          <Link to="/preview">Conhecer a prévia visual</Link>
        </div>
      </MolduraOrnamentada>
    </main>
  );
}
