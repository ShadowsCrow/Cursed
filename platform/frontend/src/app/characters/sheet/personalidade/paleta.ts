/**
 * Paleta da folha da Personalidade, medida na referência do usuário (referencia/medidas.md; reformular-personalidade-da-ficha).
 * O componente a aplica como variáveis CSS (`--pers-*`) na folha, e o teste de contraste lê daqui. O rótulo e o
 * vazio saíram um pouco mais escuros que a mediana da imagem (#7a562d e #726752) para ter 4,5:1 no pergaminho.
 */
export const PALETA_PERSONALIDADE = {
  "pers-titulo": "#1a0f06",
  "pers-eyebrow": "#765123",
  "pers-subtitulo": "#5b4d33",
  "pers-citacao": "#573e21",
  "pers-rotulo": "#76532c",
  "pers-valor": "#272517",
  "pers-vazio": "#635a47",
  "pers-icone": "#5a3816",
  "pers-historia": "#4d402d",
  "pers-filete": "#b8905c",
  "pers-etiqueta-fundo": "#e3c18a",
  "pers-etiqueta-borda": "#a07a45",
  "pers-etiqueta-texto": "#583e12",
  "pers-botao-fundo": "#f4e3c2",
  "pers-botao-borda": "#c9af84",
  "pers-botao-texto": "#201e15",
  "pers-quadro": "#f2dcb4",
  "pers-noite": "#13212c",
} as const;

export type CorDaPaleta = keyof typeof PALETA_PERSONALIDADE;
