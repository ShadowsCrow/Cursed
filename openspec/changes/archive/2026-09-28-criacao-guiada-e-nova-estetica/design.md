## Context

Ver `proposal.md` (Why) para a motivação. Estado atual, verificado no código:

- O jogador cria a ficha com `CreateCharacterDialog` (`CharacterList.tsx`), que envia `POST /mesas/{mesa_id}/personagens` só com `personagem.nome` e abre a ficha vazia.
- O `POST` de criação **já aceita a ficha inteira**: valida com `exigir_ficha_valida` (limites `1`–`5` e `0`–`5`, catálogo, dependência de arquétipo), fixa nível `1`, iguala PV/PP atuais ao máximo e concede as cartas da classe, do arquétipo e da raça. O assistente não precisa de um novo caminho de gravação.
- O cálculo de PV, PP e Escalas é uma função pura, `recursos.calcular(payload, catalogos)`, chamada na leitura da ficha; não existe hoje um endpoint que a aplique a uma ficha ainda não gravada.
- Classes, raças, listas de personalidade e dicas vêm de catálogos JSON do sistema, lidos por `useClasses`, `useRacas` e `useListasFicha`. `AttributeTable` e `IdentityPanel` já conhecem os nomes oficiais de Atributos e Perícias (`GRUPOS_ATRIBUTOS`, `GRUPOS_PERICIAS`) e os limites.
- O visual está em `design/tokens.css` (paleta escura, `--gold`, Cormorant Garamond como `--font-display`) e `design/preview.css` (~600 linhas, valores de cor repetidos em muitas regras, fontes por `@import` do Google Fonts). Há poucos tokens semânticos, então trocar o tema exige tocar muitas regras.
- O rascunho não é dado de mesa: é conveniência do jogador, de modo que vive no navegador.

## Goals / Non-Goals

**Goals:**

- Uma experiência de criação em que cada etapa explica a regra, mostra o efeito da escolha e valida antes de avançar, sem duplicar regras no cliente.
- Nenhum valor mecânico calculado no cliente: PV, PP, Escalas, limites e catálogo continuam sendo do servidor e dos catálogos.
- Um tema aplicável por tokens, de modo que as próximas mudanças de estética sejam trocas de token e de componente, não reescrita de CSS.

**Non-Goals:**

- Além dos listados na proposta: não introduzir gerenciador de estado global, biblioteca de formulários, biblioteca de estilos nem mudança de bundler.

## Decisions

### D1. O assistente é uma rota própria, não um diálogo

Nova rota `/mesas/:mesaId/criar-personagem`, renderizada dentro da moldura da mesa, com o botão "Criar personagem" navegando para ela.
**Por quê:** oito etapas com pergaminho, contadores e conferência não cabem num `Dialog`; uma rota permite o botão Voltar do navegador, recarregar sem perder a posição (a etapa fica em `?etapa=`) e link direto.
**Alternativas:** diálogo grande (foco preso, ruim em telas pequenas); nova visão no `painel` do `TableWorkspace` (o painel é por papel e o assistente é um fluxo de tela cheia com estado próprio).

### D2. Criação atômica: rascunho no cliente, uma única gravação

O estado do assistente é um objeto de ficha parcial (`personagem`, `atributos.valores`, `pericias.valores`, `personalidade`) mais metadados do assistente (etapa, saídas da distribuição). Só a Conferência envia o `POST` existente com a ficha montada.
**Por quê:** evita fichas pela metade na lista e no Narrador, dispensa um estado "em criação" no modelo e reaproveita a validação e a concessão de cartas do servidor sem alteração.
**Alternativas:** criar a ficha na etapa 1 e gravar campo a campo (deixa fichas incompletas visíveis, gera auditoria e versões por etapa, e exigiria marcar "em criação"); rascunho no servidor (nova tabela, política de expiração e migração para um ganho pequeno).

### D3. Prévia calculada no servidor, sem gravação

