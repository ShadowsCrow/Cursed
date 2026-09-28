# Design — navegacao-inicial-e-perfil

## Context

- **Entrada hoje:** `App.tsx` mostra um formulário `signInWithPassword` (Supabase) e, depois, a lista `Tables` com links em texto e os formulários "Criar mesa" e "Entrar com convite". O modo de desenvolvimento (`DevApp.tsx`) entra escolhendo `narrador`, `jogador-1`… sem Supabase.
- **Perfil:** `user_profiles(usuario_id, nome, atualizado_em)` (migração 0011). `perfis.lembrar` **sobrescreve** o nome a cada requisição com o nome da identidade (`display_name`, `full_name`, parte do e-mail). Não há foto.
- **Mesa:** `rpg_tables(id, nome, narrador_id, políticas…)`, `MesaResumo(id, nome, papel)`. Não há capa, sinopse nem sistema. Convites: `POST /mesas/{id}/convites`, `POST /convites/aceitar`.
- **Personagens:** `characters(id, mesa_id, proprietario_id, tipo ∈ {personagem, npc, monstro}, visibilidade, ficha JSON…)`, sempre ligados a uma mesa. Retrato em `ficha.personagem.imagem_ativo`, no armazenamento privado (`images.py`, destinos por mesa). NPCs e monstros nascem por `POST /mesas/{id}/entidades`.
- **Tema:** a primeira fatia (`criacao-guiada-e-nova-estetica`) deixou tokens em três camadas (`src/design/tokens.css`), fontes locais (Cormorant Garamond e Alegreya Sans), componentes `src/ui/Tema.tsx` (moldura, pergaminho, título ornado, selos, `Marca`) e arte em `public/arte/` gerada por `scripts/preparar_arte.py`. Molduras, cantos e divisores são CSS/SVG por decisão do usuário.
- **Regras:** `rules/sistema/*.md` (mais `Sistema RPG.docx` e `Roadmap.md`). O frontend não tem biblioteca de Markdown.
- **Referência visual:** `platform/frontend/exemplo/{Inicio,Campanha,Personagens,Biblioteca}.png`.

## Goals / Non-Goals

**Goals:**
- Casco novo fora da mesa (barra superior + quatro seções) fiel à referência, reaproveitando o tema existente.
- Conta com cadastro, Google e perfil (apelido e foto) sem quebrar a autorização atual nem o modo de desenvolvimento.
- Dados mínimos de apresentação da campanha e a cópia independente de personagens entre mesas.
- Biblioteca que lê o livro de regras sem cópia manual.

**Non-Goals:** os listados na proposta (abas internas da campanha, busca, notificações, outros sistemas, novo visual da mesa, vínculo entre cópias).

## Decisions

### D1. "Campanha" é o nome de interface da mesa
O modelo continua `mesa` (`rpg_tables`, `/mesas/...`); a interface fora da mesa diz "campanha". Nenhuma tabela nova. *Alternativa descartada:* entidade Campanha acima da mesa — criaria duas noções para a mesma coisa sem necessidade hoje.

### D2. Rotas e casco
Novo `CascoPlataforma` (barra superior + `<Outlet>`) nas rotas:
`/` (Início), `/campanhas`, `/campanhas/:mesaId`, `/personagens`, `/personagens/:colecao` (`meus|npcs|monstros`), `/personagens/:colecao/:mesaId/:personagemId`, `/biblioteca`, `/biblioteca/regras/:documento`, `/perfil`, `/boas-vindas` (primeiro acesso). Rotas públicas: `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`. As rotas existentes (`/mesas/:mesaId`, ficha, `criar-personagem`, `/preview/*`) ficam **fora** do casco e ganham só o link "Campanhas" (volta para `/campanhas/:mesaId`). A alternância Narrando/Jogando é derivada do papel da campanha selecionada; sem seleção, lida de `localStorage` (`cursed:campanhas-lado:v1:{userId}`, em `try/catch`).

