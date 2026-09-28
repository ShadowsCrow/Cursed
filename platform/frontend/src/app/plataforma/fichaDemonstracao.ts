/** Ficha ilustrativa da prévia e dos testes da vitrine (valores inventados só para demonstração). */
export const FICHA_DEMONSTRACAO = {
  personagem: { nome: "Caelren", idade: 120, sexo: "Masculino", altura: "1,78 m", raca: "Elfo", classe: "Mago", arquetipo: "Mutante Arcano", nivel: 3 },
  personalidade: { alinhamento: "Neutro | Bom", pecado: "Orgulho", vivo_para: "Decifrar as runas antigas", meu_lema: "A precisão é uma forma de beleza." },
  atributos: { valores: { "Força": 1, "Destreza": 2, "Vigor": 2, "Carisma": 1, "Manipulação": 1, "Proposito": 2, "Percepção": 1, "Inteligência": 3, "Raciocínio": 2 } },
  pericias: { valores: { "Arcanismo": 3, "Acadêmicos": 2, "Investigação": 2, "Prontidão": 2, "Ocultismo": 1, "Linguistica": 1, "Medicina": 1, "Esquiva": 1 } },
  recursos: { pv: { atual: 14 }, pp: { atual: 9 } },
};

/** Valores derivados de exemplo (chave, rótulo, grupo, total) que acompanham a ficha acima. */
export const VALORES_DEMONSTRACAO: [string, string, string, number][] = [
  ["recurso:pv_maximo", "PV máximo", "recurso", 19],
  ["recurso:pp_maximo", "PP máximo", "recurso", 12],
  ["defesa:esquiva", "Defesa (Esquiva)", "defesa", 4],
  ["defesa:armadura", "Defesa (Armadura)", "defesa", 2],
];
