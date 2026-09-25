// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditableField } from "./EditableField";
import type { PermissoesFicha } from "../types";

function permissoes(overrides: Partial<PermissoesFicha> = {}): PermissoesFicha {
  return {
    papel: "jogador",
    editar: true,
    excluir: false,
    transferir: false,
    campos_bloqueados: [],
    campos_exigem_aprovacao: [],
    ...overrides,
  };
}

describe("EditableField — 6.4 leitura padrão e edição contextual autorizada", () => {
  afterEach(() => cleanup());

  it("usuário sem permissão de editar não recebe nenhum controle de edição", () => {
    render(
      <EditableField label="Nome" path="personagem.nome" value="Nara Exemplo" permissoes={permissoes({ editar: false })} onSave={vi.fn()} />,
    );
    expect(screen.getByText("Nara Exemplo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar Nome" })).toBeNull();
  });

  it("campo bloqueado pelo Narrador não recebe controle mesmo com editar=true", () => {
    render(
      <EditableField
        label="Nível"
        path="personagem.nivel"
        value="3"
        permissoes={permissoes({ campos_bloqueados: ["personagem.nivel"] })}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Editar Nível" })).toBeNull();
  });

  it("usuário autorizado edita e confirma o valor enviado ao comando", async () => {
    const onSave = vi.fn().mockResolvedValue({ status: "salvo" });
    render(<EditableField label="Nome" path="personagem.nome" value="Nara Exemplo" permissoes={permissoes()} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar Nome" }));
    const input = screen.getByLabelText("Nome") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Nara Renomeada" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("personagem.nome", "Nara Renomeada"));
  });

  it("campo que exige aprovação avisa antes de enviar e confirma o envio para aprovação após o 202", async () => {
    const onSave = vi.fn().mockResolvedValue({ status: "pendente" });
    render(
      <EditableField
        label="Nome"
        path="personagem.nome"
        value="Nara Exemplo"
        permissoes={permissoes({ campos_exigem_aprovacao: ["personagem.nome"] })}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar Nome" }));
    expect(screen.getByText("Esta alteração será enviada para aprovação do Narrador.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Alteração enviada para aprovação do Narrador.")).toBeTruthy();
  });

  it("erro do servidor aparece no popover sem alterar o valor exibido", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Alteração bloqueada pelo Narrador."));
    render(<EditableField label="Nome" path="personagem.nome" value="Nara Exemplo" permissoes={permissoes()} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar Nome" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Outro nome" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Alteração bloqueada pelo Narrador.");
    expect(screen.getByText("Nara Exemplo")).toBeTruthy();
  });
});
