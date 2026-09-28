# Proposta — navegacao-inicial-e-perfil

## Why

Hoje a pessoa entra por um formulário de e-mail e senha e cai numa lista de mesas em texto corrido: não há cadastro, perfil com apelido e foto, nem um lugar que apresente o Cursed antes da mesa. Isso esfria a primeira impressão de uma campanha (a experiência começa fora da ficção) e obriga a pensar em "mesa, narrador ou jogador" antes mesmo de ver o que existe. A primeira fatia da nova estética (mudança `criacao-guiada-e-nova-estetica`) deixou de fora, por decisão do usuário, justamente a navegação superior, o Início, Campanhas e Biblioteca da imagem de referência; esta mudança os traz.

Classificação: **núcleo, apenas plataforma e interface**. Nenhuma regra de mesa, limite ou catálogo muda. A Biblioteca só mostra o livro de regras; não o redige nem o interpreta.

## What Changes

- **Conta e perfil:** cadastro e entrada por e-mail e senha e por **Google** (Supabase), recuperação de senha, e perfil com **apelido** e **foto**. No primeiro acesso, a pessoa confirma o apelido (pré-preenchido a partir da identidade) e pode enviar a foto. O apelido passa a ser o nome mostrado nas mesas.
- **Navegação superior** fixa depois de entrar, na ordem **Início, Campanhas, Personagens, Biblioteca**, com a marca à esquerda e o avatar (perfil, sair) à direita. Nenhuma escolha de papel (Narrador ou jogador) antes de Campanhas.
- **Início:** ilustração de abertura com título, botão vermelho **Criar campanha** (cria a campanha e torna a pessoa Narradora) e botão **Gestão de mesas** (leva a Campanhas); atalhos para Campanhas, Personagens e Biblioteca.
- **Campanhas:** barra lateral com capa, nome e sistema de cada campanha, e alternância no topo entre **Narrando** e **Jogando**; à direita, a campanha selecionada com capa, nome, sistema, sinopse, personagens e o botão para entrar na mesa. As abas internas por papel ficam para depois. A campanha ganha **capa**, **sinopse** e **sistema** (por ora sempre "Cursed").
- **Personagens:** escolha entre **Meus personagens**, **NPCs** e **Monstros**; lista lateral e vitrine do selecionado no estilo da referência. O Narrador pode **copiar** um personagem próprio (como NPC), um NPC ou um monstro para outra campanha que narra, como **cópia independente**.
- **Biblioteca:** **Visão geral** do Cursed (texto resumido a partir do livro, aprovado pelo usuário) e **Regras** (os documentos de `rules/sistema`, só leitura).
- **Estética:** barra superior, molduras douradas, painéis e cartões da referência, sobre os tokens e componentes da primeira fatia; arte nova gerada pelo usuário no ChatGPT (`arte/prompts.md`).
- A mesa em si (`/mesas/:mesaId`), a ficha e o assistente de criação continuam como estão; só ganham o caminho de volta para Campanhas.

## Capabilities

### New Capabilities
- `conta-e-perfil`: cadastro, entrada por e-mail/senha e Google, recuperação de senha, sessão, primeiro acesso e perfil (apelido e foto).
- `navegacao-da-plataforma`: barra superior, Início e as rotas das seções fora da mesa.
- `campanhas`: lista de campanhas com alternância Narrando/Jogando, criação, dados de apresentação (capa, sinopse, sistema), entrada por convite e acesso à mesa.
- `acervo-de-personagens`: consulta dos personagens próprios, NPCs e monstros entre campanhas e cópia independente para outra campanha.
- `biblioteca-do-sistema`: visão geral e leitura dos documentos de regras dentro da plataforma.

### Modified Capabilities
- `envio-de-imagens`: novos pontos de envio — foto do perfil e capa da campanha — com as mesmas validações.
- `gestao-de-personagens`: um personagem pode dar origem a uma cópia em outra mesa, que nasce independente e registra a procedência.

## Non-goals

- Abas internas da campanha e diferenças de menu entre Narrador e jogador (Sessões, Locais, Facções, Notas…): serão definidas depois.
- Busca global, notificações, "Sistemas" e "Ferramentas" da referência.
- Outros sistemas de RPG: o campo existe, mas só "Cursed" é aceito.
- Editar regras pela Biblioteca, pesquisa no texto das regras, Bestiário ou Equipamentos como catálogo navegável.
- Vínculo entre cópias (ficha compartilhada entre campanhas), cópia de inventário, cartas, efeitos, Desgaste ou Consequências.
- Novo visual da mesa (`/mesas/:mesaId`) e da sala; eles mantêm a primeira fatia.
- Provedores de entrada além de e-mail/senha e Google; exclusão de conta.

## Impact

- **Banco:** `user_profiles` ganha apelido escolhido e foto; `rpg_tables` ganha capa, sinopse e sistema; personagens ganham procedência da cópia. Nova migração Alembic (0018), aplicada também no Supabase.
- **API:** `GET/PUT /perfil`, envio e remoção da foto do perfil, `GET/PUT /mesas/{id}` para os dados da campanha, novo destino `capa` em `/mesas/{id}/imagens`, `MesaResumo` com capa e sistema, `GET /acervo/personagens` e `POST /mesas/{id}/personagens/copias`. OpenAPI e cliente gerado atualizados.
- **Supabase:** provedor Google configurado pelo usuário (credenciais OAuth fora do repositório), URLs de redirecionamento e e-mails de confirmação/recuperação.
- **Frontend:** novo casco com barra superior e rotas `/`, `/campanhas`, `/personagens`, `/biblioteca`, `/perfil`, `/entrar`; nova dependência para exibir Markdown (`react-markdown` + `remark-gfm`); documentos de `rules/sistema` incluídos na compilação.
- **Arte:** novas imagens em `platform/frontend/arte-original/` e o script `preparar_arte.py` estendido.
- **Testes:** Python (API e domínio), Vitest, Playwright (cadastro simulado, navegação, cópia) e capturas novas.
