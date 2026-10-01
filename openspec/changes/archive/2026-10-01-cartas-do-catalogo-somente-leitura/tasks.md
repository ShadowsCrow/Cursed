# Tasks

## 1. Dados do catálogo

- [x] 1.1 Ler os quatro custos opcionais de cada habilidade em `catalogos.py` (inteiros ≥ 0; outro formato torna o arquivo inválido) e verificar por teste a leitura, a ausência e o valor inválido

## 2. Cartas do catálogo

- [x] 2.1 Levar os custos do JSON ao conteúdo da carta e incluí-los na conferência em `cartas_catalogo.py`; verificar por teste que um custo novo no JSON gera versão, que habilidade só com `custo` legado fica com os custos indefinidos e que a conferência repetida não cria versões

## 3. API

- [x] 3.1 Recusar com `409` salvar rascunho e publicar versão de carta com `origem_sistema` e verificar por teste de API que nenhuma versão é criada

## 4. Interface

- [x] 4.1 Tirar o lápis das cartas do catálogo do sistema na biblioteca e o aviso de JSON do editor; verificar por teste de componente

## 5. Verificação

- [x] 5.1 Rodar as suítes completas (Python e frontend) e conferir a biblioteca no navegador
  - 2026-09-30: frontend 672/672 e biblioteca conferida no navegador (lápis só nas cartas da mesa). Python 545/547: as 2 falhas são de `test_preparar_arte` (tamanho e dimensões das pinturas), fora desta mudança; fechar quando essa suíte voltar a passar.
  - 2026-10-01, uma vez no fim, com a árvore de todas as mudanças: backend 562 testes OK (16 pulados); `npm test` 91 arquivos e 692 testes; `lint`, `typecheck`, `check:client` (cliente regenerado) e `export_openapi --check` sem erros; e2e `node e2e/run.mjs` 84 testes. Para fechar: `test_preparar_arte` passou a conferir as peças da aba Cartas e do editor, com orçamento próprio de 4 MB para elas (6 MB para o resto), e `Libraries.test.tsx` simula a validação do editor aberto pelo grimório.
- [x] 5.2 Aprovação do usuário
  - 2026-10-01: aprovado pelo usuário ("tudo aprovado").
