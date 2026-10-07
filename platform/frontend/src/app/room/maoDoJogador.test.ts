import { describe, expect, it } from "vitest";

import { personagensControlados } from "./maoDoJogador";

describe("personagens da mão do jogador (cartas-na-cena)", () => {
  const personagens = [
    { id: "lia", nome: "Lia", proprietario_id: "ana" },
    { id: "kira", nome: "Kira", proprietario_id: "bia" },
  ];

  it("inclui a ficha própria e um companion cujo token o Narrador liberou para o jogador", () => {
    const tokens = [
      { personagem_id: "lia", rotulo: "Lia", controlador: true },
      { personagem_id: "lia", rotulo: "Lia 2", controlador: true },
      { personagem_id: "bolota", rotulo: "Bolota", controlador: true },
      { personagem_id: "kira", rotulo: "Kira", controlador: false },
      { personagem_id: null, rotulo: "Baú", controlador: false },
    ];
    expect(personagensControlados(tokens, personagens, "ana")).toEqual([
      { id: "lia", nome: "Lia" }, { id: "bolota", nome: "Bolota" },
    ]);
  });

  it("a ficha própria entra mesmo com o token bloqueado; sem token na cena, não entra", () => {
    expect(personagensControlados([{ personagem_id: "lia", rotulo: "Lia", controlador: false }], personagens, "ana"))
      .toEqual([{ id: "lia", nome: "Lia" }]);
    expect(personagensControlados([], personagens, "ana")).toEqual([]);
  });
});
