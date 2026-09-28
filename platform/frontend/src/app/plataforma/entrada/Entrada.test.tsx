// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Entrada, type ModoEntrada } from "./Entrada";

function authFalso(respostas: Partial<Record<"signInWithPassword" | "signUp" | "resetPasswordForEmail" | "updateUser" | "signInWithOAuth", { message: string } | null>> = {}) {
  const chamada = (nome: keyof typeof respostas) => vi.fn(async () => ({ data: {}, error: respostas[nome] ?? null }));
  const auth = {
    signInWithPassword: chamada("signInWithPassword"), signUp: chamada("signUp"),
    resetPasswordForEmail: chamada("resetPasswordForEmail"), updateUser: chamada("updateUser"),
    signInWithOAuth: chamada("signInWithOAuth"),
  };
  return { auth, cliente: { auth } as unknown as SupabaseClient };
}

function montar(modo: ModoEntrada, cliente: SupabaseClient, loginGoogle = false) {
  render(<MemoryRouter><Entrada auth={cliente} modo={modo} loginGoogle={loginGoogle} /></MemoryRouter>);
}

function preencher(rotulo: RegExp | string, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

describe("entrada, cadastro e senha (5.1)", () => {
  afterEach(() => cleanup());

  it("senha errada não diz qual campo errou", async () => {
    const { cliente, auth } = authFalso({ signInWithPassword: { message: "Invalid login credentials" } });
    montar("entrar", cliente);
    preencher("E-mail", "ana@exemplo.com");
    preencher("Senha", "errada");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("E-mail ou senha não conferem.");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "ana@exemplo.com", password: "errada" });
  });

  it("cadastro mostra a mesma mensagem para e-mail novo ou já existente e pede confirmação", async () => {
    const { cliente, auth } = authFalso();
    montar("cadastro", cliente);
    preencher("E-mail", "ana@exemplo.com");
    preencher(/^Senha$/, "segredo-forte");
    preencher("Repita a senha", "segredo-forte");
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect((await screen.findByRole("status")).textContent).toContain("Se o e-mail puder ser usado, enviamos para ana@exemplo.com um link de confirmação");
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "ana@exemplo.com", options: { emailRedirectTo: `${window.location.origin}/boas-vindas` },
    }));
    expect(screen.queryByLabelText("E-mail")).toBeNull();
  });

  it("cadastro com senhas diferentes não chama o serviço", async () => {
    const { cliente, auth } = authFalso();
    montar("cadastro", cliente);
    preencher("E-mail", "ana@exemplo.com");
    preencher(/^Senha$/, "segredo-forte");
    preencher("Repita a senha", "outra-senha");
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect((await screen.findByRole("alert")).textContent).toBe("As senhas não são iguais.");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("recuperar senha responde igual mesmo quando o serviço falha", async () => {
    const { cliente, auth } = authFalso({ resetPasswordForEmail: { message: "User not found" } });
    montar("recuperar", cliente);
    preencher("E-mail", "ninguem@exemplo.com");
    fireEvent.click(screen.getByRole("button", { name: "Recuperar senha" }));
    expect((await screen.findByRole("status")).textContent).toBe("Se houver uma conta com esse e-mail, enviamos um link para escolher uma nova senha.");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("ninguem@exemplo.com", { redirectTo: `${window.location.origin}/redefinir-senha` });
  });

  it("Google só aparece com o provedor ligado e volta para a origem atual", async () => {
    const { cliente, auth } = authFalso();
    montar("entrar", cliente);
    expect(screen.queryByRole("button", { name: "Entrar com Google" })).toBeNull();
    cleanup();
    montar("entrar", cliente, true);
    fireEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    await vi.waitFor(() => expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google", options: { redirectTo: `${window.location.origin}/` },
    }));
  });

  it("links entre as telas de entrada", () => {
    montar("entrar", authFalso().cliente);
    expect(screen.getByRole("link", { name: "Criar uma conta" }).getAttribute("href")).toBe("/cadastro");
    expect(screen.getByRole("link", { name: "Esqueci minha senha" }).getAttribute("href")).toBe("/recuperar-senha");
  });
});
