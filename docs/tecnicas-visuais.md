# Técnicas visuais da plataforma

Técnicas testadas na reformulação da ficha (mudança `reformular-visual-da-ficha`, 2026-09), para repetir em outras telas. Os exemplos citados ficam em:
- `platform/frontend/scripts/preparar_arte.py`;
- `platform/frontend/src/app/characters/sheet/` (`InventarioFicha.tsx`, `pinturasDaBolsa.ts` e `inventario.css`);
- `platform/frontend/e2e/ficha-visual.spec.mjs`.

## 1. O que é SVG/CSS e o que é pintura

- **Molduras, cantos, chanfros, frisos e costuras são sempre SVG ou CSS**, nunca imagem. Decisão do usuário: molduras em imagem ficam serrilhadas e não esticam.
  - Molduras douradas: `MolduraOrnamentada` (`src/ui/Ornamentos.tsx`), com `border-image` sobre um SVG de 9 fatias. Os cantos ficam fixos e os lados esticam.
  - Um fundo desenhado só no `border-image` fica invisível para o axe, que acusa contraste falso. Dê à moldura um `background-color` real no `padding-box`.
- **Pinturas são ilustração**: cenas, texturas e objetos (couro, mapa, tecido, saco de moedas). Toda pintura é opcional. Sem ela, a tela precisa ficar coerente, com o desenho em SVG/CSS no lugar e sem imagem quebrada.
- **Densidade de ornamento:** siga as imagens de referência, com peças que saem da caixa, e não caixas simples com borda.

## 2. Pipeline das pinturas

1. **Prompts** no `arte/prompts.md` da mudança. Todas as peças de uma tela saem da **mesma conversa** do ChatGPT, com a mensagem inicial de estilo e a imagem de referência anexada. Assim o couro e o tecido ficam iguais entre as peças.
2. **Matrizes** em `platform/frontend/arte-original/`, fora do Git, com os nomes do prompt.
3. **Preparo:** `.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py` grava WebP em `platform/frontend/public/arte/`. Só usa Pillow.

### Fundo transparente sem pedir transparência

O ChatGPT não garante transparência. Peça o objeto **sobre fundo de pergaminho liso**, e o script troca o fundo:
- `cor_do_fundo`: mede a cor num canto de cima, que o prompt diz ser "só fundo".
- `remover_fundo`: apaga só o fundo **ligado às bordas** (floodfill a partir delas). Uma área clara cercada pelo objeto, como o mostrador de uma bússola, continua opaca.
- `manter_objeto_principal`: apaga manchas soltas; fica só o que está ligado ao objeto do centro. Por isso, **tudo o que for pintado precisa tocar o objeto principal**.
- `recortar_objeto`: faz as três coisas e recorta rente ao objeto.
- `esmaecer_bordas_cortadas`: quando o objeto encostava na borda da pintura, ali ele sai cortado reto; o script esmaece esse lado.

Regras para o prompt:
- fundo liso e uniforme, sem mesa, sombra projetada ou vinheta;
- o canto medido deve ser só fundo;
- o objeto não encosta nas bordas da imagem.

### Texturas que se repetem

`sem_emenda`: mistura a textura com ela mesma deslocada em meia largura, nas duas direções. Serve para couro, pergaminho e outros fundos em `background-repeat`.

## 3. Peças que esticam sem distorcer (três fatias)

Para ilustrações que acompanham um conteúdo de tamanho variável, como as laterais e a base da bolsa, que vai de 2 a 13 colunas e de 3 a 8 linhas:

- **Divisão:** a pintura vira **topo, miolo e base**. O topo e a base aparecem inteiros; o miolo se repete.
- **Onde está o miolo:** `achar_miolo` pega a faixa contínua mais longa em que o objeto tem a menor largura, onde só aparece a tira de couro. Quando a pintura não permite (objeto encostando no alto, tecido correndo a peça toda), informe a faixa à mão, em frações da altura (`LADOS_DO_INVENTARIO`).
- **Sem emenda (`dividir_lateral`):**
  - o miolo começa `k` linhas abaixo do início da faixa;
  - as últimas `k` linhas dele se misturam com as `k` primeiras da faixa, que na pintura vinham logo antes;
  - assim, o fim de uma repetição emenda no começo da próxima, e o topo emenda no primeiro miolo.
