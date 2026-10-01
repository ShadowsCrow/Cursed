/** Perícias com ícone próprio na aba (chave de `chaveDerivada` sem o prefixo "pericia:"). */
export const ICONES_DAS_PERICIAS = [
  "prontidao", "esportes", "briga", "esquiva", "empatia", "expressao", "intimidacao", "lideranca", "conhecimento_urbano", "labia",
  "lidar_com_animais", "oficios", "pilotagem", "etiqueta", "longo_alcance", "armas_brancas", "performance", "prestidigitacao", "furtividade", "sobrevivencia",
  "academicos", "arcanismo", "financas", "investigacao", "direito", "linguistica", "medicina", "ocultismo", "politica", "natureza",
] as const;

export type NomeIconePericia = (typeof ICONES_DAS_PERICIAS)[number];