Novo `POST /mesas/{mesa_id}/personagens/previa` recebe o mesmo corpo da criação e devolve `{ valores: [...], problemas: [...] }`: os valores de recursos (PV, PP, Escalas, com fontes) obtidos com a mesma `recursos.calcular`, e os problemas de `validar_ficha` no formato de erro já usado (`{campo, mensagem}`). Exige a permissão de criar personagem, não grava, não audita e não concede cartas.
**Por quê:** cumpre "o cliente não recalcula" e faz a Conferência mostrar exatamente o que a ficha mostrará; devolver os problemas evita duplicar a validação no cliente para os casos de catálogo e dependência.
**Alternativas:** calcular PV e PP em TypeScript com a fórmula do livro (duplica a regra e diverge quando as bases do catálogo mudarem); só chamar o `POST` e tratar o 422 (não mostra a prévia de valores e só descobre o erro ao concluir).
**Custo:** uma chamada por entrada na Conferência, com pequeno atraso de rede; a prévia é pedida só ao entrar na Conferência e quando o rascunho muda lá, não a cada tecla.

### D4. A distribuição do livro vive numa função pura do cliente, isolada e testada

Um módulo `distribuicao.ts` recebe o mapa `nome → valor` e devolve, por categoria, quantos de cada valor faltam, quais excedem e se a distribuição fecha. Os valores-alvo (`[3, 2×4, 1×4]` e `[3, 2×3, 1×4]`) ficam em uma constante do módulo, com comentário apontando `Criação de Personagem.md`, e não aparecem em componentes.
**Por quê:** a distribuição é orientação do assistente, não regra de servidor; isolar em função pura permite testar todos os casos de borda sem interface e facilita mudar o padrão se o livro mudar.
**Ressalva registrada:** é a única regra numérica do livro que o cliente conhece. Como o catálogo não a traz e a tarefa é só guiar, aceitamos a constante; se o padrão passar a variar por mesa, ela migra para os dados do sistema (mesma diretriz de "conteúdo parametrizável em JSON").

### D5. Rascunho em `localStorage`, por mesa e usuário, versionado

Chave `cursed:rascunho-personagem:v1:{mesaId}:{userId}`, valor JSON com `versao_esquema`, etapa e ficha parcial. Gravação com pequeno atraso a cada alteração; toda leitura e escrita em `try/catch`; rascunho de esquema desconhecido ou corrompido é ignorado, nunca lançado.
**Por quê:** o requisito é recuperação de conveniência (F5, fechar a aba). Não é dado da mesa, então não deve ir ao servidor.
**Alternativas:** `sessionStorage` (perde ao fechar a aba); IndexedDB (complexidade sem ganho para um objeto pequeno).
**Cuidado:** o rascunho contém texto do jogador; ele SHALL ser removido ao concluir e ao descartar. Não contém credenciais.

### D6. Etapas como dados, campos reutilizados

A lista de etapas é um array declarativo (`id`, título, texto de orientação, validador de etapa, componente). Onde possível, reaproveitar as listas e dicas já carregadas por `useClasses`, `useRacas` e `useListasFicha`, os nomes de `sheetCatalog.ts` e os limites de `AttributeTable`; não copiar textos de catálogo para o código. O texto de orientação de cada etapa é interface, redigido em pt-BR, e cita a regra sem numerá-la além do que o livro diz.
**Por quê:** uma etapa nova (Vantagens e Desvantagens, equipamento) vira um item da lista quando seus dados existirem.

### D7. Tema em três camadas de token

`tokens.css` passa a ter: (1) **primitivos** (paleta bruta: `--noite-*`, `--ouro-*`, `--sangue-*`, `--pergaminho-*`, `--tinta-*`); (2) **semânticos** (`--surface`, `--surface-parchment`, `--text-on-parchment`, `--accent`, `--action`, `--border-ornate`, `--focus-ring`), que é o que as regras de CSS usam; (3) **componentes** só onde necessário (`--frame-corner-size`). Os tokens semânticos atuais (`--bg`, `--surface`, `--gold`, `--violet`…) são mantidos como aliases para não quebrar telas ainda não migradas. Valores de cor fixos em `preview.css` das telas migradas são substituídos por tokens; nas demais, é feita uma substituição mecânica dos mais frequentes para aliases.
**Por quê:** troca do tema por token, herança nas telas não migradas e menor superfície de regressão.
**Alternativas:** reescrever `preview.css` inteiro (risco alto, sem ganho de comportamento); adotar uma biblioteca de tema (dependência nova e sem encaixe com CSS puro do projeto).