- **Na horizontal:** gire a pintura 90° (`preparar_base`), divida como vertical e desgire as partes.
- **Na tela:** uma coluna com topo e base em `<img>` (proporção natural) e o miolo como fundo, com `background-size: 100% auto` e `background-repeat: no-repeat round`. `round` repete um número inteiro de cópias, e a peça estica sem distorcer.
  - Na horizontal: `auto 100%` e `round no-repeat`.
  - Num grid, use `grid-template-rows: minmax(0, 1fr)`. Com linha `auto`, o `height: 100%` dos `<img>` vira o tamanho natural, e as partes vazam.
- **O miolo precisa ser limpo:** só a tira reta, sem objeto e sem franja. Qualquer detalhe repetido forma padrão. A franja de um tecido repetida vira um serrilhado regular.

## 4. Composição em volta de um conteúdo ("lanche")

A grade da bolsa fica no meio: laterais dos lados, tampa em cima e base embaixo.

- **Laterais:** `position: absolute` na bolsa.
  - `--lado` é a largura; `--lado-sobre` é o quanto fica por cima da borda, a tira de couro.
  - O resto, com os objetos, avança para fora, e a coluna reserva esse espaço (`padding-inline`).
- **Tampa atrás do conteúdo:** `z-index: -1` num filho da bolsa. Funciona porque a bolsa não cria contexto de empilhamento (sem `z-index`, `transform` ou `filter` nela).
  - A altura é fixa, com uma parte escondida atrás da bolsa. Esconder mais a alarga sem ocupar mais altura.
  - `max-width` com `object-fit: contain` a encolhe em conteúdo estreito.
- **Base:** fica entre as laterais e por baixo delas (vem antes no DOM). As pontas ficam atrás das ponteiras das laterais (`--base-recuo`).
  - A borda de cima esmaece no couro com `mask-image`, **aplicada em cada parte**. Na base inteira, a máscara corta a sombra do `filter: drop-shadow`.
- **Reserva de espaço:** use `:has()` na coluna (`.inventario-ficha__bolsa:has(.bolsa--tampa)`). As variáveis de tamanho entram na conta da célula (`--folga-bolsa`, `--reserva`).
  - Ao alargar uma peça, confira os vizinhos. A bolsa mais larga espremeu o painel do item, e o painel precisou de um mínimo (`minmax(22rem, 1fr)`).
- **Celular:** peças mais finas que **não reservam espaço**. A grade de 8 colunas precisa caber em 400 px, e elas avançam pela margem da moldura da seção.
- **Tamanho por container query:** `container: secao / inline-size` e `100cqi` fazem a célula acompanhar a largura da seção, não da tela.

## 5. Carregar pinturas sem a tela saltar

`pinturasDaBolsa.ts`:
- **Grupos independentes:** as pinturas são pré-carregadas em grupos (laterais; tampa e base). Um grupo pode faltar sem afetar o outro.
- **Três estados:**
  - `carregando`: a tela já reserva o espaço, sem desenhar nada;
  - `prontas`: desenha as pinturas;
  - `ausentes`: volta ao desenho em SVG/CSS.
- **Cache da sessão:** o resultado vale para a sessão inteira, e a troca não se repete a cada vez que a aba abre.
- **Tamanho natural:** vem do pré-carregamento e vai para os `width` e `height` dos `<img>`. Eles nascem com a proporção certa e não empurram nada ao decodificar.
- **Conteúdo que muda com uma ação:** também pode saltar. Por exemplo, "(girado)" quebrava uma linha e crescia o painel. Evite texto sem utilidade e reserve espaço para o estado da gravação.

## 6. Testes das peças visuais

- **Script:** pinturas **sintéticas** desenhadas no teste. Uma tira com degradê faz qualquer emenda aparecer, e objetos no alto e embaixo ficam fora do miolo. Os testes conferem:
  - recorte, transparência e partes;
  - repetição sem emenda (diferença entre a última e a primeira linha perto da diferença entre linhas vizinhas);
  - recusa de objetos no miolo.

  Cuidado: um "objeto" com cor parecida com a do fundo é apagado como fundo.
