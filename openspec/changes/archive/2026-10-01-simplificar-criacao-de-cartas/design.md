# Design

## Context

Estado atual, observado no código:

- `NarratorLibrary.tsx` abre o `NovaCartaDialog` (tipo e título). Ele faz `POST /cartas` e só depois abre o `CardEditor`. O tipo fica fixo na definição: `salvar_rascunho` grava sempre `definicao.tipo` (`cursed_platform/cartas.py`).
- O `CardEditor.tsx` é um formulário em `Dialog`, com a prévia (`CardFace`) ao lado e três botões. Os problemas da validação aparecem numa lista com `campo` cru.
- O item usa a lista fixa `DADOS_ITEM` (Dano, Armadura, RDB, Peso) para qualquer subtipo. O `ItemFormatEditor` escolhe o subtipo num `<select>` e já trata mochila, aljava, Outros, raridade e categoria.
- `ConteudoItem.dados` é um dicionário livre. A ficha viva lê `dados.armadura` e `dados.rdb` dos itens equipados do tipo `armadura`.
- A aba Cartas já tem o grimório do detalhe (`DetalheDaCarta.tsx`, componente `Grimorio`). Ele usa a pintura do livro em branco (`cartas-detalhe-livro`), as artes quadradas por categoria, os quadros com medalhão (`grimorio-dado`) e a geometria em `cqw` (`docs/tecnicas-visuais.md`, seção 9).
- `IconeSubtipo` (`src/app/inventory/iconesItem.tsx`) já desenha um ícone por subtipo.
- `rules/sistema/Equipamentos.md` define as listas de campos de armadura, escudo e arma, as categorias e perfis de armadura, as famílias de proficiência e exemplos de propriedades. `Condições e Tipos de Dano.md` define os tipos de dano.

A motivação está na proposta, e os requisitos estão nas specs `editor-de-cartas` e `inventario-em-grade`.

## Goals / Non-Goals

**Goals:**
- Um só componente de editor para criar e editar, com o mesmo grimório do detalhe da carta.
- Os campos de item declarados em dados (`itens.json`), sem lista fixa no código.
- O servidor continua sendo a autoridade de validação e de concorrência.

**Non-Goals:**
- Não muda o cálculo da ficha viva nem passa a usar os campos novos de arma em rolagens.
- Não muda o detalhe da carta da ficha, além de extrair o `Grimorio` para ser reusado.
- Não há edição simultânea com mescla; o conflito continua sendo detectado por `versao_esperada`.

## Decisions

### D1. O editor é o grimório, com a página da direita editável
O `Grimorio` passa a receber o conteúdo das duas páginas (`esquerda` e `direita`) em vez de montar só os quadros de leitura. O detalhe da carta continua passando a citação e os quadros; o editor passa:

- **página da esquerda:**
  - a mesma `ArteDoGrimorio`, com o botão da câmera no canto, que envia a arte (`ImageUpload` com `destino="carta"`);
  - o cartucho do título, com o nome editável no lugar (um `<input>` com a tipografia do título e a pena ao lado);
  - a pílula da raridade, no caso de item;
- **página da direita:** o formulário, em quadros `grimorio-dado` com o controle dentro do quadro, no lugar do valor.

*Alternativa:* manter o `CardFace` como prévia e só restilizar o formulário. Descartada: o conceito aprovado é o grimório, e a página da esquerda precisa ser exatamente o que os jogadores verão no detalhe.

### D2. Criação preguiçosa
O editor abre com `definicao = null` e um rascunho local. O primeiro salvamento acontece quando o título deixa de estar vazio, ou quando uma imagem é enviada (o `prepararEnvio` cria antes). Ele faz `POST /cartas` com o tipo e o rascunho; os seguintes fazem `PUT /rascunho`. Fechar sem título não chama a API.

*Alternativa:* criar a carta ao abrir o editor. Descartada, porque deixaria rascunhos vazios a cada desistência.

### D3. Troca de tipo pela API, só antes da primeira publicação
O `SalvarRascunhoRequest` ganha `tipo` opcional. `cartas.salvar_rascunho` aceita a troca quando `definicao.versao_publicada is None` e grava o novo `tipo` na definição e no conteúdo. Com uma versão publicada, a troca responde 409, com a mensagem "O tipo de uma carta publicada não muda."

No cliente:
- os campos comuns (título, texto, requisitos, tags, ativos, ativos privados) são mantidos;
- os demais saem do rascunho;
- se algum deles tiver valor, a troca pede confirmação antes.

