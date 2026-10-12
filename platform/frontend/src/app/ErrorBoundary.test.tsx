// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function BrokenPage(): never {
  throw new Error("simulated render failure");
}

describe("global error boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows a recoverable message after an unexpected render error", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<ErrorBoundary><BrokenPage /></ErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toContain("Seu estado confirmado não foi alterado");
    expect(screen.getByRole("button", { name: "Recarregar" })).toBeTruthy();
  });
});
