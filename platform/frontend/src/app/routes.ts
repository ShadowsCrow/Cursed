export const routePatterns = {
  home: "/",
  table: "/mesas/:mesaId",
  character: "/mesas/:mesaId/personagens/:personagemId",
  createCharacter: "/mesas/:mesaId/criar-personagem",
  campanhas: "/campanhas",
  campanha: "/campanhas/:mesaId",
  personagens: "/personagens",
  colecao: "/personagens/:colecao",
  personagemDoAcervo: "/personagens/:colecao/:mesaId/:personagemId",
  biblioteca: "/biblioteca",
  regras: "/biblioteca/regras",
  documento: "/biblioteca/regras/:documento",
  perfil: "/perfil",
  boasVindas: "/boas-vindas",
  entrar: "/entrar",
  cadastro: "/cadastro",
  recuperarSenha: "/recuperar-senha",
  redefinirSenha: "/redefinir-senha",
} as const;

const segmento = encodeURIComponent;

export const routes = {
  home: () => "/" as const,
  table: (mesaId: string) => `/mesas/${segmento(mesaId)}` as const,
  character: (mesaId: string, personagemId: string) =>
    `/mesas/${segmento(mesaId)}/personagens/${segmento(personagemId)}` as const,
  createCharacter: (mesaId: string) => `/mesas/${segmento(mesaId)}/criar-personagem` as const,
  campanhas: () => "/campanhas" as const,
  campanha: (mesaId: string) => `/campanhas/${segmento(mesaId)}` as const,
  personagens: (colecao: "meus" | "npcs" | "monstros" = "meus") => `/personagens/${colecao}` as const,
  personagemDoAcervo: (colecao: "meus" | "npcs" | "monstros", mesaId: string, personagemId: string) =>
    `/personagens/${colecao}/${segmento(mesaId)}/${segmento(personagemId)}` as const,
  biblioteca: () => "/biblioteca" as const,
  regras: () => "/biblioteca/regras" as const,
  documento: (slug: string) => `/biblioteca/regras/${segmento(slug)}` as const,
  perfil: () => "/perfil" as const,
  boasVindas: () => "/boas-vindas" as const,
  entrar: () => "/entrar" as const,
  cadastro: () => "/cadastro" as const,
  recuperarSenha: () => "/recuperar-senha" as const,
  redefinirSenha: () => "/redefinir-senha" as const,
};
