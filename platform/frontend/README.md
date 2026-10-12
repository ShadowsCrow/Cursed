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

## Testes ponta a ponta

`npm run test:e2e` cria um SQLite descartável, aplica Alembic, inicia API e
Vite com identidades locais, executa Playwright em Chromium e encerra os
serviços ao terminar. A suíte usa contextos separados de Narrador e jogador
para mesa, ficha, auditoria, oferta de cartas, segredos e recuperação do
snapshot da sala após desconexão. Cada execução semeia dados em um banco novo;
`CURSED_E2E_PYTHON` pode apontar para outro executável Python. O CI instala
Chromium e executa a mesma suíte após os testes de componentes.

## Capturas de tela

`npm run capturas` cria dados de exemplo pela API e salva capturas das
principais telas, em desktop e celular, em `.screenshots/` (fora do Git).
Requer uma API em modo de desenvolvimento em `API_URL` (padrão
`http://127.0.0.1:8001`, com `CURSED_DEV_AUTH=1` e um banco descartável) e um
Vite em `APP_URL` (padrão `http://localhost:5174`) apontando para ela. Use
`SOMENTE=02-visao-geral,06-ficha-informacoes` para capturar só algumas telas.

## Arte e fontes do tema

As ilustrações do tema (castelo do cabeçalho, texturas de noite e pergaminho, emblema, retrato de
reserva e uma ilustração por etapa do assistente de criação) são geradas fora do repositório. As
matrizes em PNG (≈ 32 MB) ficam em `platform/frontend/arte-original/`, **ignorada pelo Git**; só as
versões otimizadas em `public/arte/` (WebP, ≈ 2 MB) e os ícones da aba (`public/favicon-16.png`,
`public/favicon-32.png`) são versionados.

Para gerar de novo as versões otimizadas, com as matrizes no lugar, rode na raiz do repositório:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```

O script usa só o Pillow da plataforma. Ele recorta a âncora em 2:1 a partir do topo (1536 e 768 px),
corrige a emenda das texturas e as reduz a 512×512, limpa o halo avermelhado do emblema (256 e
1024 px, sem perda), recorta o retrato em 3:4 e reduz as etapas a 1200×800. O teste
`cursed_platform/tests/test_preparar_arte.py` confere dimensões, tamanho total, emenda, halo e o
contraste do texto sobre a arte já escurecida pelas camadas de `src/ui/tema.css` (é pulado sem as
matrizes).

Para trocar ou regenerar uma imagem, siga o guia e os prompts de
`openspec/changes/criacao-guiada-e-nova-estetica/arte/prompts.md` (depois do arquivamento da mudança,
em `openspec/changes/archive/`), salve o PNG em `arte-original/` com o mesmo nome e rode o script.
Nenhuma imagem pode conter texto: o nome "CURSED" e os rótulos são texto da interface.

As fontes (Cormorant Garamond para títulos e Alegreya Sans para leitura, licença SIL OFL 1.1) ficam
em `public/fonts` e são declaradas em `src/design/fonts.css` com `font-display: swap`: se não
carregarem, o texto aparece nas alternativas do sistema declaradas em `src/design/tokens.css`.