- **Componente:** `vi.stubGlobal("Image", ...)` simula imagens que carregam ou falham. No jsdom, nenhuma imagem carrega sozinha.
- **E2E:**
  - `contexto.route(...)` serve as pinturas sintéticas de `e2e/fixtures/bolsa/` no lugar das reais, que podem nem existir;
  - as medidas cobrem nenhuma peça sobre células, nada vazando da própria caixa (meça também os filhos, não só o contêiner), espaço reservado e nenhuma rolagem horizontal;
  - tudo isso numa matriz de tamanhos e larguras.
- **Salto de layout:** um `PerformanceObserver` de `layout-shift` com `sources` mostra **qual** elemento se moveu. Use-o antes de adivinhar a causa.
- **Capturas:** `node e2e/capturas-ficha.mjs` (prévia `/preview/ficha`, com `E2E_APP_URL`) gera a matriz em `.screenshots/`. Para a ficha real no ambiente local, a identidade do modo de desenvolvimento pode ir direto no `localStorage` (`cursed-dev-identidade`).

## 7. Armadilhas de ferramenta

- **`sed -i` no Git Bash do Windows** remove o CRLF de arquivos que o usam. Edite com Python (`io.open(..., newline="")`) ou confira o fim de linha depois.
- **HMR do Vite:** às vezes não percebe edição feita por `sed`. Reescrever o arquivo resolve.
- **Outras sessões:** várias sessões podem editar a mesma árvore ao mesmo tempo, e uma página em branco pode ser um arquivo que outra sessão ainda está criando. Veja o log do Vite antes de mexer.

## 8. Gerar as pinturas pelo Codex

As pinturas são geradas pelo Codex CLI (`codex`), logado na conta ChatGPT do usuário, com a ferramenta `$imagegen`. Não é preciso pedir ao usuário que gere no ChatGPT (correção dele em 2026-09-30).

- **Chamada:** `codex exec --skip-git-repo-check -m gpt-5.6-sol -s read-only -i <referência> - < prompt.txt`, numa pasta do scratchpad.
  - O `-m gpt-5.6-sol` é obrigatório: o modelo padrão do `config.toml` é recusado com conta ChatGPT.
- **Prompt:** começa por "Use $imagegen to generate exactly ONE image, and nothing else" e termina pedindo só o caminho da imagem.
  - A resposta traz `C:\Users\...\.codex\generated_images\...\*.png`.
  - Extraia o caminho com `grep -aoE '[A-Z]:[^ `]*generated_images[^ `]*\.png'`.
- **Lotes:** gere a primeira peça a partir da imagem de referência do usuário. Gere as demais anexando essa primeira, pedindo "a mesma imagem" e mudando só o emblema, a cor ou as figuras. Assim a série sai coerente (artes e faixas das cartas).
- **Enquadramento:** o gerador entrega 1536 × 1024. Peça a composição dentro da faixa que o `preparar_arte.py` vai recortar (por exemplo, a faixa do meio para uma proporção 3,37:1). Quando a referência tem outra proporção, complete-a até 3:2, espelhando as bordas, antes de anexar.

## 9. Pintura como fundo e conteúdo por cima (o grimório da carta aberta)

Quando o conceito aprovado é uma cena pintada (livro, couro, velas), o desenho em CSS nunca fica igual. A técnica da aba Cartas (`DetalheDaCarta.tsx` e o bloco do grimório em `cartas.css`):

1. **Pintura de fundo:** o próprio conceito, regenerado com as áreas de conteúdo em branco. No grimório, são as páginas sem quadros, texto ou ícones, e sem a moldura de fora.
2. **Geometria:** medida no conceito e calibrada na pintura, em frações do diálogo.
   - O diálogo tem a proporção do conceito (`aspect-ratio`) e é `container-type: inline-size`.
   - Os tamanhos são em `cqw`, e o conjunto escala com a janela sem mudar de desenho.
3. **Conteúdo por cima em SVG/CSS:** quadros, textos e ícones. Artes que são ilustração no conceito, como o medalhão da categoria, também viram pinturas.
4. **Sem a pintura:** o mesmo desenho em CSS, na mesma geometria.
5. **Celular:** um layout de fluxo próprio, porque a cena não cabe.
6. **Verificação:** o e2e confere as posições em frações do diálogo, e o `fidelidade-*.mjs` compara lado a lado com o conceito.