### D3. Autenticação no cliente, identidade no servidor
Cadastro, Google (`signInWithOAuth({ provider: "google" })`), recuperação e redefinição usam o Supabase Auth direto do cliente; o servidor continua só validando o JWT (`auth.py`), sem mudança. `redirectTo` usa a origem atual (`/boas-vindas` ou `/`). Mensagens de erro neutras (não revelam se o e-mail existe). O provedor Google é configurado pelo usuário no painel do Supabase (credenciais fora do repositório). *Pendência do usuário:* criar o cliente OAuth no Google Cloud e liberar as URLs de redirecionamento de produção e de `localhost`.

### D4. Apelido separado do nome da identidade
`user_profiles` ganha `apelido` (nulo até o primeiro acesso), `foto_objeto` (nulo) e `perfil_confirmado_em`. `perfis.lembrar` continua gravando `nome` (identidade) e **nunca** toca em `apelido`. `perfis.nomes()` devolve `coalesce(apelido, nome)`, então participantes, histórico e sala passam a mostrar o apelido sem mudar os chamadores. `GET /perfil` devolve `{apelido, apelido_sugerido, foto_url, email, provedor, confirmado}`; `PUT /perfil {apelido}` valida 2–40 caracteres e marca `perfil_confirmado_em`. O casco redireciona para `/boas-vindas` enquanto `confirmado` for falso.

### D5. Imagens: foto do perfil e capa
- **Capa:** novo destino `capa` em `PUT/DELETE /mesas/{id}/imagens/{destino}` (alvo = a própria mesa), só Narrador, prefixo `mesa/capa/`, limite 8 MB, auditado como os demais. Coluna `rpg_tables.capa_objeto`.
- **Foto:** `PUT/DELETE /perfil/foto` (fora da mesa), prefixo `usuarios/{id}/foto/`, limite 5 MB, mesma validação e redução de `cursed_platform/imagens.py`; sem auditoria de mesa.
- **Leitura:** pelo mesmo caminho das demais imagens (JSON com a imagem em base64, sem URL pública): a capa por `GET /mesas/{id}/ativos?caminho=...&exibicao=true`, que já autoriza participantes ativos do espaço `mesa/`; a foto por `GET /perfis/{usuario_id}/foto`, só para a própria pessoa e quem divide mesa ativa com ela (consulta em `table_memberships`). Fora disso, 404. *Ajuste na implementação:* o design previa URLs assinadas; o projeto não as usa em lugar nenhum.

### D6. Dados da campanha
`rpg_tables` ganha `sinopse` (texto, nulo), `capa_objeto` (nulo) e `sistema` (texto, padrão `'cursed'`). `MesaResumo` ganha `sistema`, `capa_objeto` (lido por `/ativos` com `exibicao=true`) e `sinopse`; `ParticipanteResumo` ganha `tem_foto`. Novo `GET /mesas/{id}` (detalhe: resumo + participantes com apelido/foto + contagem de personagens) e `PUT /mesas/{id} {nome, sinopse}` só Narrador, auditado. `sistema` é validado como `Literal["cursed"]`, então o contrato já prevê outros sistemas sem aceitá-los. O rótulo "Cursed" vem de um mapa no cliente (`sistemas.ts`), não do banco.

### D7. Acervo de personagens (consulta entre mesas)
`GET /acervo/personagens?colecao=meus|npcs|monstros` devolve, para mesas ativas da pessoa: `mesa_id`, `mesa_nome`, `personagem_id`, `tipo`, `nome`, `visibilidade`, `classe`, `arquetipo`, `raca`, `nivel`, `retrato_objeto`. Filtros no servidor: `meus` = `tipo='personagem' AND proprietario_id = eu` (e participação ativa); `npcs`/`monstros` = mesas em que sou Narrador. Exclui a lixeira. A vitrine é o **próprio Resumo da ficha** (`ResumoFicha`, da mudança aba-resumo-da-ficha), alimentado pelas mesmas consultas da página da ficha (ficha, valores derivados, inventário, cartas, classes e listas), em modo só de leitura: sem `permissoes`, então sem troca de ilustração nem convite para a História; os atalhos dos quadros abrem `/mesas/{m}/personagens/{p}?secao=…`. *Decisão do usuário (2026-09-28):* as fichas em Personagens usam o formato do Resumo, não uma vitrine própria. Nenhum cálculo no cliente.