### D8. Componentes de moldura em CSS, sem imagens raster

Molduras ornamentadas, cantos e divisores são feitos com CSS e SVG inline (`border-image` com SVG, pseudo-elementos, `mask`), em um pequeno conjunto de componentes: `Moldura` (borda com cantos), `Pergaminho` (superfície com textura sutil por gradiente/ruído SVG embutido), `TituloOrnado` (título serifado com divisor) e `Selo` (rótulo/banner). Os ornamentos são `aria-hidden`, `pointer-events: none` e simplificados em `max-width: 480px`.
**Por quê:** o CSS entrega a identidade com peso pequeno, escala em qualquer densidade de pixels e respeita tema e contraste; a arte ilustrada (D11) entra por cima, em cabeçalhos e etapas, e nunca faz parte da moldura.
**Alternativas:** PNGs recortados da imagem de referência (direitos incertos, escala ruim, sem tema, peso alto).

### D9. Fontes servidas localmente

Substituir o `@import` do Google Fonts por arquivos de fonte próprios (`public/fonts`, formato `woff2`, subconjunto latino com acentos do português), com `font-display: swap` e alternativas de sistema. A fonte de exibição serifada continua Cormorant Garamond; a de leitura é escolhida entre opções de licença aberta e boa legibilidade em tamanhos pequenos sobre pergaminho.
**Por quê:** o CDN é um ponto de falha e de privacidade (requisição a terceiro), atrasa a primeira pintura e não funciona em rede restrita; o requisito de tipografia exige alternativas de qualquer forma.
**Custo:** alguns arquivos binários no repositório (ordem de dezenas de KB). Se o repositório não deve receber binários de fonte, a alternativa é manter o CDN e apenas garantir as alternativas de sistema; ver Open Questions.

### D10. Acessibilidade do assistente

Container `role="region"` nomeado; lista de etapas como `<ol>` com `aria-current="step"`; título da etapa com `tabIndex={-1}` recebendo foco a cada troca; contador de distribuição em `aria-live="polite"` (sem anunciar a cada tecla, apenas ao mudar de estado); cada seletor de valor é um grupo de `radio` por Atributo/Perícia, não um `<select>` por linha, para tornar visível quais valores restam. Em telas estreitas a lista vira "Etapa N de 8" com barra de progresso.
**Por quê:** cumpre os requisitos de teclado, leitor de tela e telas pequenas sem depender de biblioteca.

### D11. Arte: matrizes fora do Git, versões otimizadas geradas por script

As 13 imagens geradas pelo usuário (ver `arte/prompts.md`) estão em `platform/frontend/arte-original/`, ignorada pelo Git e fora do que o site serve (≈ 32 MB). Um script reproduzível, `platform/frontend/scripts/preparar_arte.py`, roda com o Python do `.venv` (Pillow 12 já instalado; nenhuma dependência nova) e gera os arquivos em `platform/frontend/public/arte/`:

- **Todas:** WebP com qualidade calibrada; alvo total de cerca de 2–3 MB; dimensões gravadas no HTML para evitar deslocamento de layout.
- **`ancora-castelo`:** recorte 2:1 a partir do topo (mantém lua e castelo), `1536×768`, mais uma variante `768×384` para telas pequenas.
- **`fundo-noite` e `pergaminho`:** emenda corrigida (espelhamento com mistura das bordas, ou deslocamento de metade e mistura no cruzamento), redução para `512×512` de ladrilho; verificação numérica de que a diferença entre bordas opostas fica no nível da diferença entre pixels vizinhos (medido nas originais: pergaminho ≈ 15 contra 9; fundo ≈ 25 contra 20).
- **`emblema-cursed`:** limpeza do halo avermelhado das bordas semitransparentes (≈ 4% dos pixels visíveis; substituir a cor desses pixels pela cor dourada vizinha, preservando o alfa) e saída em WebP com transparência nos tamanhos `256` e `1024`.
- **`retrato-vazio`:** recorte 3:4, `900×1200`.
- **8 etapas:** `1200×800` cada (3:2, sem recorte).

