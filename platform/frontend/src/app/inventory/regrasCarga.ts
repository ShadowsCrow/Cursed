/** Resumo de "Levantar, empurrar e arrastar objetos" (rules/sistema/Carga.md). A grade não calcula isso: é teste do Narrador. */
export const REGRA_LEVANTAR = [
  "Levantar: o que cabe na grade, inclusive na área vermelha, é erguido e levado sem teste. Para sustentar algo que não cabe, 1d20 + Força + Esportes contra CD 18 (22 em condições desfavoráveis): segura até o início do próximo turno, move-se no máximo 1 m e não pode Correr.",
  "Empurrar ou arrastar: ação inteira, move o objeto até 1 m. Em condições desfavoráveis, o Narrador pode pedir Força + Esportes contra CD 18 (22 em situações severas).",
  "Pesado demais: o Narrador decide; é preciso ajuda, ferramenta, habilidade ou magia.",
  "Trabalho em equipe: quem faz o teste recebe +1 por ajudante, até +3.",
].join("\n");
