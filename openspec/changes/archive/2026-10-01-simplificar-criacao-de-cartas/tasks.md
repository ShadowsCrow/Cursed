# Tarefas — simplificar-criacao-de-cartas

## 1. Regras

- [x] 1.1 Confirmar que nenhuma página de `rules/sistema` muda: os campos por subtipo só representam as listas de campos de `Equipamentos.md` e os tipos de `Condições e Tipos de Dano.md`. Registrar no `HANDOFF.md` a decisão do usuário ("Contundente" no catálogo; a página de tipos de dano ainda diz "Concussão") e o fim do peso (verificação: nota escrita; `git diff rules/` sem mudança desta mudança).

## 2. Dados

- [x] 2.1 `itens.json`: blocos `listas`, `campos` e `campos_por_subtipo` (design D6), com os campos de arma (uma e duas mãos), peitoral, escudo, capacete/luvas/botas (só Propriedades), mochila, aljava e Outros. `dano`, `armadura` e `rdb` mantêm os ids de hoje. Atualizar o `manifesto.json` (verificação: o `itens.json` real carrega; `test_catalogos.py` confere que mochila e capacete não declaram `dano`, `armadura` nem `rdb`, e que peitoral e escudo declaram `armadura` e `rdb`).
- [x] 2.2 `catalogos.py`: carregar e validar os blocos novos, com atributos e perícias como listas do próprio catálogo, com os nomes da ficha. Campo, lista ou subtipo desconhecido falham o carregamento, com o nome do arquivo (verificação: `test_catalogos.py` — catálogo válido; campo inexistente em `campos_por_subtipo`; lista inexistente; subtipo desconhecido; tipo de campo inválido).

## 3. Servidor

- [x] 3.1 `cartas.validar` com os `dados` do item (design D7): campo declarado com valor inválido e chave não declarada para o subtipo viram problema em `dados.<id>` e bloqueiam a publicação; item sem formato continua como hoje (verificação: `test_cartas.py` — espada com `tipo_dano` fora da lista recusada; `armadura` negativa recusada; mochila com `dano` recusada com "Não se aplica a este tipo de item."; `peso` recusado em qualquer subtipo; espada válida publicada; carta sem formato inalterada).
- [x] 3.1a Fim do peso (design D7a): `sem_peso` nas importações de fichas antigas (`migracao_json.py`, `migracao_tabelas.py`), de equipamento da ficha viva e de códigos de carta; descrição de `ConteudoItem.dados` sem peso (verificação: testes de migração, de ficha viva e de importação de carta — os itens chegam sem `peso`; os testes que hoje afirmam o peso como descrição passam a afirmar a ausência dele).
- [x] 3.2 Troca de tipo antes da primeira publicação (design D3): `tipo` opcional no `SalvarRascunhoRequest`; `salvar_rascunho` grava o tipo novo na definição e no conteúdo; com versão publicada, responde 409 (verificação: testes de API — troca de Magia para Habilidade num rascunho; recusa depois de publicar; o `tipo` omitido mantém o comportamento atual; conflito de versão continua 409).
- [x] 3.3 Catálogo de itens servido com `listas`, `campos` e `campos_por_subtipo`; regenerar `openapi.json` e `schema.ts` (verificação: `test_api_catalogos.py` com os blocos na resposta; o `schema.ts` regenerado sem diferença manual).

## 4. Interface — base do editor

- [x] 4.1 Extrair do `DetalheDaCarta.tsx` um `Grimorio` que recebe as duas páginas, sem mudar o detalhe da carta (design D1) (verificação: `CartasFicha.test.tsx` e `CartasDeCatalogo.test.tsx` inalterados e verdes; `cartas-visual.spec.mjs` com as mesmas medidas do grimório).
- [x] 4.2 `useSalvamentoAutomatico`: debounce de 1 s, um envio por vez, criação preguiçosa no primeiro salvamento com título, estados `ocioso`, `salvando`, `salvo`, `falha` e `conflito`, e espera ao fechar (design D2 e D4) (verificação: Vitest com timers falsos — nada é criado sem título; a primeira alteração com título faz `POST` e as seguintes `PUT` com a versão devolvida; alterações durante o envio entram no próximo; 409 para os salvamentos e mostra o conflito; fechar espera o salvamento pendente).
- [x] 4.3 Mapa de problemas por campo (design D5): registro `caminho → elemento e rótulo`, problema no quadro com `aria-describedby`, caminho sem campo mostrado com o rótulo do pai, nunca cru, e contagem de pendências (verificação: Vitest — problema em `formato` aparece junto de "O que é?"; `efeitos.0.modificadores` aparece no efeito 1; nenhum texto com ponto de caminho na tela).

## 5. Interface — editor no grimório

