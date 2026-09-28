# Passagem de trabalho — criacao-guiada-e-nova-estetica

Estado em 2026-09-28: **41 de 42 tarefas concluídas e verificadas** (a seção 8, altura e Tamanho fora da média, entrou a pedido do usuário e está pronta). Falta a 7.4 (execução verde no GitHub Actions, que exige commit e push). A 7.3 (validação de mesa) foi removida: o usuário proibiu esse requisito em todo o projeto em 2026-09-28. Nada foi commitado: ver "Cuidados" sobre a árvore de trabalho misturada.

> `AGENTS.md` aponta para esta mudança como ativa (atualizado em 2026-09-28, tarefa 1.2).

## O que a mudança faz

Classificação: **núcleo, apenas interface**. Nenhuma regra de mesa, limite ou catálogo muda.

1. **Assistente de criação guiada** do personagem do jogador (oito etapas: Conceito, Identidade, Raça, Classe e arquétipo, Atributos, Perícias, Personalidade, Conferência) numa rota própria `/mesas/:mesaId/criar-personagem`.
2. **Nova estética** (primeira fatia): tema em tokens, pergaminho, molduras em CSS/SVG, fontes serifadas, arte integrada e marca. Aplicada ao assistente, à ficha e à moldura da mesa.

Artefatos: `proposal.md`, `design.md` (decisões D1–D11), `specs/criacao-guiada-de-personagem/spec.md`, `specs/identidade-visual-da-plataforma/spec.md`, `tasks.md` (seções 1–7) e `arte/prompts.md`.

## Decisões do usuário (não reabrir sem pedir)

- **Altura e Tamanho fora da média (2026-09-28, regra nova):** intervalo típico de altura por raça; fora da média, o Tamanho passa um passo acima ou abaixo do da raça (Minúsculo não desce, Colossal não sobe, Colossal sem teto de altura) e a altura fica na faixa desse Tamanho; Deslocamento mantido; escolha só na criação, depois o Tamanho é do Narrador. Valores aprovados no design D12, escritos em `Criação de Personagem.md` (seção 3) e nos catálogos. Incluído nesta mudança por decisão do usuário.

- **Etapas:** só o que a ficha já modela. Vantagens e Desvantagens, equipamento inicial, Acessos e Escola de Especialização ficam para outra mudança; a Conferência avisa que serão combinados com o Narrador.
- **Distribuição:** guiada, com contadores (Atributos: `3`, `2×4`, `1×4`; Perícias: `3`, `2×3`, `1×4`, demais `0`) e uma saída explícita "seguir sem a distribuição padrão", que vira aviso na Conferência. O servidor **não** recusa distribuição fora do padrão.
- **Estética:** só a primeira fatia (fundação + assistente + ficha + moldura da mesa). Navegação superior, início, Sistemas, Biblioteca, Campanhas e ferramentas da imagem de referência **não** entram.
- **Arte:** gerada pelo usuário no ChatGPT, fora do repositório. Molduras, cantos, divisores, banners e selos são feitos em CSS/SVG (não vêm de imagem).
- **NPCs e monstros** e o diálogo "Nova entidade" do Narrador ficam como estão.

## Decisões técnicas principais (detalhe no `design.md`)

- **Criação atômica (D2):** o assistente monta a ficha no cliente e faz **um único** `POST /mesas/{mesa_id}/personagens`, que já aceita a ficha inteira, valida, fixa nível `1` e concede as cartas. Nenhuma ficha parcial existe antes da Conferência.
- **Prévia no servidor (D3):** novo `POST /mesas/{mesa_id}/personagens/previa` devolve PV, PP, Escalas (com fontes) e problemas de validação, sem gravar nem auditar. Reaproveita `cursed_platform/domain/recursos.calcular` e `validacao_ficha.validar_ficha`. O cliente **não** recalcula nada.
- **Distribuição no cliente (D4):** função pura em `distribuicao.ts`; a constante `3, 2×4, 1×4` / `3, 2×3, 1×4` é a única regra numérica do livro que o cliente conhece.
- **Rascunho (D5):** `localStorage`, chave `cursed:rascunho-personagem:v1:{mesaId}:{userId}`, sempre em `try/catch`, removido ao concluir ou descartar.
- **Tema (D7):** tokens em três camadas (primitivos, semânticos, componentes), com os tokens antigos (`--bg`, `--surface`, `--gold`, `--violet`…) mantidos como alias para as telas não migradas.
- **Arte (D11):** matrizes em `platform/frontend/arte-original/` (**ignorada pelo Git**, adicionada ao `.gitignore`); script `platform/frontend/scripts/preparar_arte.py` (Pillow do `.venv`, sem dependência nova) gera `platform/frontend/public/arte/`.

