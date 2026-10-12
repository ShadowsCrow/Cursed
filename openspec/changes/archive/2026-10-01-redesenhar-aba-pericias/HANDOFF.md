# Passagem de trabalho — redesenhar-aba-pericias

## O que a mudança faz

Classificação: **núcleo, apenas interface**. A aba Perícias vira uma cópia fiel da imagem de referência do usuário (`referencia/pericias.webp`, 2026-09-29). A folha tem:
- pergaminho com cena em sépia;
- três quadros com estandarte pintado e medalhão;
- ícone próprio por perícia;
- selo na maior base;
- caixa do ajuste;
- placa dourada do total.

Nenhuma regra, limite ou cálculo muda.

## Decisões do usuário (2026-09-29; não reabrir sem pedir)

1. **Cópia fiel da referência.** O plano de fidelidade está no design D9: prévia com os dados da imagem, sobreposição automática, asserções de medida e aprovação.
2. **Selo escuro na base:** marca a **maior base da ficha** (resposta do usuário: "que é o maior atributo da ficha"). Na implementação:
   - todas as empatadas ganham o selo;
   - nenhuma o ganha quando a maior base é 0.
3. **Ajuste manual:** caixa só de leitura. Só se edita por "Editar valores", em lote, como hoje.
4. **Aprovação visual (2026-09-29):** o usuário aprovou a comparação lado a lado com as pinturas ("Ta otimo"), com os cartões ~10 px abaixo da referência, o ajuste "3" sem sinal e os nomes longos condensados, como implementados.

## Estado (2026-09-29)

Todas as tarefas concluídas: implementado, verificado e aprovado pelo usuário. Falta o commit, separado das outras mudanças abertas na mesma árvore.

## O que foi feito

- **Mesma construção da aba Atributos** (design D0): outra sessão fez a aba Atributos com uma referência do mesmo desenho. Perícias reaproveita:
  - as classes de `atributos.css`;
  - os ornamentos exportados de `AtributosFicha.tsx`: `VolutaDaFaixa`, `ArcoDaFaixa`, `FiligranaDoMedalhao` e `PinturaOpcional` (só ganharam `export`);
  - medalhão, braço, livro e pena de `atributos/icones.tsx`;
  - o gancho `useEdicaoEmLote`.

  `pericias/pericias.css` guarda só as diferenças.
- **Ícones:** 30, por nome da perícia (`pericias/nomesDosIcones.ts`, `pericias/icones.tsx`): 25 desenhos novos e 5 dos Atributos. O `listas_ficha.json` e o Resumo não mudaram.
- **Pinturas do usuário** (2026-09-29, 2048 × 768) integradas em `public/arte/pericias/` por `preparar_arte_das_pericias`:
  - A paisagem fica multiplicada sobre o papel.
  - Os estandartes têm menos tinta por cima que os dos Atributos, porque já vêm na cor do grupo.
  - O de Técnicas leva mais verde, porque o céu da pintura é amarelo. O de Talentos, um pouco mais de vinho.
- **Prévia:** `/preview/ficha?secao=pericias&pericias=referencia`. A API de demonstração passou a devolver os totais das perícias (base + ajuste).
- **Fidelidade:** `e2e/fidelidade-pericias.mjs` empilha a referência e a prévia, na mesma escala, e gera a sobreposição. A página da prévia limita a folha a ~1376 px, e a da referência mede 1428. As medidas viraram asserções em `e2e/pericias-visual.spec.mjs`.
- **Desvio consciente da referência:** os cartões ficam ~10 px abaixo da posição da imagem. Na posição exata, a crista do medalhão de Talentos encostava no fim do texto de apresentação (o e2e confere).
- **Ajuste manual:** aparece como na referência, "3" sem sinal e "−1" com sinal. Os Atributos mostram "+1". Falta o usuário dizer se as duas abas devem igualar.

## Efeitos em outras mudanças

- `e2e/atributos-visual.spec.mjs` (de `redesenhar-aba-atributos`): os seletores passaram a ser do painel `#painel-atributos`. Como Perícias usa as mesmas classes, os cartões escondidos dela entravam na contagem de colunas e na busca de imagens.
- `test_preparar_arte.py`: o `ESPERADO` ganhou as pinturas dos Atributos e das Perícias, que faltavam.
- `CharacterSheetPage.test.tsx`: o teste da moldura comum não lista mais Perícias, e há um teste novo para a folha.

## Verificação (2026-09-29)

- `npx vitest run src/app/characters/sheet/pericias` → 13 testes.
- `CharacterSheetPage.test.tsx` com a aba Personalidade simulada → 14 de 15. A falha que sobra é "cada seção fica na moldura", efeito da simulação.
  - Sem a simulação, 14 testes falham por `faixa.getClientRects` no `PersonalityPanel.tsx`, trabalho em andamento da sessão de Personalidade no jsdom.
- `E2E_APP_URL=http://localhost:5179 npx playwright test -c e2e/playwright.config.mjs pericias-visual atributos-visual` → 20 testes.
- `python -m unittest cursed_platform.tests.test_preparar_arte` → OK.
- `tsc --noEmit` sem erros nos arquivos desta mudança. O erro restante é de `personalidade/icones.test.tsx`, de outra sessão.
- `eslint` limpo nos arquivos tocados.

## Suítes completas (2026-09-29, depois da aprovação)

Tarefa 7.1 concluída; todas as suítes estão verdes:
- **Frontend:**
  - `npm test`: 82 arquivos e 603 testes;
  - `typecheck`, `check:client` e `lint` sem erros.
- **e2e:** `node e2e/run.mjs` com API e Vite locais, 53 testes.
- **Backend:** `python -m unittest discover -s cursed_platform/tests -t .`, 534 testes (16 pulados). `export_openapi --check`: atualizado.
- **Falhas de outras sessões, já corrigidas por elas:**
  - o lint de `IdentityPanel.test.tsx`;
  - a Personalidade rolando em 320 px;
  - `test_fichas_existentes_inalteradas` com o `listas_ficha.json` novo da Personalidade.

## Cuidados

- **Árvore misturada:** ainda estão sem commit `reformular-visual-da-ficha`, `redesenhar-aba-atributos`, `redesenhar-informacoes-basicas` e `reformular-personalidade-da-ficha`. Os commits precisam ser separados.
  - **Arquivos novos:** `sheet/pericias/`, `e2e/pericias-visual.spec.mjs`, `e2e/fidelidade-pericias.mjs` e `public/arte/pericias/`.
  - **Arquivos existentes, com edição pontual:**
    - `CharacterSheetPage.tsx` e o teste dela;
    - `atributos/AtributosFicha.tsx` (quatro `export`) e `e2e/atributos-visual.spec.mjs` (escopo dos seletores);
    - `e2e/playwright.config.mjs`;
    - `preparar_arte.py` e `test_preparar_arte.py`;
    - `plataforma/fichaCompletaDemonstracao.ts` e `ProvaDaFicha.tsx`;
    - `.claude/launch.json` (servidor `pericias-preview`, porta 5184).
- **Arquivamento:** só depois de `reformular-visual-da-ficha`, de onde vem a capability `visual-da-ficha`.
- Molduras só em SVG/CSS, na técnica do Resumo. Pinturas só como ilustração.
