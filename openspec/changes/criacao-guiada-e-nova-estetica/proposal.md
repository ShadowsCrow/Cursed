## Why

Hoje o jogador cria um personagem digitando só o nome e é jogado numa ficha com nove abas para preencher sozinho. O capítulo "Criação de Personagem" do livro de regras descreve um caminho em ordem (identidade, raça, classe, Atributos, Perícias, PV e PP, personalidade, conferência), mas a plataforma não conduz ninguém por ele: quem é novo no sistema não sabe que a distribuição de Atributos é 3, 2×4 e 1×4, nem que PV e PP dependem de Vigor e Propósito, e descobre isso errando. A primeira impressão do sistema é uma ficha vazia.

A aparência atual (cartões escuros genéricos com detalhes em dourado) também não transmite o tom de fantasia sombria do Cursed. A imagem de referência mostra a identidade desejada: fundo noturno, pergaminho para o conteúdo da ficha, molduras ornamentadas, títulos serifados, cartas e banners de sistema. Como o assistente de criação é a primeira tela que o jogador vê, ele é o melhor lugar para começar a nova estética.

## What changes

Classificação: **núcleo**. Quase toda a mudança é interface: o assistente representa o capítulo "Criação de Personagem" e os valores continuam calculados pelo servidor a partir dos catálogos. A exceção é uma **regra nova decidida pelo usuário em 2026-09-28**: a altura do personagem e a escolha de ficar fora da média da raça, que muda o Tamanho em um passo (ver o item "Altura e Tamanho fora da média").

- **Assistente de criação guiada.** O botão "Criar personagem" do jogador abre um assistente em etapas (Conceito, Identidade, Raça, Classe e arquétipo, Atributos, Perícias, Personalidade, Conferência) em vez do diálogo de um campo. Cada etapa explica a regra correspondente, mostra o que a escolha significa (bases e habilidades da classe, Tamanho e Deslocamento da raça, conceito do arquétipo) e valida antes de avançar.
- **Distribuição guiada dos Atributos e das Perícias.** Contadores mostram o que falta distribuir (Atributos: um `3`, quatro `2`, quatro `1`; Perícias: uma `3`, três `2`, quatro `1`, demais `0`). O assistente só avança quando a distribuição fecha, com uma saída explícita "seguir sem a distribuição padrão" para campanhas com regra própria, registrada como aviso na conferência.
- **Prévia calculada pelo servidor.** A etapa de conferência mostra PV, PP e Escalas do rascunho, calculados pelo mesmo cálculo da ficha viva, sem gravar nada. O personagem só passa a existir ao concluir; nenhuma ficha pela metade aparece na lista.
- **Rascunho recuperável.** Fechar o assistente ou recarregar a página não perde o progresso: o rascunho fica no navegador, por mesa e por usuário, e pode ser retomado ou descartado.
- **Nova identidade visual (primeira fatia).** Novos tokens de tema (paleta noturna, dourado envelhecido, vermelho profundo, pergaminho), tipografia serifada nos títulos, molduras ornamentadas e superfícies de pergaminho como componentes reutilizáveis. Aplicados ao assistente, à ficha e à moldura da mesa (barra lateral e cabeçalho). O resto da aplicação herda os tokens e será tratado em mudanças seguintes.
- **Arte integrada.** As ilustrações (castelo de cabeçalho, texturas de pedra e pergaminho, emblema, retrato de reserva e uma ilustração por etapa do assistente) foram geradas pelo usuário fora do repositório e já estão em `platform/frontend/arte-original/`. Esta mudança as otimiza e as integra ao tema, com alternativa em gradiente quando ausentes, e trata o emblema como marca da plataforma (barra lateral, aba do navegador, entrada e estados de carregamento).
- **Altura e Tamanho fora da média (regra nova, decisão do usuário).** Cada raça tem um intervalo típico de altura e cada Tamanho uma faixa de altura, nos dados do sistema. Na etapa Raça, o jogador escolhe a altura dentro do intervalo da raça ou marca que o personagem é fora da média: aí o Tamanho passa a ser o vizinho (um passo acima ou abaixo, quando existir; Minúsculo não desce, Colossal não sobe) e a altura fica na faixa desse Tamanho, sem teto no Colossal. O Deslocamento continua o da raça. O livro (`Criação de Personagem.md`, seção 3, e `Carga.md`) passa a descrever a regra e as tabelas.
- **Servidor.** Um endpoint de prévia (sem gravação) para o assistente; o `POST` de criação já existente continua sendo o único caminho que grava.