## Estado da arte (revisada e aprovada em 2026-09-28)

As 13 imagens estão em `platform/frontend/arte-original/` (PNG, ≈ 32 MB): `ancora-castelo` (1536×1024), `fundo-noite` (1254²), `pergaminho` (1254²), `emblema-cursed` (1254², RGBA), `retrato-vazio` (1024×1536) e oito `etapa-*` (1536×1024). Achados da revisão, que as tarefas 3.5–3.7 tratam:

- Nenhuma tem texto, moldura ou borda. Estilo coerente entre elas.
- **Pergaminho:** contraste do texto escuro `#2b1d10` de 7,8:1 no pior ponto e 12,5:1 na mediana (mínimo exigido: 4,5:1).
- **Texturas não repetem sem emenda:** diferença entre bordas opostas ≈ 15 no pergaminho (9 entre pixels vizinhos) e ≈ 25 no fundo (20 entre vizinhos). Corrigir no script.
- **Emblema:** fundo transparente, mas ≈ 4% dos pixels visíveis (bordas semitransparentes) têm halo avermelhado. Limpar no script. Detalhado demais para o ícone da aba: desenhar versão simplificada em SVG.
- **Âncora:** recortar 2:1 a partir do topo para manter lua e castelo; o terço esquerdo é escuro para o título.
- **Etapas de Perícias, Identidade e Conceito** são bem mais âmbar que a âncora azul: uniformizar com uma camada fria em CSS.

## Pendências e perguntas em aberto

- **Fontes (tarefa 3.3):** perguntar ao usuário se pode versionar arquivos `woff2` no repositório antes de baixar qualquer coisa; se não, manter o CDN com alternativas de sistema. Escolher também a fonte de leitura, com amostras.
- **Etapa Conceito:** o livro pede uma descrição curta do conceito, mas a ficha não tem campo para ela. A etapa só orienta e não grava nada; se o usuário quiser gravar o conceito, é uma mudança de contrato (novo campo), não desta.
- **Retrato:** o envio de retrato exige o personagem já existir; por isso o assistente só o oferece depois de criar.

## Cuidados

- **Árvore de trabalho suja:** ao iniciar esta conversa a branch `feature/retrato-refinamento` tinha 79 arquivos alterados que **não** são desta mudança (a mudança `reformular-exaustao-estresse-e-consequencias`, 23/23 tarefas, ainda sem commit; remoção dos diretórios das mudanças já arquivadas; ajustes em API, ficha e gerados). Não misturar os commits: commitar essa outra mudança separadamente ou trabalhar em outra branch, por decisão do usuário. Usar `git -c safe.directory=F:/Cursed ...`.
- Marcar tarefa `[x]` só com o comportamento **implementado e verificado por testes** (`AGENTS.md`).
- Após mudar a API: `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e `npm run generate:client` (em `platform/frontend`); o CI roda `export_openapi --check` e `npm run check:client`.
- `platform/frontend` tem testes com Vitest (`npm test`), Playwright (`npm run test:e2e`, sobe SQLite descartável, API e Vite) e capturas (`npm run capturas`). O e2e usa `e2e/screenshots.mjs`, que também semeia dados para verificação manual.
- Ambiente local já rodando de outra conversa: script `desgaste-local` em `http://localhost:5176` (API em `127.0.0.1:8003`), com SQLite descartável e dados de exemplo. Serve para ver o resultado; se a porta estiver ocupada, `preview_start` recusa e é preciso abrir a URL diretamente.
- **Vite no Windows** às vezes perde gravações em sequência rápida e serve módulo antigo; tocar o arquivo resolve.
- Sem `.env` nem `secrets.toml` no Git, e sem versionar skills fora das `openspec-*`.

