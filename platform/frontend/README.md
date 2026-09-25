# Frontend

Esta pasta contém a aplicação React/TypeScript com Vite, rotas tipadas,
TanStack Query para cache remoto e o cliente HTTP tipado da nova API. A página
inicial já autentica e lista as mesas; painéis de mesa, ficha viva e design
system serão adicionados nas próximas tarefas.

Na raiz do repositório, gere o OpenAPI com
`python -m cursed_platform.export_openapi`. Depois, em `platform/frontend`,
execute `npm install` e `npm run generate:client`. O cliente gerado fica em
`src/api/generated/schema.ts`; `src/api/client.ts` o usa com `openapi-fetch`.
Execute `npm run dev` e abra `http://localhost:5173/preview` para navegar na
prévia visual com dados fictícios, sem configurar banco ou Supabase. Alterne
entre Narrador e jogador no topo. Nenhuma ação dessa prévia grava dados. Em
`http://localhost:5173/preview/componentes` fica o catálogo visual isolado das
primitivas de acessibilidade (diálogo, painel lateral, confirmação, popover,
tooltip e menu) e dos componentes de retrato, barra de recurso, ícone de
efeito, slot de equipamento e carta base, em todos os seus estados.

Para a aplicação autenticada, copie `.env.example` para `.env` com valores de
desenvolvimento e abra `http://localhost:5173/`. Use `npm run build`,
`npm run lint` e `npm test` antes de integrar.

Os comandos `python -m cursed_platform.export_openapi --check`,
`npm run check:client` e `npm run typecheck` são as verificações locais do
contrato. Um endpoint ou campo alterado na API exige gerar o OpenAPI e o cliente
novamente antes de passar no CI.

`src/app/clients.ts` conecta o cliente HTTP à sessão Supabase. O navegador
obtém ou renova o token da sessão e o envia como Bearer; a API valida a
identidade novamente antes de consultar fichas. O exemplo de variáveis para a
aplicação Vite está em `.env.example`. Nenhuma chave privada deve ser
colocada nessas variáveis do navegador.
