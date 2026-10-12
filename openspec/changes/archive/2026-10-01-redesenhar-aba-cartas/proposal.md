# Proposta — redesenhar-aba-cartas

## Why

Na aba de cartas o jogador consulta, no meio da cena, o que o personagem sabe fazer, com o que paga e de onde veio cada poder. Hoje ela é o painel genérico dentro da moldura comum das seções. As cartas aparecem em listas por estado, sem ilustração e sem hierarquia entre tipo, custo e origem. Com muitas cartas, achar "a magia da raça" ou "as armas recebidas" exige rolar a lista inteira. Depois do Resumo, Atributos e Perícias, é a aba que mais destoa da nova estética.

Há também um vazamento de regra. O Custo de Aprendizado e os Descansos Mínimos são ferramentas de balanceamento do Narrador (o framework de criação é exclusivo do mestre), mas hoje o servidor manda esses dois valores para o jogador em toda carta, e a tela os mostra.

O usuário enviou uma imagem de referência (2026-09-29, `referencia/cartas.webp`) e pediu uma **cópia fiel**:
- folha de pergaminho com moldura dourada e cantos em volutas;
- cabeçalho com a etiqueta "CARTAS", o título "Habilidades, magias, itens e efeitos" e uma **gravura em sépia** à direita (baú, livros, lanterna, rosa dos ventos, estrelas);
- busca "Buscar cartas…" e ordem "Nome (A-Z)" no alto, à direita;
- grade de cartas, cada uma com **faixa pintada** noturna, **medalhão dourado** com emblema, tipo em versalete, título, texto curto com reticências, quadro de custos e a **pílula da origem** ("Classe: Especialista de Combate - automática").

Pedidos do usuário que mudam a referência:
- **Nome da aba:** "Cartas", e não "Habilidades e cartas", porque habilidades também são cartas.
- **Filtro em barra lateral**, como a do Inventário, no lugar da caixa "Todas as categorias":
  - no topo, a **origem**: da classe, da raça ou concedidas (as escolhidas em oferta contam como concedidas);
  - abaixo, o **tipo**: habilidades, magias, armas, armaduras e as demais categorias de item, e efeitos.
- **Custo de Aprendizado e Descansos Mínimos só para o Narrador.** O jogador vê só a Potência de Uso e o Custo de Uso, e o servidor deixa de mandar os dois campos para ele.
- **Arte por categoria:** cada categoria tem sua pintura, gerada pelo usuário no ChatGPT. A carta com imagem própria, enviada pelo Narrador, usa a dela.

Classificação: **núcleo**. A visibilidade dos custos é uma regra de acesso da aplicação, e a mudança não altera nenhum número, nem o ciclo de aprendizado, nem o livro de regras. O resto é interface.

## What Changes

- **Nome:** a aba passa a se chamar **"Cartas"**. A barra de abas, o Resumo e os links antigos (`?secao=habilidades` e `?secao=cartas`) continuam abrindo a aba.
- **Folha própria:** a aba sai da moldura comum e ganha folha de pergaminho, na construção do Resumo e dos Atributos: moldura dupla em CSS e cantos e flores em SVG.
- **Cabeçalho:** etiqueta, título, gravura em sépia (opcional; sem ela, rosa dos ventos e estrelas em SVG), busca e ordem. Para o Narrador, o botão "Conceder carta" também fica no cabeçalho.
- **Barra lateral de filtros:**
  - **Origem:** Todas, Da classe, Da raça e Concedidas, com contagem;
  - **Tipo:** Todos, Habilidades, Magias, as categorias de item do catálogo (`itens.json`: Armas, Armaduras, Escudos…) e Efeitos, com contagem e só as que têm cartas;
  - origem e tipo se combinam;
  - no celular, a barra vira duas fileiras roláveis acima da grade, como a do Inventário.
- **Seções por estado:** Aprendidas, Em aprendizado, Disponíveis para aprender, Itens recebidos e Efeitos de cartas, cada uma com o título em cima da grade (o "Aprendidas" da referência). Seção sem cartas no filtro não aparece.
- **Carta nova** (`CartaDaFicha`):
  - moldura em SVG;
  - faixa superior ilustrada;
  - tipo, título, texto em três linhas com reticências;
  - quadro de custos (só em habilidades e magias);
  - pílula da origem.