### D8. Cópia independente
`POST /mesas/{destino}/personagens/copias {mesa_origem_id, personagem_origem_id}`:
1. Autoriza destino (Narrador) e origem (proprietário do personagem de jogador ou Narrador da mesa de origem); origem inacessível → 404.
2. Tipo: `personagem|npc → npc`, `monstro → monstro`. `proprietario_id = NULL`, visibilidade oculta (mesmo padrão de `POST /entidades`).
3. Copia o JSON da ficha; esvazia `armas`, `armaduras`, `outros` e `efeitos_externos`, remove `desgaste` e `consequencias`; PV/PP atuais = máximos calculados por `domain/recursos.calcular` (via `preparar_ficha_nova`); não copia inventário, efeitos aplicados nem cartas de oferta. As cartas de classe, arquétipo e raça são concedidas por `atualizar_cartas`, como em `POST /entidades`.
4. Valida com `exigir_ficha_valida(None, ficha, tipo=npc|monstro)`, a mesma da criação de entidades pelo Narrador. *Achado na implementação:* NPCs e monstros não seguem os limites de personagem (decisão de 2026-09-27, `TIPOS_VALIDADOS`), então a validação não recusa cópias; o spec foi ajustado para "valores preservados sem ajuste".
5. Copia o objeto do retrato (original e versão de exibição) para `mesas/{destino}/personagens/{novo}/imagens/` (nova referência).
6. Grava `procedencia = {mesa_id, personagem_id, copiado_em}` no registro (coluna JSON nova `characters.procedencia`, nula nos existentes) e audita na mesa de destino.
*Alternativa descartada:* ficha vinculada (decisão do usuário).

### D9. Biblioteca a partir de `rules/sistema`
`import.meta.glob("../../../../rules/sistema/*.md", { query: "?raw", eager: true })` inclui os documentos na compilação (com `server.fs.allow` para o diretório no Vite). Uma lista explícita `biblioteca/documentos.ts` define **quais** documentos aparecem, em que ordem e com que título/slug; um teste falha se aparecer um `.md` novo em `rules/sistema` que não esteja nem na lista nem na lista de excluídos, para ninguém esquecer. Excluídos de saída: `Roadmap.md` (planejamento) e o `.docx`. Renderização com `react-markdown` + `remark-gfm` (tabelas), sem HTML bruto (seguro por padrão) e com tabelas envolvidas em contêiner rolável. O índice lateral vem dos títulos `##`. A Visão geral é um `.md` próprio em `src/app/biblioteca/visao-geral.md`, redigido a partir do livro com links para os documentos e aprovado pelo usuário antes de marcar a tarefa.

### D10. Estética: o que é CSS/SVG e o que é imagem
Segue D7/D11 da primeira fatia. Novos componentes em `src/ui/`: `BarraSuperior`, `MolduraOrnamentada` (cantos de filigrana), `CartaoAtalho`, `ListaLateral`/`ItemLateral`, `AlternanciaSegmentada`, `Avatar`, `FaixaDeAbertura`, `PontosDeValor` (bolinhas de Atributo/Perícia, só leitura), ícones de linha dourados em SVG próprio. A moldura ornamentada usa **o mesmo desenho das molduras do Resumo da ficha** (aba-resumo-da-ficha): SVG com chanfros com mordida, linhas duplas e volutas nos cantos, aplicado por `border-image` de 9 fatias com `fill`. Há duas formas (`painel`, a caixa grande de cada seção; `quadro`, seções internas, cartões e itens) e quatro fundos (`noite`, `sangue` para o selecionado, `vazio` e `pergaminho`, este reaproveitando os SVGs do Resumo). As variações escuras ficam em `src/ui/molduras/`, geradas a partir dos SVGs do Resumo trocando só as cores. O site inteiro tem uma moldura fixa com os cantos grandes do Resumo. *Decisão do usuário (2026-09-28, revisão da prova visual):* a primeira versão, com cantos recortados de uma moldura gerada no ChatGPT, foi reprovada; molduras não usam imagem.

