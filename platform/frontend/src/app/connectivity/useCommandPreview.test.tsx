// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCommandPreview } from "./useCommandPreview";

function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { mutations: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function EquipDemo({ run, online }: { run: (variables: { item: string }) => Promise<string>; online: boolean }) {
  const [confirmed, setConfirmed] = useState("Sem arma equipada");
  const { value, status, errorMessage, execute } = useCommandPreview<string, { item: string }>({
    confirmed,
    previewFrom: (variables) => `${variables.item} (prévia)`,
    run,
    onConfirmed: setConfirmed,
    online,
  });

  return (
    <div>
      <p data-testid="value">{value}</p>
      <p data-testid="status">{status}</p>
      <button type="button" onClick={() => { void execute({ item: "Lâmina da Vigília" }); }}>Equipar</button>
      {errorMessage && <p role="alert" aria-live="assertive">{errorMessage}</p>}
    </div>
  );
}

function renderDemo(run: (variables: { item: string }) => Promise<string>, online = true) {
  return render(<Wrapper><EquipDemo run={run} online={online} /></Wrapper>);
}

describe("useCommandPreview", () => {
  afterEach(() => cleanup());

  it("mostra a prévia local otimista imediatamente ao executar o comando", async () => {
    let resolve!: (value: string) => void;
    const run = vi.fn(() => new Promise<string>((r) => { resolve = r; }));
    renderDemo(run);

    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    expect(screen.getByTestId("value").textContent).toBe("Lâmina da Vigília (prévia)");
    expect(screen.getByTestId("status").textContent).toBe("previa-local");

    await waitFor(() => expect(run).toHaveBeenCalled());
    resolve("Lâmina da Vigília");
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("confirmado"));
    expect(screen.getByTestId("value").textContent).toBe("Lâmina da Vigília");
  });

  it("falha simulada de comando: a prévia some, o valor confirmado anterior volta, e o erro é anunciado via aria-live", async () => {
    const run = vi.fn().mockRejectedValue(new Error("O servidor recusou o comando: item bloqueado pelo Narrador."));
    renderDemo(run);

    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    expect(screen.getByTestId("value").textContent).toBe("Lâmina da Vigília (prévia)");
    expect(screen.getByTestId("status").textContent).toBe("previa-local");

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("erro"));
    expect(screen.getByTestId("value").textContent).toBe("Sem arma equipada");
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
    expect(alert.textContent).toBe("O servidor recusou o comando: item bloqueado pelo Narrador.");
  });

  it("offline: bloqueia o comando com um aviso claro e nunca chama o servidor", async () => {
    const run = vi.fn().mockResolvedValue("Lâmina da Vigília");
    renderDemo(run, false);

    fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByTestId("value").textContent).toBe("Sem arma equipada");
    expect(screen.getByTestId("status").textContent).toBe("erro");
    expect(screen.getByRole("alert").textContent).toMatch(/offline/i);
  });
});
