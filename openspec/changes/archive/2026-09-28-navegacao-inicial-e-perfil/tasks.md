# Tasks — navegacao-inicial-e-perfil

## 1. Regras, decisões e arte

Nenhuma regra de mesa ou catálogo muda nesta mudança.

- [x] 1.1 Criar `HANDOFF.md` da mudança com a classificação (núcleo, plataforma e interface), as decisões do usuário (Google além de e-mail/senha; "Gestão de mesas" leva a Campanhas; cópia independente; Biblioteca com regras do repositório e visão geral redigida e aprovada) e as perguntas abertas do design; atualizar `AGENTS.md` para apontar a mudança ativa correta; verificar que ambos existem e se referenciam.
- [x] 1.2 Resolver com o usuário as perguntas abertas do design (documentos duplicados de Dano de Queda, ordem das Regras, textos da abertura do Início) e registrar no `HANDOFF.md`.
- [x] 1.3 Receber as imagens de `arte/prompts.md` em `platform/frontend/arte-original/`, revisar (sem texto, moldura nem marca d'água; contraste do texto sobre as áreas escuras; transparência/halo do canto de moldura) e registrar o resultado no `HANDOFF.md`.
- [x] 1.4 Estender `scripts/preparar_arte.py` para as novas imagens (recortes, larguras, WebP; design D10); verificar com o teste Python do script (saídas, dimensões, total de `public/arte/` abaixo de 6 MB). *A moldura por imagem foi retirada na revisão visual (2026-09-28): molduras seguem o SVG do Resumo.*

## 2. Dados e migração

- [x] 2.1 Migração `0018_perfil_e_campanha`: `user_profiles.apelido`, `foto_objeto`, `perfil_confirmado_em`; `rpg_tables.sinopse`, `capa_objeto`, `sistema` (padrão `'cursed'`); `characters.procedencia` (JSON nulo). Verificar com teste de migração em SQLite (sobe e desce) e com `test_fichas_existentes_inalteradas.py` verde.
- [x] 2.2 Aplicar a 0018 no Supabase de testes e registrar no `HANDOFF.md` (depende de autorização do usuário).

## 3. Servidor

- [x] 3.1 Perfil (design D4): `perfis.lembrar` não toca em `apelido`; `perfis.nomes` devolve `coalesce(apelido, nome)`; `GET/PUT /perfil` com validação de 2–40 caracteres e `apelido_sugerido`. Verificar com testes: apelido sobrevive a novo login com outro `full_name`; participantes, histórico e sala mostram o apelido; `PUT` com "R" é recusado.
- [x] 3.2 Foto do perfil (D5): `PUT/DELETE /perfil/foto` e URL assinada autorizada. Verificar: envio válido, limite 5 MB, extensão falsa recusada, colega de mesa ativa lê, pessoa sem mesa em comum e participante removido recebem 404, outra pessoa não troca a foto.
- [x] 3.3 Dados da campanha (D6): `MesaResumo` com `sistema`, `capa_url`, `sinopse`; `GET /mesas/{id}` com participantes (apelido/foto) e `PUT /mesas/{id}` só Narrador, auditado; `sistema` diferente de `cursed` recusado. Verificar com testes de API, inclusive mesa antiga sem capa nem sinopse.
- [x] 3.4 Capa (D5): destino `capa` em `/mesas/{id}/imagens`, só Narrador, 8 MB, auditado sem a imagem. Verificar: Narrador envia e remove, jogador recusado, participante lê, não participante recebe 404.
- [x] 3.5 Acervo (D7): `GET /acervo/personagens?colecao=`. Verificar com testes de negação: `meus` só traz personagens próprios de mesas ativas; `npcs`/`monstros` só de mesas narradas; lixeira e mesa da qual foi removido ficam de fora; outra pessoa nunca aparece.
- [x] 3.6 Cópia (D8): `POST /mesas/{destino}/personagens/copias`. Verificar: personagem de jogador vira NPC oculto; monstro continua monstro; PV/PP cheios; sem efeitos, Desgaste, Consequências, inventário e cartas; retrato copiado com referência nova; procedência gravada e auditada; origem inalterada; destino só jogado recusado; origem sem acesso → 404; valores fora do padrão preservados sem ajuste (NPCs e monstros não seguem os limites de personagem; ver design D8); cartas só as de classe, arquétipo e raça.
- [x] 3.7 Regenerar `platform/api/openapi.json` e o cliente; verificar com `python -m cursed_platform.export_openapi --check` e `npm run check:client`.

## 4. Interface — base visual e casco

- [x] 4.1 Componentes em `src/ui/` (D10): `BarraSuperior`, `MolduraOrnamentada` (SVG do Resumo por `border-image`: painel/quadro × noite/sangue/vazio/pergaminho), `CartaoAtalho`, `ListaLateral`/`ItemLateral`, `AlternanciaSegmentada`, `Avatar` (foto ou iniciais), `FaixaDeAbertura`, `PontosDeValor` e ícones de linha. Verificar com testes de componente (ornamentos `aria-hidden`, estado atual anunciado, avatar sem foto mostra iniciais) e adicioná-los ao `ComponentCatalog.tsx`.
- [x] 4.2 Prova visual das seções em `/preview/plataforma` (Início, Campanhas, Personagens, Biblioteca com dados fictícios) e capturas em 1440 px e 360 px; **apresentar ao usuário lado a lado com `exemplo/`** e ajustar até a aprovação antes de ligar as telas aos dados.
- [x] 4.3 Rotas e `CascoPlataforma` (D2) com barra superior, menu recolhido em tela pequena e redirecionamento para `/boas-vindas` sem perfil confirmado; links "Campanhas" na mesa, na ficha e no assistente. Verificar com testes de rota (recarregar mantém seleção; `/mesas/{id}` antigo continua abrindo) e teste de teclado no menu recolhido.

## 5. Interface — conta e perfil

- [x] 5.1 Telas `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` com a arte de entrada; botão "Entrar com Google"; mensagens neutras. Verificar com testes usando o cliente Supabase simulado: cadastro mostra "confirme seu e-mail" também para e-mail existente; senha errada não diz qual campo errou; Google chama `signInWithOAuth` com o `redirectTo` da origem.
- [x] 5.2 `/boas-vindas` e `/perfil`: apelido pré-preenchido, foto opcional (enviar, trocar, remover), e-mail e provedor; menu do avatar com "Meu perfil" e "Sair". Verificar com testes de componente e e2e (primeiro acesso no modo de desenvolvimento sugere "Jogador 1"; sair limpa os dados e volta à entrada).

## 6. Interface — Início e Campanhas

- [x] 6.1 Início: abertura com título, "Criar campanha" (vermelho, diálogo com o nome) e "Gestão de mesas" (leva a Campanhas), atalhos para as três seções. Verificar com teste de componente e e2e (criar campanha abre Campanhas com ela selecionada em Narrando).
- [x] 6.2 Campanhas: alternância Narrando/Jogando com contagem e regra de lado inicial; lista com capa, nome e sistema; "Nova campanha" e "Entrar com convite"; estados vazios. Verificar com testes de componente (pessoa só jogadora abre em Jogando; troca de lado filtra) e e2e (convite válido e inválido).
- [x] 6.3 Campanha selecionada: faixa com a capa, nome, sistema, sinopse, personagens visíveis, participantes, "Entrar na mesa", "Criar personagem" quando cabível; para o Narrador, editar nome/sinopse/capa e "Convidar jogadores". Verificar com testes de componente e e2e (jogador não vê NPC oculto; Narrador edita a sinopse e o jogador vê a nova).

## 7. Interface — Personagens

- [x] 7.1 Coleções Meus personagens / NPCs / Monstros, lista com retrato, nome, classe/tipo e campanha, estados vazios explicativos. Verificar com testes de componente e teste de API já coberto em 3.5.
- [x] 7.2 Vitrine no formato do **Resumo da ficha** (decisão do usuário, 2026-09-28): o mesmo `ResumoFicha`, só de leitura, com as mesmas consultas da ficha; atalhos dos quadros abrem a ficha na seção; "Abrir ficha" e "Copiar para campanha" acima. Verificar com teste de componente (Resumo presente com os valores do servidor; sem envio de ilustração; atalho leva a `?secao=atributos`) e no e2e (valores iguais aos da aba Resumo).
- [x] 7.3 "Copiar para campanha": diálogo com as campanhas narradas, confirmação e resultado (link para a campanha de destino); explicação quando não há campanha narrada. Verificar com e2e: jogadora copia o próprio personagem para a campanha que narra e ele aparece como NPC oculto lá e em NPCs no acervo.

## 8. Interface — Biblioteca

- [x] 8.1 Lista `biblioteca/documentos.ts` (slug, título, ordem, excluídos) e carga dos `.md` de `rules/sistema` na compilação (D9), com teste que falha quando surge um documento não classificado. Verificar com o teste e com `npm run build`.
- [x] 8.2 Leitor de regras com `react-markdown` + `remark-gfm` em import dinâmico, sem HTML bruto, índice pelos títulos `##`, tabelas roláveis dentro do contêiner. Verificar com testes de componente (tabela de "Carga" vira `<table>`; HTML embutido não é executado) e captura em 360 px sem rolagem horizontal da página.
- [x] 8.3 Redigir `visao-geral.md` a partir do livro, com links para os documentos, sem regra nova; **apresentar ao usuário e só marcar depois da aprovação**. Verificar os links com teste (todo link aponta para um slug existente).

## 9. Verificação e entrega

A antiga 9.4 (validação de uso com uma pessoa que não conhece a plataforma) foi retirada: a regra do projeto de 2026-09-28 (`openspec/config.yaml`) proíbe tarefas de validação em mesa ou com jogadores; a verificação fecha com testes automatizados e a aprovação do usuário (4.2 e 8.3).

- [x] 9.1 Acessibilidade: `axe-core` sem violações nas seções novas; navegação completa só pelo teclado (entrar, confirmar perfil, criar campanha, trocar lado, abrir vitrine, copiar, ler uma regra) em desktop e 360 px.
- [x] 9.2 Suítes completas verdes: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `python -m unittest discover -s cursed_platform/tests -t .`, `export_openapi --check`, `npm run check:client`; `npm run capturas` com as telas novas.
- [ ] 9.3 **Adiada por decisão do usuário (2026-09-28).** Configuração real do Google (cliente OAuth e URLs no Supabase), ativação de `VITE_LOGIN_GOOGLE=1` e teste manual de entrada pelo Google em produção e em `localhost`; registrar no `HANDOFF.md`. Não bloqueia o arquivamento se o botão continuar oculto.
- [x] 9.5 Commit em branch própria, push e execução verde do workflow `platform-contract.yml`; registrar no `HANDOFF.md`.
