/*
 * Documentos do livro de regras mostrados na Biblioteca (design D9 de navegacao-inicial-e-perfil).
 * O texto vem de `rules/sistema` na compilação, sem cópia manual. Esta lista decide só quais
 * documentos aparecem, em que ordem e com que endereço; um teste falha se surgir um documento que
 * não esteja nem aqui nem entre os excluídos.
 */

export interface DocumentoDeRegra {
  slug: string;
  titulo: string;
  arquivo: string;
}

// Ordem da criação de personagem, com os apêndices por último (decisão do usuário, 2026-09-28).
export const DOCUMENTOS: DocumentoDeRegra[] = [
  { slug: "criacao-de-personagem", titulo: "Criação de Personagem", arquivo: "Criação de Personagem.md" },
  { slug: "atributos-e-pericias", titulo: "Atributos e Perícias", arquivo: "Atributos e Perícias.md" },
  { slug: "rolagens", titulo: "Rolagens", arquivo: "Rolagens.md" },
  { slug: "progressao-e-proficiencia", titulo: "Progressão e Proficiência", arquivo: "Progressão e Proficiência.md" },
  { slug: "vantagens-e-desvantagens", titulo: "Vantagens e Desvantagens", arquivo: "Vantagens e Desvantagens.md" },
  { slug: "equipamentos", titulo: "Equipamentos", arquivo: "Equipamentos.md" },
  { slug: "carga", titulo: "Carga", arquivo: "Carga.md" },
  { slug: "defesa", titulo: "Defesa", arquivo: "Defesa.md" },
  { slug: "iniciativa-movimento-e-posicionamento", titulo: "Iniciativa, Movimento e Posicionamento", arquivo: "Iniciativa, Movimento e Posicionamento.md" },
  { slug: "turnos-e-acoes", titulo: "Turnos e Ações", arquivo: "Turnos e Ações.md" },
  { slug: "condicoes-e-tipos-de-dano", titulo: "Condições e Tipos de Dano", arquivo: "Condições e Tipos de Dano.md" },
  { slug: "exaustao-e-estresse", titulo: "Exaustão e Estresse", arquivo: "Exaustão e Estresse.md" },
  { slug: "descansos-e-recuperacao", titulo: "Descansos e Recuperação", arquivo: "Descansos e Recuperação.md" },
  { slug: "morte-e-inconsciencia", titulo: "Morte e Inconsciência", arquivo: "Morte e Inconsciência.md" },
  { slug: "dano-de-queda", titulo: "Dano de Queda", arquivo: "Dano de queda.md" },
  { slug: "mecanicas-unicas", titulo: "Mecânicas Únicas do Sistema", arquivo: "Mecânicas Únicas do Sistema.md" },
  { slug: "acesso-e-graus-de-magia", titulo: "Acesso e Graus de Magia", arquivo: "Acesso e Graus de Magia.md" },
  { slug: "escolas-de-magia", titulo: "Escolas de Magia", arquivo: "Escolas de Magia.md" },
  { slug: "framework-de-magias-e-habilidades", titulo: "Criação, Aprendizado e Uso de Magias e Habilidades", arquivo: "Framework de Criação, Aprendizado e Uso de Magias e Habilidades.md" },
  { slug: "apendice-carga-e-transporte", titulo: "Apêndice — Carga e Transporte", arquivo: "Apêndice — Carga e Transporte.md" },
  { slug: "apendice-dano-de-queda", titulo: "Apêndice — Dano de Queda", arquivo: "Apêndice — Dano de Queda.md" },
];

/** Arquivos de `rules/sistema` que não são regras para ler na plataforma. */
export const EXCLUIDOS = ["Roadmap.md", "Sistema RPG.docx"];

const CARREGADORES = import.meta.glob<string>("../../../../../../rules/sistema/*.md", { query: "?raw", import: "default" });

export function nomeDoArquivo(caminho: string): string {
  return caminho.slice(caminho.lastIndexOf("/") + 1);
}

/** Arquivos `.md` presentes em `rules/sistema` na compilação. */
export function arquivosDisponiveis(): string[] {
  return Object.keys(CARREGADORES).map(nomeDoArquivo);
}

export function acharDocumento(slug: string | undefined): DocumentoDeRegra | undefined {
  return DOCUMENTOS.find((documento) => documento.slug === slug);
}

export function documentoDoArquivo(arquivo: string): DocumentoDeRegra | undefined {
  const alvo = arquivo.normalize("NFC");
  return DOCUMENTOS.find((documento) => documento.arquivo.normalize("NFC") === alvo);
}

export async function carregarDocumento(documento: DocumentoDeRegra): Promise<string> {
  const chave = Object.keys(CARREGADORES).find((caminho) => nomeDoArquivo(caminho).normalize("NFC") === documento.arquivo.normalize("NFC"));
  const carregar = chave ? CARREGADORES[chave] : undefined;
  if (!carregar) throw new Error(`Documento indisponível: ${documento.titulo}.`);
  return carregar();
}