## Ordem sugerida

1. Seção 1 (regras e dados; só confere textos contra o livro) e 2 (servidor: prévia, cliente gerado).
2. 3.1–3.4 (tokens, contraste, componentes) e a **3.10, a prova visual do tema**, para o usuário comparar com a imagem de referência antes de reestilizar o resto.
3. 3.5–3.8 (arte), depois 4 (assistente) e 5 (aplicar o tema).
4. 6 e 7 (migração sem mudança de dados e verificação).

## Decisões e registros da implementação

- **Fontes (3.3, decisão do usuário em 2026-09-28):** versionar `woff2` locais em `platform/frontend/public/fonts` (licença SIL OFL 1.1, textos ao lado). Exibição: Cormorant Garamond; leitura: **Alegreya Sans** (escolhida pelo usuário). O `@import` do Google Fonts foi removido; `src/design/fonts.css` declara `@font-face` com `font-display: swap`.
- **Prova do tema (3.10):** página `/preview/tema` (`src/app/ProvaDoTema.tsx`) com tokens, moldura, pergaminho, título ornado, botões, selos, emblema, cabeçalho com a âncora e uma ilustração de etapa. Capturas em desktop (1440 px) e 360 px sem rolagem horizontal. **Aprovada pelo usuário em 2026-09-28** (dourado, pergaminho e tamanho das molduras).
- **Rótulo das fontes de PV/PP:** o servidor mostrava "Base de escala de pp do Mago" (o `.capitalize()` rebaixava a sigla). Corrigido para "Base de Escala de PP do Mago" em `cursed_platform/domain/recursos.py`; nenhum teste nem tela dependia do texto antigo.
- **Emblema sem perda:** o WebP com perda reintroduz o halo nas bordas semitransparentes; o emblema é gravado sem perda (≈ 50 KB em 256, ≈ 600 KB em 1024). Total de `public/arte/`: ≈ 2,1 MB.

## Etapas do assistente e o livro (tarefa 1.1)

Textos de orientação em `platform/frontend/src/app/characters/creation/etapas.ts`, conferidos contra `rules/sistema` em 2026-09-28:

| Etapa do assistente | Seção do livro | O que o texto apresenta |
|---|---|---|
| Conceito | Criação de Personagem, 1. Conversa de campanha | conversa com o Narrador; quem, o que sabe fazer, por que participa; o conceito pode mudar; nada é gravado |
| Identidade | 2. Identidade e origem (+ abertura do capítulo: nível 1) | nome obrigatório, idade e sexo opcionais; sem nível; origem não concede bônus sozinha |
| Raça | 3. Raça, com "Altura e Tamanho fora da média" | Tamanho, Deslocamento (substitui os 9 m gerais), colunas da grade de carga; placeholders sem efeito; altura na média ou fora dela (um passo de Tamanho, Deslocamento mantido) |
| Classe e arquétipo | 4. Classe e arquétipo | bases de PV/PP e Escalas; habilidades já aprendidas; nível indicado só ao alcançá-lo; sem Proficiência/Acesso pelo nome |
| Atributos | 5. Atributos; Atributos e Perícias (Distribuição inicial) | um `3`, quatro `2`, quatro `1` = **15** pontos (conferido: 3 + 2×4 + 1×4 = 15) |
| Perícias | 6. Perícias; Atributos e Perícias (Distribuição inicial) | uma `3`, três `2`, quatro `1`, demais `0` = **13** pontos (conferido: 3 + 2×3 + 1×4 = 13); especialização/hobby/experiência só narrativos |
| Personalidade | 14. Personalidade, vínculos e objetivos | campos opcionais; não concedem bônus |
| Conferência | 7. PV, PP e Escalas; 15. Conferência final | PV/PP/Escalas calculados pelo servidor (fórmulas do livro em `recursos.py`); etapas 8–11 combinadas com o Narrador |

