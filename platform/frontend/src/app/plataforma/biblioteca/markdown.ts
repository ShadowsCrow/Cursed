/** Âncoras e índice dos documentos da Biblioteca (sem React, para testar e reaproveitar). */

export function ancora(texto: string): string {
  return texto.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "secao";
}

/** Títulos `##` do documento, fora de blocos de código, para o índice. */
export function titulosDoIndice(markdown: string): { texto: string; id: string }[] {
  const titulos: { texto: string; id: string }[] = [];
  let emCodigo = false;
  for (const linha of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(linha)) emCodigo = !emCodigo;
    const encontrado = !emCodigo && /^##\s+(.+?)\s*#*\s*$/.exec(linha);
    if (encontrado && encontrado[1]) {
      const texto = encontrado[1].replace(/[*_`]/g, "");
      titulos.push({ texto, id: ancora(texto) });
    }
  }
  return titulos;
}