**Disposição (revisão da prova visual):** como nas referências, a lista de Campanhas, Personagens e Biblioteca ocupa a altura toda, colada à borda esquerda e fechada por um friso dourado; o painel de conteúdo fica colado a ela até a borda direita. A campanha selecionada é **uma caixa só** (faixa, abas e seções internas em quadros); a vitrine de Personagens também (retrato colado ao pergaminho, barra de abas escura, valores em pergaminho). O Início tem a abertura de ponta a ponta sob a barra, com os atalhos sobrepostos à base da ilustração. Imagens novas (prompts em `arte/prompts.md`): heróis de abertura do Início e da tela de entrada, capa padrão de campanha, faixas da Biblioteca e retratos padrão de NPC e de monstro.

### D11. Onde fica cada coisa
- Servidor: migração `0018_perfil_e_campanha.py`; `cursed_platform/perfis.py` (apelido/foto), `cursed_platform/copia_personagem.py`, `cursed_platform/acervo.py`; rotas em `platform/api/cursed_api/perfil.py`, `acervo.py`, extensões em `tables.py`, `images.py`, `characters.py`; contratos em `contracts.py`.
- Cliente: `src/app/plataforma/` (`CascoPlataforma.tsx`, `Inicio.tsx`, `campanhas/`, `personagens/`, `biblioteca/`, `perfil/`, `entrada/`), rotas em `routes.ts`, componentes em `src/ui/`.

## Impacto na experiência de jogo

- **Escassez, risco de combate, regras:** nenhum; a mudança não mexe em números, recursos nem catálogos.
- **Ritmo narrativo:** a pessoa entra na campanha pela capa e pela sinopse, não por uma lista técnica; o Narrador reaproveita NPCs e monstros sem redigitar fichas, o que tira preparação mecânica sem decisão da frente dele.
- **Carga cognitiva:** o papel só aparece onde importa (Campanhas); a Biblioteca evita sair da plataforma para consultar regras. A cópia nasce oculta e com recursos cheios para não levar estado de outra história por engano.

## Interações e migração

- **Autorização:** novas consultas entre mesas (`acervo`, foto do perfil) são o primeiro código que cruza mesas; ficam em funções próprias com testes de negação (removido da mesa, lixeira, mesa só jogada).
- **Histórico:** edição de campanha, capa e cópia entram no histórico da mesa; foto e apelido não.
- **Nomes exibidos:** a troca para `coalesce(apelido, nome)` muda o texto em participantes, histórico e sala; testes que comparam nomes precisam ser revistos.
- **Dados:** migração só adiciona colunas nulas/com padrão (`sistema='cursed'`); fichas, catálogos e mesas existentes não mudam. Aplicar a 0018 no SQLite dos testes e no Supabase (como a 0017).
- **Contratos:** exportar OpenAPI e regenerar o cliente (`export_openapi`, `npm run generate:client`).

## Risks / Trade-offs

- **Google OAuth depende de configuração externa** → implementação e testes usam o cliente Supabase simulado; a tarefa de verificação real fica explícita e depende do usuário.
- **Documentos de regras fora da raiz do Vite** → `server.fs.allow` e caminho relativo frágil; o teste de lista completa cobre documentos novos, e o build do CI falha se o caminho quebrar.
- **Nova dependência (`react-markdown`, `remark-gfm`)** → ~40 KB gz; carregada só na rota da Biblioteca (import dinâmico).
- **Consulta entre mesas** pode vazar dados se um filtro faltar → negação por padrão e testes de autorização para cada coleção e para a foto.
- **Moldura por imagem** pode ficar borrada em telas de alta densidade → exportar o canto em 2× e manter o SVG como alternativa.
- **Árvore de trabalho misturada** (ver HANDOFF da `criacao-guiada-e-nova-estetica`) → implementar numa branch própria a partir do estado commitado, depois de fechar os commits pendentes.

## Decisões do usuário sobre as perguntas abertas (2026-09-28)

- **Documentos duplicados:** mostrar os dois (`Dano de queda.md` e `Apêndice — Dano de Queda.md`).
- **Ordem das Regras:** a da criação de personagem (Criação de Personagem, Atributos e Perícias, Rolagens, Turnos e Ações, …), com os apêndices por último.
- **Abertura do Início:** título "Histórias vivem aqui".
- **Google:** a configuração real (cliente OAuth no Google Cloud e provedor no Supabase) fica para outro momento. O botão "Entrar com Google" é implementado e testado com o cliente simulado, mas só aparece quando `VITE_LOGIN_GOOGLE=1`; a tarefa 9.3 fica adiada.