As etapas 8 a 11 e 12 do livro (habilidades/Proficiências/Acessos, criações iniciais e Escola de Especialização, Vantagens e Desvantagens, equipamento, valores derivados) não são etapas do assistente, por decisão do usuário; a Conferência avisa que são combinadas com o Narrador. Limites do servidor (Atributo 1–5, Perícia 0–5) conferidos com `Progressão e Proficiência.md` ("limite normal de um Atributo é 5"; Perícia "limite comum de 5").

A constante da distribuição vive no cliente (`distribuicao.ts`, design D4). Se o padrão passar a variar por mesa, ela migra para os dados do sistema.

## Verificação (2026-09-28)

- `npm run lint`, `npm run typecheck`, `npm test` (61 arquivos, 424 testes), `npm run check:client`: verdes.
- `python -m unittest discover -s cursed_platform/tests -t .` (420 testes, 16 pulados) e `export_openapi --check`: verdes.
- `npm run test:e2e` (SQLite descartável): 10/10, incluindo fonte bloqueada, Mago Elfo criado só pelo teclado em desktop e em 360 px, e abandono/retomada do rascunho no celular.
- `npm run capturas`: 27 telas em desktop e celular, com as novas `24-assistente-conceito`, `25-assistente-classe`, `26-assistente-atributos` e `27-prova-do-tema`.
- Seção 8: testes de catálogo comparam os números do JSON com as tabelas do livro; API cobre na média, fora do intervalo, mais alto (Grande, com a grade de 7 colunas), dois passos recusado, Colossal sem teto e Tamanho continuando do Narrador depois da criação; e2e cria um Elfo mais alto que a média (Grande, 2,20 m). Totais após a seção 8: 434 testes do frontend, 437 Python, 10/10 e2e.
- Fichas de exemplo (`fixtures/legacy`) idênticas antes e depois da prévia e da criação (`test_fichas_existentes_inalteradas.py`); sem migração e sem alteração de catálogos. A única diferença de leitura da ficha é o texto da fonte de base de classe, corrigido de "Base de escala de pp" para "Base de Escala de PP" (valores iguais).
- Achado durante os testes: dois cliques rápidos em "Criar personagem" gravavam duas vezes; corrigido com uma trava síncrona no assistente.

## Onde está cada parte

- Servidor: `cursed_platform/domain/previa_criacao.py`, endpoint `POST /mesas/{mesa_id}/personagens/previa` em `platform/api/cursed_api/characters.py`, `PreviaCriacaoResposta` em `contracts.py`.
- Assistente: `platform/frontend/src/app/characters/creation/` (`distribuicao.ts`, `rascunho.ts`, `modelo.ts`, `etapas.ts`, `AssistenteCriacao.tsx`, `CamposDasEtapas.tsx`, `EtapaConferencia.tsx`, `CriarPersonagemPage.tsx`, `assistente.css`). Rota `/mesas/:mesaId/criar-personagem`.
- Tema: `src/design/tokens.css` (três camadas), `fonts.css`, `tema-telas.css`, `contraste.ts` + `tokens.test.ts`; componentes em `src/ui/Tema.tsx`, `src/ui/Arte.tsx`, `src/ui/tema.css`; prova em `/preview/tema`.
- Arte: `platform/frontend/scripts/preparar_arte.py` → `public/arte/` e `public/favicon-*.png`; `public/favicon.svg` desenhado à mão.

## Próximos passos

1. **7.4:** decidir com o usuário como separar os commits (esta mudança, a `reformular-exaustao-estresse-e-consequencias` e a limpeza das mudanças arquivadas estão juntas na árvore), commitar, fazer push e registrar aqui a execução verde do workflow `platform-contract.yml`.
2. Depois: `/opsx:archive criacao-guiada-e-nova-estetica`.