**Emblema simplificado (SVG):** desenhado à mão, estrela de oito pontas com anel, monocromático com `currentColor`, para ícone da aba (`16`/`32` px), barra lateral recolhida e estados de carregamento; o detalhado fica para tamanhos grandes.

**Tratamento no CSS:** as ilustrações de etapa levam por cima uma camada fria e uma vinheta feitas em CSS (as etapas de Perícias, Identidade e Conceito são bem mais âmbar que a âncora azul); a moldura e as bordas ficam por conta dos componentes de D8. Todas têm alternativa em gradiente do tema.
**Por quê:** matrizes grandes não devem pesar no repositório nem no site; um script torna o processo repetível quando as imagens forem regeneradas; Pillow evita adicionar `sharp` ao Node.
**Alternativas:** `sharp` no `package.json` (nova dependência nativa); versionar os PNGs originais (≈ 32 MB no histórico); Git LFS (mais infraestrutura para pouca arte).
**Risco:** o script depende do `.venv`; documentar o comando no `README` do frontend.

### D12. Altura e Tamanho fora da média (regra nova, decisão do usuário em 2026-09-28)

**Regra.** Cada raça tem um intervalo típico de altura; cada Tamanho, uma faixa. O personagem na média da raça tem o Tamanho da raça e altura dentro do intervalo típico. Fora da média, o Tamanho passa ao vizinho (um passo acima ou abaixo; Minúsculo não desce, Colossal não sobe) e a altura fica na faixa desse Tamanho; a faixa do Colossal não tem teto. O Deslocamento continua o da raça; o Tamanho escolhido vale para tudo que usa Tamanho (colunas da grade de carga, dimensão como criatura carregada).

**Valores aprovados pelo usuário (metros).** Faixas: Minúsculo 0,10–0,60; Pequeno 0,60–1,40; Médio 1,40–2,10; Grande 2,10–3,00; Enorme 3,00–5,00; Colossal acima de 5,00. Raças: Humano 1,55–1,90; Elfo 1,60–1,95; Drow 1,55–1,85; Troll 1,80–2,10; Anão 1,10–1,40; Gnomo 0,90–1,20; Goblin 0,80–1,20; Orc 2,10–2,50; Golias 3,00–3,80.

**Dados.** `altura: {minima, maxima}` em cada raça de `racas.json` e `faixas_de_altura` (em ordem de Tamanho, contíguas, a última com `maxima: null`) em `listas_ficha.json`. O carregador recusa faixa fora de ordem ou descontínua e intervalo de raça fora da faixa do seu Tamanho. Nada disso fica no código.

**Ficha.** Novo campo opcional `personagem.altura` (metros, número). O Tamanho fora da média usa a exceção de Tamanho já existente (`personagem.tamanho` com `tamanho_raca`). Na criação pelo jogador, `personagem.tamanho` deixa de ser recusado quando é exatamente um passo do Tamanho da raça; qualquer outro valor é problema de campo. Depois da criação, o Tamanho continua exclusivo do Narrador. A altura é validada contra o intervalo da raça (Tamanho da raça) ou a faixa do Tamanho atual (Tamanho diferente), só quando muda, como os demais campos.

**Por quê:** a regra foi pedida pelo usuário para dar escolha de identidade física com consequência mecânica limitada (um passo) e previsível; os números ficam nos dados para poderem ser ajustados sem código.
**Alternativas:** altura só narrativa (descartada pelo usuário); faixas só por Tamanho (descartada: raças do mesmo Tamanho têm alturas diferentes).

## Impacto sobre a experiência de jogo

Este é um trabalho de interface sobre regras existentes; não altera escassez, risco de combate nem ritmo narrativo.