*Alternativa:* apagar a definição e criar outra. Descartada, porque perderia as imagens já enviadas, que ficam na pasta da carta.

### D4. Salvamento automático serializado
- **Quando salva:** um `useSalvamentoAutomatico` dispara 1 s depois da última alteração.
- **Um envio por vez:** só um salvamento fica em andamento. Alterações feitas durante o envio entram no próximo, com a `versao` devolvida.
- **Estados:** `ocioso`, `salvando`, `salvo`, `falha` e `conflito`.
  - Num 409, o editor para de salvar e oferece "Recarregar a carta".
  - Numa falha de rede, oferece "Tentar de novo".
- **Ao fechar:** se houver alteração pendente, o editor espera o salvamento terminar antes de fechar. Em falha, pergunta se quer descartar.

O texto do estado fica num espaço reservado no pé da página, para não fazer a tela saltar (`tecnicas-visuais.md`, seção 5).

### D5. Validação contínua mapeada para os campos
- **Quando valida:** depois de cada salvamento bem-sucedido, o cliente chama `POST /validacao`. A resposta não muda: `campo` é o caminho do Pydantic, como `dados.tipo_dano` ou `efeitos.0.modificadores`.
- **Mapeamento:** cada campo do editor se registra num mapa `caminho → { id do elemento, rótulo }`. Os campos de item vêm do catálogo, com o rótulo do próprio catálogo.
- **Exibição:**
  - um problema aparece no quadro do campo, com `aria-describedby`;
  - um caminho sem campo registrado aparece no topo da página da direita, com o rótulo do campo pai, e nunca com o caminho cru.
- **Publicar:**
  - usa `aria-disabled`, e não `disabled`, para continuar focável;
  - com pendências, mostra "N pendências" e, ao ser acionado, foca o primeiro campo com problema;
  - sem pendências, abre a confirmação de hoje.

*Alternativa:* validar no cliente. Descartada, porque duplicaria as regras e poderia divergir do servidor.

### D6. Campos por subtipo no catálogo de itens
O `itens.json` ganha três blocos:

```jsonc
"listas": {
  "familias_proficiencia": ["Armas Brancas Leves", "..."],   // Equipamentos.md, Proficiência
  "tipos_dano": ["Cortante", "Perfurante", "...", "Radiante"], // Condições e Tipos de Dano.md, físicos primeiro
  "categorias_armadura": ["Leve", "Média", "Pesada"],
  "perfis_armadura": ["Esquiva", "Bloqueio", "Híbrido"],
  "propriedades_arma": ["Leve", "Pesada", "Versátil", "..."]   // sugestões; aceita outras
},
"campos": {
  "dano": { "rotulo": "Dano", "tipo": "texto", "icone": "dano", "exemplo": "1d8" },
  "tipo_dano": { "rotulo": "Tipo de Dano", "tipo": "escolha", "lista": "tipos_dano" },
  "atributo_ataque": { "rotulo": "Atributo de Ataque", "tipo": "escolhas", "lista": "atributos" },
  "armadura": { "rotulo": "Armadura", "tipo": "inteiro" },
  "propriedades": { "rotulo": "Propriedades", "tipo": "etiquetas", "sugestoes": "propriedades_arma" }
  // ...
},
"campos_por_subtipo": {
  "uma_mao": ["categoria_arma", "familia_proficiencia", "atributo_ataque", "pericia_ataque", "dano",
              "atributo_dano", "tipo_dano", "alcance_normal", "alcance_maximo", "requisito_forca", "propriedades"],
  "peitoral": ["categoria_armadura", "perfil", "bonus_esquiva", "armadura", "rdb", "penalidade_esquiva",
               "penalidade_destreza", "penalidade_furtividade", "penalidade_deslocamento", "requisito_forca", "propriedades"],
  "capacete": ["propriedades"]
  // ...
}
```

- **Tipos de campo:**
  - `inteiro`: inteiro ≥ 0;
  - `texto`: livre, como o Dano "1d8";
  - `escolha`: um valor da lista;
  - `escolhas`: vários valores da lista;
  - `etiquetas`: lista livre, com sugestões.
- **Atributos e perícias:** são listas do próprio `itens.json`, com os mesmos nomes da ficha (`sheetCatalog.ts`). O servidor não tinha essas listas.
- **Chaves de `dados`:** são os ids dos campos. `dano`, `armadura` e `rdb` mantêm os nomes de hoje, e por isso a ficha viva e as cartas existentes não mudam.
- **Validação do catálogo:** `catalogos.py` valida as referências ao carregar. Campo inexistente, lista inexistente ou subtipo desconhecido fazem o carregamento falhar, com a mensagem do arquivo.
- **Entrega ao editor:** o catálogo de itens já servido ao frontend (`useCatalogoItens`) passa a incluir os três blocos.
- **Os campos do formato continuam no formato:** dimensão, mochila, aljava, mãos, pilha, versátil, raridade e categoria de Outros não entram em `campos_por_subtipo`.