- [x] 5.1 `CardEditor` reescrito no grimório (design D1): marcadores de tipo no topo, página da esquerda com a arte, o botão da câmera, o título editável e a raridade, página da direita com os campos do tipo em quadros, e pé com o estado do salvamento e Publicar. O `NovaCartaDialog` sai da `NarratorLibrary` (verificação: Vitest cobre os cenários "Narrador cria uma habilidade", "Narrador desiste" e "Narrador envia a arte" da spec `editor-de-cartas`; `NarratorLibrary` abre o editor direto em "Nova carta").
- [x] 5.2 Troca de tipo no editor (design D3): os campos comuns são mantidos; pede confirmação quando descarta valores; com versão publicada, só o tipo atual fica selecionável (verificação: Vitest cobre "Troca de Magia para Habilidade" e "Carta já publicada").
- [x] 5.3 Publicar único (design D5): `aria-disabled` com "N pendências" e foco no primeiro problema; sem pendências, a confirmação de hoje, com o aviso da arte privada (verificação: Vitest cobre "Duas pendências" e "Publicação com arte privada"; a versão publicada aparece no histórico recolhido).
- [x] 5.4 Fila "O que é?" no `ItemFormatEditor` (design D8): `radiogroup` com `IconeSubtipo`, "…" para Outros e a categoria, e a mesma regra de troca de subtipo de hoje (verificação: `ItemFormatEditor.test.tsx` — escolha por clique e por setas; Outros com categoria; ícone, raridade e categoria preservados na troca).
- [x] 5.5 Campos do subtipo a partir do catálogo, e troca de subtipo descartando os campos que não se aplicam, com confirmação (design D6 e D7) (verificação: Vitest cobre "Mochila sem campos de combate", "Espada com os campos da regra", "Capacete sem Armadura", "Espada vira mochila" e "Lista de campos alterada no catálogo", este com um catálogo de teste com um campo novo no escudo).
- [x] 5.5a Peso fora da interface (design D7a): sai do editor, da bandeja "Sem dimensão" (`InventoryPanel.tsx`) e da definição de formato (`InventoryGridPanel.tsx`) (verificação: `InventoryGridPanel.test.tsx` e `CardEditor.test.tsx` sem "Peso" na tela, mesmo com `dados.peso` vindo da API).
- [x] 5.6 Itens menores (design D10): "Custo legado" só quando existe; selo "só você vê" em Custo de Aprendizado e Descansos Mínimos; requisitos e tags em etiquetas, com sugestões da mesa; ativação em dois botões (verificação: Vitest cobre "Custos de aprendizado"; habilidade nova sem "Custo legado"; carta importada com ele).

## 6. Arte e fidelidade visual

- [x] 6.1 Prompts das pinturas novas (`cartas-editor-marcador` e `cartas-editor-selo`) em `arte/prompts-codex/` e no `arte/prompts.md`, gerados pelo Codex a partir do conceito, e preparo no `preparar_arte.py` (design D9) (verificação: prompts escritos; `test_preparar_arte.py` com os tamanhos e o fundo transparente das duas peças).
- [x] 6.2 Geometria do editor medida no conceito, em frações do diálogo e em `cqw`, com marcadores e selo em CSS na falta das pinturas (verificação: `e2e/editor-visual.spec.mjs`, na prévia `/preview/editor` — posições dos marcadores, das páginas, dos quadros e do selo em frações do diálogo em 1600 px; cenário "Pinturas ausentes" com as pinturas bloqueadas; axe sem violações).
- [x] 6.3 Layout do celular (verificação: e2e cobre o cenário "Celular" — sem rolagem horizontal em 400, 375 e 320 px, com marcadores, carta e campos em coluna).
- [x] 6.4 Integrar as pinturas geradas e calibrar o enquadramento (verificação: `fidelidade-editor.mjs` gera a comparação lado a lado com `referencia/conceito-editor-mochila.png`, e o **usuário aprova**).
  - 2026-10-01: aprovado pelo usuário ("tudo aprovado").

## 7. Fechamento

- [x] 7.1 `HANDOFF.md` da mudança e atualização do `AGENTS.md` com a mudança ativa (verificação: arquivos escritos).
- [x] 7.2 Suítes completas uma vez no fim: `pytest`, Vitest, `tsc`, ESLint e e2e (verificação: todas verdes, com a saída registrada no `HANDOFF.md`).
  - 2026-10-01, uma vez no fim, com a árvore de todas as mudanças: backend 562 testes OK (16 pulados); `npm test` 91 arquivos e 692 testes; `lint`, `typecheck`, `check:client` (cliente regenerado) e `export_openapi --check` sem erros; e2e `node e2e/run.mjs` 84 testes. Para fechar: `test_preparar_arte` passou a conferir as peças da aba Cartas e do editor, com orçamento próprio de 4 MB para elas (6 MB para o resto), e `Libraries.test.tsx` simula a validação do editor aberto pelo grimório.
