// O projeto não depende de @types/node; os testes que leem arquivos do disco só precisam disto.
declare module "node:fs" {
  export function readFileSync(caminho: URL | string, codificacao: "utf-8"): string;
}