## Capabilities

### New Capabilities

- `criacao-guiada-de-personagem`: assistente em etapas que conduz o jogador pela criação do personagem conforme o livro de regras, com distribuição guiada, prévia de valores calculada pelo servidor, rascunho recuperável e criação atômica.
- `identidade-visual-da-plataforma`: tema visual da plataforma (tokens, tipografia, superfícies de pergaminho, molduras) e os requisitos de acessibilidade e de adaptação a telas pequenas que ele deve respeitar.

### Modified Capabilities

Nenhuma. O contrato de `gestao-de-personagens` continua valendo (o personagem pertence à mesa e ao jogador que o cria); o assistente é uma nova forma de chegar a ele.

## Non-goals

- Não criar as etapas do livro que a plataforma ainda não modela: Vantagens e Desvantagens, equipamento inicial, Acessos e Escola de Especialização. Ficam para uma mudança própria, com seus modelos de dados.
- Não alterar nenhuma regra de mesa, limite ou valor além da regra de altura e Tamanho fora da média decidida pelo usuário; a plataforma não infere valores ausentes.
- Não mudar a criação de NPCs e monstros, nem o diálogo "Nova entidade" do Narrador. As regras não definem limites para criaturas.
- Não fazer o servidor recusar uma distribuição fora do padrão: o padrão é orientação do assistente; a validação de servidor continua sendo a de limites e catálogo (`1` a `5` para Atributos, `0` a `5` para Perícias).
- Não refazer a navegação da plataforma (menu superior com Início, Sistemas, Biblioteca, Ferramentas), a página inicial nem as telas de Campanhas e Biblioteca da imagem de referência: essas telas ainda não existem.
- Não gerar arte no código nem versionar as matrizes: as ilustrações vêm do usuário (guia em `arte/prompts.md`) e ficam fora do Git em `arte-original/`; só as versões otimizadas entram em `public/arte/`. Arte para Início, Sistemas, Biblioteca e Campanhas fica para as mudanças que redesenharem essas telas.
- Não trocar a biblioteca de componentes nem o roteamento.

## Impact

- **Frontend** (`platform/frontend/src`): novo módulo do assistente em `app/characters/creation/`; substituição do `CreateCharacterDialog` em `CharacterList.tsx`; tokens em `design/tokens.css` e componentes de tema em `ui/`; reestilização de `preview.css`, ficha e moldura da mesa.
- **API** (`platform/api`): novo endpoint de prévia de criação em `characters.py`, reutilizando `cursed_platform.domain.recursos` e `validacao_ficha`; `openapi.json` e `schema.ts` regenerados.
- **Domínio**: função pública para a prévia de uma ficha em rascunho; campo `personagem.altura` e validação de altura e Tamanho de criação (`validacao_ficha`), com os intervalos lidos dos catálogos.
- **Catálogos e livro**: `altura` em cada raça (`racas.json`), `faixas_de_altura` por Tamanho (`listas_ficha.json`); texto e tabelas em `rules/sistema/Criação de Personagem.md` e ajuste em `Carga.md`.
- **Testes**: testes de componente do assistente e do contador de distribuição, testes de API da prévia, e as capturas e2e existentes atualizadas para a nova aparência.
- **Dependências**: fontes serifadas de exibição e de leitura (já se usa Cormorant Garamond por CDN); decidir em design se passam a ser servidas localmente. Nenhuma dependência nova para as imagens: o script de preparação usa o Pillow que já está no `.venv`.
- **Sem migração de dados**: fichas existentes não mudam; a altura é opcional e fichas antigas simplesmente não a têm.
