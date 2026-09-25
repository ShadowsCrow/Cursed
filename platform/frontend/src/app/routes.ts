export const routePatterns = {
  home: "/",
  table: "/mesas/:mesaId",
  character: "/mesas/:mesaId/personagens/:personagemId",
} as const;

export const routes = {
  home: () => "/" as const,
  table: (mesaId: string) => `/mesas/${encodeURIComponent(mesaId)}` as const,
  character: (mesaId: string, personagemId: string) =>
    `/mesas/${encodeURIComponent(mesaId)}/personagens/${encodeURIComponent(personagemId)}` as const,
};
