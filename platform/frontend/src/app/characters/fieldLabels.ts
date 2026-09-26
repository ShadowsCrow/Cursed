/** Rótulos legíveis para caminhos da ficha exibidos ao Narrador (aprovações e registros). */
const DIRETOS: Record<string, string> = {
  "personagem.nome": "Nome",
  "personagem.raca": "Raça",
  "personagem.classe": "Classe",
  "personagem.arquetipo": "Arquétipo",
  "personagem.nivel": "Nível",
  "personagem.idade": "Idade",
  "personalidade.alinhamento": "Alinhamento",
  "personalidade.pecado": "Pecado",
  "personalidade.meu_lema": "Lema",
};

const SECOES: Record<string, string> = { atributos: "Atributo", pericias: "Perícia" };
const PARTES: Record<string, string> = { valores: "base", ajustes: "ajuste manual" };

export function rotuloCampo(caminho: string): string {
  const direto = DIRETOS[caminho];
  if (direto) return direto;
  const [secao, parte, ...nome] = caminho.split(".");
  if (secao && parte && nome.length && SECOES[secao] && PARTES[parte]) {
    return `${nome.join(".")} (${PARTES[parte]})`;
  }
  return caminho;
}