- **Carga cognitiva:** diminui para quem é novo, porque a ordem, o total e os efeitos das escolhas ficam à vista; a saída da distribuição padrão evita bloquear campanhas com regra própria.
- **Narrativa:** a etapa Conceito e a Personalidade valorizam a intenção do personagem antes dos números, como pede o livro ("o conceito pode mudar durante as etapas seguintes").
- **Consistência com o livro:** o assistente apresenta, sem definir, as regras: qualquer divergência entre o texto de orientação e `Criação de Personagem.md` é defeito da interface.

## Interações e dados afetados

- **Servidor:** `characters.py` (endpoint de prévia), reutilizando `recursos.calcular` e `validacao_ficha.validar_ficha`; `openapi.json` e `schema.ts` regenerados (`npm run check:client` no CI).
- **Frontend:** `CharacterList.tsx` (o botão navega para a rota), `App.tsx` e `routes.ts` (nova rota), novo `app/characters/creation/`, `design/tokens.css`, `design/preview.css`, `ui/` (novos componentes de tema), `shells/WorkspaceChrome.tsx`, ficha (`SheetHeader`, painéis e abas).
- **Mecânicas relacionadas:** inventário em grade, cartas, efeitos, desgaste e sala **não mudam de comportamento**; só herdam o tema. As capturas e2e (`e2e/screenshots.mjs`) e o catálogo de componentes (`ComponentCatalog.tsx`) são atualizados.
- **Sem migração de dados** e sem mudança em `rules/sistema` nem nos catálogos.

## Risks / Trade-offs

- **[Risco] O texto de orientação diverge do livro** → Mitigação: cada texto cita o capítulo, é revisado contra `Criação de Personagem.md` na tarefa de verificação, e o teste de contadores usa os números do livro.
- **[Risco] A constante de distribuição no cliente envelhece** → Mitigação: isolada em um módulo (D4) com teste; registrar em `HANDOFF.md` que migra para dados do sistema se variar por mesa.
- **[Risco] Reestilizar 600 linhas de CSS quebra telas não migradas** → Mitigação: aliases dos tokens antigos (D7), capturas e2e antes e depois, e verificação manual de cada tela (auditoria, biblioteca, sala, inventário).
- **[Risco] Contraste ruim em pergaminho, ou em dourado sobre escuro** → Mitigação: paleta validada por script de contraste nos tokens (teste que falha abaixo de `4,5:1`) e verificação em ambas as paletas.
- **[Risco] Ornamentos pesam ou atrapalham em celular** → Mitigação: CSS/SVG leve, simplificação abaixo de `480px`, teste a `360px`.
- **[Risco] `localStorage` com rascunho sensível em computador compartilhado** → Mitigação: chave por usuário, remoção ao concluir/descartar, e nenhuma credencial guardada.
- **[Trade-off] A prévia depende de rede** → aceito: a criação também depende; se a prévia falhar, a Conferência mostra o erro e mantém o rascunho, e a criação continua possível porque o `POST` valida de qualquer modo.
- **[Trade-off] Duas fatias (assistente e estética) numa mudança** → aceito por decisão do usuário; as tarefas as separam, e a estética do assistente entra junto porque ele é a primeira tela do tema.

## Migration Plan

1. Entregar o endpoint de prévia e o cliente gerado (sem efeito visível).
2. Entregar o tema por tokens com aliases (a aplicação continua igual, com nova paleta).
3. Entregar o assistente atrás da nova rota e trocar o botão de criação.
4. Aplicar o tema à ficha e à moldura e atualizar capturas.

Reversão: a rota do assistente pode ser desligada trocando o botão de volta ao `CreateCharacterDialog` (mantido até o fim da mudança); o tema volta trocando os valores dos tokens primitivos; o endpoint de prévia é aditivo e inofensivo. Nenhum dado precisa ser revertido.

## Open Questions

- **Fontes locais (D9):** o projeto aceita versionar arquivos `woff2` no repositório? Se não, manteremos o CDN com alternativas de sistema. A tarefa de fontes deve confirmar antes de baixar arquivos, pois altera dependências externas.
- **Fonte de leitura:** qual família de leitura prefere o usuário, entre as de licença aberta (a decidir com amostras na tarefa 2.3)? A decisão não muda specs nem tarefas.
