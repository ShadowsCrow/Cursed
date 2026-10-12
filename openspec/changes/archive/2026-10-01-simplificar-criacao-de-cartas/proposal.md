# Proposal

## Why

O Narrador cria cartas o tempo todo: a habilidade que nasce de uma cena, o item que aparece no baú, a magia de uma escola nova. Hoje criar uma carta toma tempo e atenção que deveriam ir para a narrativa:

- há uma etapa só para escolher o tipo e o título, antes do editor;
- o editor é um formulário longo, com três botões (Salvar rascunho, Validar, Publicar);
- os problemas aparecem numa lista com nomes técnicos (`efeitos.0.modificadores`), longe dos campos;
- o item mostra os mesmos campos para qualquer subtipo. Uma mochila pede Dano, Armadura e RDB. Uma espada não tem onde registrar Tipo de Dano, Alcance ou Requisito de Força, que as regras de Equipamentos definem.

O usuário aprovou um conceito visual (`referencia/conceito-editor-mochila.png`). Nele, o editor é o mesmo grimório do detalhe da carta: a carta ao vivo na página da esquerda e só os campos que fazem sentido na da direita.

Classificação: **ferramenta exclusiva do Narrador**. Não muda nenhuma regra de mesa; a aplicação passa a representar com mais fidelidade os campos que `rules/sistema/Equipamentos.md` já define.

## What Changes

- **Uma etapa só.** "Nova carta" abre direto o editor. O tipo (Habilidade, Magia, Item, Efeito) é escolhido nos marcadores de couro do topo do livro, e o título se edita na própria carta. A carta só é criada no servidor no primeiro salvamento: abrir e cancelar não deixa rascunho vazio.
- **O tipo pode ser trocado enquanto a carta nunca foi publicada.** Depois da primeira publicação, ele fica fixo.
- **Salvamento automático** do rascunho, com o estado visível ("Salvando…", "Rascunho salvo", "Não foi possível salvar"). Os botões "Salvar rascunho" e "Validar" saem.
- **Validação junto do campo.** O servidor continua sendo a autoridade. Cada problema aparece ao lado do campo, com o nome que o Narrador vê na tela. Sobra um único botão, **Publicar**, que diz quantas pendências faltam e leva à primeira.
- **Item começa por "O que é?"**: a fila de subtipos em ícones, logo no começo da página da direita.
- **Campos por subtipo, vindos do catálogo JSON.** O `itens.json` passa a declarar, para cada subtipo, os campos da regra de Equipamentos (armas, peitoral, escudo, capacete/luvas/botas, mochila, aljava, outros) e as listas de escolhas (famílias de proficiência, tipos de dano, perfis, categorias de armadura). O editor mostra só esses campos; a mochila não mostra Dano.
- **Fim do peso.** O peso não tem efeito desde a carga em grade, e o banco não tem item nem carta com peso. O campo sai do editor, e as importações (fichas do Streamlit e códigos antigos de carta e de equipamento) passam a descartá-lo.
- **Campo fora do subtipo é erro.** A validação recusa valores em campos que o subtipo não declara. Trocar o subtipo no editor descarta esses valores, com confirmação quando estiverem preenchidos.
- **Menos ruído.** O "Custo legado" só aparece em cartas que o tenham. As versões publicadas vão para um bloco recolhido. Os campos que só o Narrador vê ganham o selo "só você vê".
- **Visual: cópia fiel do conceito.** O editor reusa o grimório da aba Cartas (pintura do livro, molduras em SVG/CSS, quadros com medalhão). As peças novas que forem ilustração (marcadores de couro, selo de cera do Publicar) são geradas pelo Codex; molduras continuam em SVG/CSS.

## Capabilities

### New Capabilities
- `editor-de-cartas`: como o Narrador cria e edita uma carta. Cobre a etapa única, a troca de tipo antes da publicação, o salvamento automático, a validação junto do campo, a publicação e a fidelidade ao conceito aprovado.

### Modified Capabilities
- `inventario-em-grade`: o requisito "Criação de item com formato e imagens" passa a começar pelo subtipo e a mostrar só os campos que o catálogo declara para ele, inclusive os campos de arma e armadura da regra de Equipamentos. O requisito "Itens sem dimensão" deixa de citar o peso, e um requisito novo abole o peso na plataforma.

## Non-goals

- Não muda nenhuma regra de mesa nem `rules/sistema`.
- Não muda o cálculo da ficha viva. A Armadura e o RDB continuam lidos de `dados.armadura` e `dados.rdb`. Os campos novos de arma (alcance, tipo de dano, atributo de ataque) **não** passam a calcular ataque ou dano: só ficam registrados na carta.
- Não muda o ciclo de vida da carta (oferta, aprendizado, concessão, migração de versão) nem a importação por código.
- Não reabre a edição de cartas de classe, arquétipo e raça, que continuam somente leitura (`cartas-do-catalogo-somente-leitura`).
- Não cria o framework de balanceamento de habilidades e magias.
- Não gera arte nova por subtipo para a página da esquerda: ela usa a arte da categoria já aprovada na aba Cartas.
- Não faz edição colaborativa em tempo real; dois Narradores editando a mesma carta continuam recebendo o aviso de conflito.

## Impact

- **Frontend:**
  - `platform/frontend/src/app/cards/CardEditor.tsx` (reescrito como grimório) e `NarratorLibrary.tsx` (o `NovaCartaDialog` sai);
  - `src/app/inventory/ItemFormatEditor.tsx` (subtipo em ícones e campos por subtipo);
  - `src/app/characters/sheet/cartas/DetalheDaCarta.tsx` (o `Grimorio` passa a aceitar página da direita editável) e `cartas.css`;
  - testes de componente e e2e.
- **API:**
  - `PUT /mesas/{id}/cartas/{carta}/rascunho` aceita a troca de tipo enquanto não houver versão publicada;
  - a validação dos `dados` do item segue os campos do subtipo;
  - o catálogo de itens expõe os campos por subtipo;
  - o `openapi.json` e o `schema.ts` são regenerados.
- **Dados:** `cursed_platform/catalogos/itens.json` ganha os campos por subtipo e as listas de escolhas; `catalogos.py` os carrega e valida; `manifesto.json` é atualizado.
- **Domínio:** `cursed_platform/cartas.py` valida os `dados` do item contra os campos do subtipo. As importações (`migracao_json.py`, `migracao_tabelas.py`, a importação de equipamento da ficha viva e `cartas.rascunho_de_codigo`) descartam o peso; a bandeja "Sem dimensão" e a definição de formato deixam de mostrá-lo.
- **Arte:** pinturas opcionais novas em `platform/frontend/arte-original/`, com os prompts em `arte/prompts-codex/`.
- **Sem migração de banco.** Os campos novos vivem em `dados`, que já é um dicionário livre, e o banco de testes não tem item nem carta (consulta de 2026-09-30).