- **Arte da faixa** (decisão do usuário, 2026-09-29):
  - a imagem própria da carta, enviada pelo Narrador, ocupa a faixa superior inteira;
  - sem imagem própria, a faixa inteira recebe a pintura da categoria, uma cena com o medalhão e o emblema já pintados, como na referência;
  - sem a pintura, fica um degradê da cor do tipo com um medalhão em SVG e o ícone da categoria.
- **Custos:** o jogador vê "Potência de uso" e "Custo de uso" numa linha. O Narrador vê os quatro, em 2 × 2, como na referência. Valor ausente continua "Não definido".
- **Detalhe da carta:** acionar a carta abre um diálogo com:
  - o texto inteiro, requisitos, escola e grau, custos adicionais e versão;
  - as ações de hoje: iniciar, interromper e concluir aprendizado; migrar versão; remover.
- **Servidor:**
  - toda carta entregue a quem não é Narrador sai sem `custo_aprendizado` e `descansos_minimos`: ficha, ofertas, respostas de oferta, transições e apresentações;
  - o catálogo do Narrador não muda.
- **Pinturas opcionais:** a gravura do cabeçalho e uma faixa por categoria (habilidades, magias, efeitos e cada categoria de item), com prompts em `arte/prompts.md` e preparo no `preparar_arte.py`.
- **Telas menores:** quatro colunas ao lado da barra na largura da referência. O número de colunas cai com a largura, até uma coluna no celular, sem rolagem horizontal a partir de 320 px.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `visual-da-ficha`: a aba Cartas ganha folha própria, barra lateral de filtros e a carta ilustrada, no lugar da moldura comum das seções.
- `cartas-de-conteudo`: o Custo de Aprendizado e os Descansos Mínimos passam a ser reservados ao Narrador em tudo o que o servidor entrega a outros participantes.
- `ficha-viva`: a seção "habilidades" passa a se chamar "Cartas" na lista de seções da ficha.

## Non-goals

- Mudar regras, custos, o ciclo de aprendizado ou o livro de regras (`rules/sistema`).
- Registrar o progresso do aprendizado (PP investidos e descansos dedicados). O jogador segue sem ver o alvo, e o Narrador conclui o aprendizado como hoje.
- Redesenhar a biblioteca do Narrador, o editor de cartas, a escolha de ofertas ou a apresentação de cartas. Elas só deixam de mostrar ao jogador os dois custos reservados.
- Criar campo novo de ícone ou de categoria em habilidades e magias. A pintura da faixa vem do tipo, ou da categoria no caso dos itens, e a variedade por carta vem da imagem própria.
- Filtrar por estado na barra lateral. O estado continua dividindo a grade em seções.
- Mudar o cabeçalho, a faixa de estado e a barra de abas da ficha, feitos em `reformular-visual-da-ficha`, além do novo nome da aba.

## Impact

- **Servidor:** `platform/api/cursed_api/card_lifecycle.py` (`_visivel` recebe o papel e remove os dois campos); testes de API das cartas. Sem migração e sem mudança de contrato (o `conteudo` já é um dicionário livre).
- **Frontend:**
  - novo `platform/frontend/src/app/characters/sheet/cartas/` (folha, barra, carta, detalhe, CSS e apresentação);
  - `CharacterSheetPage.tsx` (aba e nome);
  - `resumo/ResumoVisual.tsx` (nome);
  - `cards/cardFormat.ts` e `cards/cardView.tsx` (custos por papel);
  - `CharacterCardsPanel.tsx`: os diálogos de conceder e migrar são reaproveitados, e o painel sai da ficha.
- **Dados:** leitura das categorias de `cursed_platform/catalogos/itens.json`, que já existem, sem mudar o arquivo.
- **Arte:** `platform/frontend/scripts/preparar_arte.py` e `public/arte/cartas/`, com prompts na mudança.
- **Testes:**
  - Vitest da folha, da barra e da carta; `CharacterSheetPage.test.tsx`; `CharacterCardsPanel.test.tsx`;
  - testes de API das cartas; `test_preparar_arte.py`;
  - e2e `cartas-visual.spec.mjs` e fidelidade `fidelidade-cartas.mjs`.
- **Ordem de arquivamento:** `visual-da-ficha` vem de `reformular-visual-da-ficha`, ainda não arquivada, e esta mudança só pode ser arquivada depois dela.
