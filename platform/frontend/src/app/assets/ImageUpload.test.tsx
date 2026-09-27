// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { ImageUpload } from "./ImageUpload";

function arquivo(nome: string, tipo: string, bytes: number): File {
  const conteudo = new File([new Uint8Array(Math.min(bytes, 16))], nome, { type: tipo });
  Object.defineProperty(conteudo, "size", { value: bytes });
  return conteudo;
}

function montar(api: Partial<Record<"PUT" | "DELETE", unknown>>, extras: Partial<Parameters<typeof ImageUpload>[0]> = {}) {
  const onConcluido = vi.fn();
  render(<ImageUpload api={api as unknown as ApiClient} mesaId="mesa" destino="retrato" alvo="lia" versao={3}
    rotulo="retrato" onConcluido={onConcluido} {...extras} />);
  return onConcluido;
}

function escolher(file: File) {
  fireEvent.change(screen.getByLabelText("Arquivo de imagem para retrato"), { target: { files: [file] } });
}

describe("ImageUpload — envio de imagem reutilizável (7.8)", () => {
  afterEach(() => cleanup());

  it("recusa antes de enviar um arquivo acima do limite do ponto", () => {
    const PUT = vi.fn();
    montar({ PUT });
    escolher(arquivo("grande.png", "image/png", 12 * 1024 * 1024));
    expect(screen.getByRole("alert").textContent).toBe("A imagem passa do limite de 5 MB para retrato.");
    expect(PUT).not.toHaveBeenCalled();
  });

  it("recusa formatos que não são PNG, JPEG ou WEBP", () => {
    const PUT = vi.fn();
    montar({ PUT });
    escolher(arquivo("anim.gif", "image/gif", 100));
    expect(screen.getByRole("alert").textContent).toBe("Envie uma imagem PNG, JPEG ou WEBP.");
    expect(PUT).not.toHaveBeenCalled();
  });

  it("mostra em texto a recusa do servidor", async () => {
    const PUT = vi.fn(async () => ({ data: undefined, error: { detail: "O conteúdo não corresponde ao formato da imagem." } }));
    montar({ PUT });
    escolher(arquivo("falso.png", "image/png", 100));
    expect((await screen.findByRole("alert")).textContent).toBe("O conteúdo não corresponde ao formato da imagem.");
  });

  it("envia arquivo, alvo e versão num FormData e avisa o fim", async () => {
    const resposta = { destino: "retrato", alvo: "lia", objeto: "mesas/mesa/personagens/lia/imagens/abc.png", exibicao: null, versao: 4 };
    const PUT = vi.fn(async () => ({ data: resposta, error: undefined }));
    const onConcluido = montar({ PUT });
    escolher(arquivo("retrato.png", "image/png", 100));
    await waitFor(() => expect(onConcluido).toHaveBeenCalledWith(resposta));
    const [rota, opcoes] = PUT.mock.calls[0] as unknown as [string, { params: unknown; body: FormData }];
    expect(rota).toBe("/mesas/{mesa_id}/imagens/{destino}");
    expect(opcoes.params).toEqual({ path: { mesa_id: "mesa", destino: "retrato" } });
    expect(opcoes.body.get("alvo")).toBe("lia");
    expect(opcoes.body.get("versao_esperada")).toBe("3");
    expect((opcoes.body.get("arquivo") as File).name).toBe("retrato.png");
    expect(screen.getByRole("status").textContent).toBe("Imagem de retrato atualizada.");
  });

  it("remove a imagem atual", async () => {
    const DELETE = vi.fn(async () => ({ data: { destino: "retrato", alvo: "lia", objeto: null, exibicao: null, versao: 4 }, error: undefined }));
    const onConcluido = montar({ DELETE }, { temImagem: true });
    expect(screen.getByRole("button", { name: "Trocar retrato" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remover retrato" }));
    await waitFor(() => expect(onConcluido).toHaveBeenCalled());
    expect(DELETE).toHaveBeenCalledWith("/mesas/{mesa_id}/imagens/{destino}", {
      params: { path: { mesa_id: "mesa", destino: "retrato" }, query: { alvo: "lia", versao_esperada: 3 } },
    });
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar({ PUT: vi.fn() }, { temImagem: true });
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