*Alternativa:* listas fixas no TypeScript, por subtipo. Descartada pela regra do projeto: conteúdo do sistema fica em JSON (`dados-do-sistema-em-json`).

### D7. Validação dos `dados` do item no servidor
Em `cartas.validar`, com o formato definido:
- **chave declarada para o subtipo:** valida o tipo do campo. Um erro vira problema em `dados.<id>` e bloqueia a publicação;
- **chave não declarada** (Dano numa mochila, `peso`): vira problema em `dados.<id>`, com "Não se aplica a este tipo de item.", e bloqueia a publicação;
- **item sem formato:** continua como hoje. O formato pendente já bloqueia a publicação, e os `dados` só são conferidos depois que o subtipo é escolhido.

No editor, trocar o subtipo remove do rascunho as chaves que o novo subtipo não declara, com confirmação quando alguma tiver valor (a mesma regra da troca de tipo, D3).

*Alternativa considerada e descartada:* um quadro "Não se aplicam a este tipo", com revisão pendente. O banco de testes não tem item nem carta (consulta de 2026-09-30), e o usuário decidiu não se preocupar com dados antigos.

### D7a. Fim do peso
O peso não tem efeito desde a carga em grade, e o usuário decidiu aboli-lo:
- **Importações:** um `sem_peso(dados)` em `cursed_platform` remove a chave `peso` nos pontos que trazem dados de fora:
  - `migracao_json.py` e `migracao_tabelas.py`, para as fichas do sistema antigo;
  - a importação de equipamento da ficha viva (códigos EQ1/EQ2);
  - `cartas.rascunho_de_codigo`, para os códigos E1/E2/EQ1/EQ2.

  Nenhuma importação acrescenta aviso: o peso não tinha efeito.
- **Interface:** saem o campo do editor, o "Peso: X (só descrição)" da bandeja "Sem dimensão" (`InventoryPanel.tsx`) e o "Peso antigo (só referência)" da definição de formato (`InventoryGridPanel.tsx`).
- **Contrato:** a descrição de `ConteudoItem.dados` deixa de citar o peso.
- **Validação:** `peso` não é campo de nenhum subtipo, então a D7 o recusa.
- **Migração:** não há. O banco não tem dados.

### D8. Subtipo em ícones
O `ItemFormatEditor` troca o `<select>` pela fila "O que é?":
- botões de opção (`role="radiogroup"`) com `IconeSubtipo`, com rótulo acessível e dica com o nome;
- o "…" abre Outros e a escolha da categoria;
- a troca de subtipo mantém o comportamento atual: aplica a sugestão de dimensão e preserva o ícone, a raridade e a categoria.

Os campos do subtipo aparecem logo abaixo, em quadros.

### D9. Fidelidade visual e pinturas
- **Medidas:** a geometria é medida no conceito (`referencia/conceito-editor-mochila.png`) em frações do diálogo, como no detalhe (seção 9 das técnicas).
- **Pinturas reusadas:** o livro em branco (`cartas-detalhe-livro`) e as artes quadradas por categoria.
- **Pinturas novas, opcionais, geradas pelo Codex a partir do conceito:**
  - `cartas-editor-marcador`: o marcador de couro vazio, sem emblema nem texto. O emblema e o rótulo vêm por cima em SVG/CSS, e o estado ativo é feito em CSS (mais alto, dourado e brilhante);
  - `cartas-editor-selo`: o selo de cera vermelho vazio. O rótulo "Publicar" vem por cima, em texto;
  - os prompts ficam em `arte/prompts-codex/`, e as pinturas passam pelo `preparar_arte.py`.
- **Sem pintura:** o marcador vira uma aba em CSS com borda dourada, e o selo vira um botão vermelho arredondado com borda dourada.
- **Ícones:** os ícones dos quadros reusam `IconeDoDado` e `IconeSubtipo`. A câmera e os ícones que faltarem vêm de um conjunto pronto de licença livre, sem desenho à mão (`icones-prontos-antes-de-desenhar`).
- **Celular (< 768 px):** layout de fluxo, com os marcadores em linha rolável, a carta e depois os quadros em uma coluna.
- **Aprovação:** o `fidelidade-editor.mjs` gera a comparação lado a lado com o conceito, para o usuário aprovar.

