import { describe, expect, it } from "vitest";

import visaoGeral from "./visao-geral.md?raw";
import { acharDocumento, arquivosDisponiveis, carregarDocumento, documentoDoArquivo, DOCUMENTOS, EXCLUIDOS } from "./documentos";
import { ancora, titulosDoIndice } from "./markdown";

describe("documentos da Biblioteca (8.1)", () => {
  it("todo documento de rules/sistema está na lista ou entre os excluídos", () => {
    const classificados = new Set([...DOCUMENTOS.map((d) => d.arquivo), ...EXCLUIDOS].map((nome) => nome.normalize("NFC")));
    const semClassificacao = arquivosDisponiveis().filter((arquivo) => !classificados.has(arquivo.normalize("NFC")));
    expect(semClassificacao).toEqual([]);
  });

  it("os dois documentos de Dano de Queda aparecem, apêndices por último e o Roadmap fica de fora", () => {
    const titulos = DOCUMENTOS.map((d) => d.titulo);
    expect(titulos).toContain("Dano de Queda");
    expect(titulos).toContain("Apêndice — Dano de Queda");
    expect(titulos[0]).toBe("Criação de Personagem");
    const primeiroApendice = titulos.findIndex((t) => t.startsWith("Apêndice"));
    expect(titulos.slice(primeiroApendice).every((t) => t.startsWith("Apêndice"))).toBe(true);
    expect(DOCUMENTOS.some((d) => d.arquivo === "Roadmap.md")).toBe(false);
  });

  it("slugs únicos e todo documento listado carrega o texto do repositório", async () => {
    expect(new Set(DOCUMENTOS.map((d) => d.slug)).size).toBe(DOCUMENTOS.length);
    for (const documento of DOCUMENTOS) {
      const texto = await carregarDocumento(documento);
      expect(texto.length, documento.arquivo).toBeGreaterThan(100);
    }
  });

  it("a visão geral só aponta para documentos existentes (8.3)", () => {
    const links = [...visaoGeral.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => decodeURIComponent(m[1] ?? ""));
    expect(links.length).toBeGreaterThan(8);
    for (const link of links) expect(documentoDoArquivo(link), link).toBeTruthy();
  });

  it("âncoras e índice pelos títulos ##, ignorando código", () => {
    expect(ancora("Força ou Tamanho reduzidos")).toBe("forca-ou-tamanho-reduzidos");
    expect(titulosDoIndice("# T\n## A grade\n```\n## não\n```\n### x\n## **Itens**")).toEqual([
      { texto: "A grade", id: "a-grade" }, { texto: "Itens", id: "itens" },
    ]);
    expect(acharDocumento("carga")?.arquivo).toBe("Carga.md");
  });
});