### D10. Itens menores
- O "Custo legado" só aparece quando o rascunho tem `custo_legado`.
- "Versões publicadas" vira um `<details>` no pé da página da esquerda.
- O selo "só você vê" vale para Custo de Aprendizado e Descansos Mínimos, os mesmos que `redesenhar-aba-cartas` já esconde dos jogadores.
- Requisitos e tags viram campos de etiquetas. As sugestões de tags vêm das tags das cartas da mesa, já carregadas na biblioteca.
- A ativação vira um par de botões (Ativa / Passiva).

## Impacto no jogo

- **Escassez, risco de combate e ritmo:** nenhuma regra muda. Registrar os campos completos da regra (penalidades, Requisito de Força, alcance) deixa o custo de cada equipamento visível na carta, o que reforça escolhas de carga e de risco sem mudar números.
- **Ritmo narrativo:** criar uma carta durante a sessão deixa de pedir uma etapa extra e três botões. O Narrador volta à cena mais rápido.
- **Carga cognitiva:** o Narrador vê só os campos que valem para aquele item, com o rótulo da regra. Os jogadores não veem nada novo além do que já viam no detalhe da carta.

## Interações e dados

- **Ficha viva:** lê `dados.armadura` e `dados.rdb` de todo item equipado do tipo `armadura`, inclusive capacete, luvas e botas. A spec `carga-em-grade` diz que só o peitoral e o escudo dão Armadura e RDB. Esta mudança deixa de oferecer esses campos fora do peitoral e do escudo, mas não corrige o cálculo. A correção fica para uma mudança à parte.
- **Cartas e itens existentes:** sem migração de banco, porque o banco de testes não tem item nem carta.
- **Importação por código (E1/E2/EQ1/EQ2) e fichas do sistema antigo:** continuam gerando `dados` com as chaves de hoje, menos o peso (D7a). Um campo fora do subtipo só é recusado quando o Narrador escolhe o subtipo e publica.
- **Arquivos:**
  - `cursed_platform/catalogos/itens.json`, `catalogos.py` e `manifesto.json`;
  - `cursed_platform/cartas.py`, `contracts.py`, `migracao_json.py` e `migracao_tabelas.py`;
  - `platform/api/cursed_api/cards.py` e `catalogs.py`, `openapi.json` e `schema.ts`;
  - `platform/frontend/src/app/cards/*`, `inventory/ItemFormatEditor.tsx`, `characters/sheet/InventoryPanel.tsx` e `InventoryGridPanel.tsx`;
  - `characters/sheet/cartas/DetalheDaCarta.tsx` e `cartas.css`.

## Risks / Trade-offs

- [Salvamento automático gera muitas versões de rascunho] → os rascunhos não geram auditoria (comportamento atual), e o debounce de 1 s com envio serializado limita as chamadas.
- [Fechar a janela do navegador no meio de um salvamento] → `beforeunload` avisa enquanto houver alteração pendente.
- [O grimório não cabe com muitos campos (arma tem 11)] → a página da direita rola dentro do quadro, como os dados do detalhe. Os quadros se compactam em 2 colunas, e Propriedades ocupa a largura toda.
- [A pintura do marcador não casa com o livro] → é gerada a partir do conceito, que já tem o livro, e a versão em CSS cobre a falta.
- [Catálogo inválido derruba o carregamento] → mesma política dos outros catálogos, com teste que carrega o `itens.json` real.

## Migration Plan

1. Catálogo, validação no servidor e fim do peso (D6, D7, D7a). O editor atual deixa de publicar itens com campos fora do subtipo, o que é aceitável porque ele vai ser substituído na mesma mudança e o banco não tem cartas.
2. API de troca de tipo (D3).
3. Editor novo no lugar do antigo, com o `NovaCartaDialog` removido.
4. Pinturas e calibração visual.

Para voltar atrás, basta reverter o frontend: o servidor aceita o editor antigo, porque o `tipo` em `SalvarRascunhoRequest` é opcional.

## Open Questions

- **"Categoria" de arma e de escudo:** aparece na lista de campos da regra sem valores definidos. Fica como texto livre até a regra definir as categorias.

Decidido com o usuário em 2026-09-30: o terceiro tipo físico de dano no catálogo é **Contundente**, como em Equipamentos.md. A página Condições e Tipos de Dano ainda diz "Concussão" e só muda com a decisão do usuário.
