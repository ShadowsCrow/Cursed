# Arte da aba Cartas

> **Geradas em 2026-09-30 pelo Codex** (`$imagegen`, na conta ChatGPT do usuário), e não pelo usuário. Os prompts usados de fato estão em `prompts-codex/`. Técnica em `docs/tecnicas-visuais.md`, seção 8.
>
> - O grimório (`cartas-detalhe-livro`) foi gerado a partir do conceito recortado e completado até 3:2.
> - A arte e a faixa de Habilidades foram geradas a partir da referência da aba. As das outras categorias, a partir delas, trocando só o emblema, a cor e as figuras.
> - A gravura foi gerada a partir do cabeçalho da referência.
>
> Além das peças descritas abaixo, há uma **arte quadrada por categoria** (`cartas-arte-<categoria>`): o painel da página esquerda do grimório, com o medalhão e a moldura de filigrana pintados, como no conceito.

São dezesseis pinturas **opcionais**:
- a gravura em sépia atrás do lado direito do cabeçalho;
- uma **faixa por categoria de carta**: a cena noturna do alto da carta, com o **medalhão dourado e o emblema já pintados no centro**, como em cada carta da referência;
- o **grimório do detalhe da carta**: o livro aberto de páginas em branco e a cena de velas em volta, a partir do conceito aprovado.

Sem elas, a folha continua completa:
- o cabeçalho ganha uma rosa dos ventos e estrelas em SVG;
- cada faixa fica num degradê da cor do tipo, com um medalhão desenhado em SVG e o ícone da categoria.

Quando o Narrador envia uma imagem própria para a carta, ela ocupa a faixa inteira no lugar da pintura da categoria.

A moldura da carta, as volutas, a pílula da origem e o texto **não** vêm de imagem: são SVG e CSS.

## Como gerar

1. Abra uma **conversa nova** no ChatGPT e cole a mensagem inicial.
2. **Anexe a imagem de referência** (`referencia/cartas.webp`) em cada pedido.
3. Gere todas em **paisagem (1536 × 1024)**.
4. O `preparar_arte.py` recorta a **faixa do meio** de cada faixa de carta: 1536 × 456 px, na proporção 266 × 79 da carta. Tudo o que importa precisa estar nessa faixa central; o alto e o pé da imagem se perdem.
5. Salve as matrizes em `platform/frontend/arte-original/` com os nomes indicados e rode:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```

**O medalhão precisa ficar igual em todas as faixas**: no centro exato da imagem, com o mesmo tamanho (diâmetro de cerca de 38% da altura da imagem) e o mesmo aro. Por isso as faixas usam o mesmo texto base, e só o emblema e as figuras mudam. Se uma faixa sair com o medalhão deslocado ou de outro tamanho, peça de novo antes de salvar.

### Mensagem inicial (colar primeiro)

```text
Vou pedir algumas ilustrações para a tela de cartas de um RPG de mesa de fantasia medieval sombria chamado Cursed. Vou anexar uma imagem de referência: copie o estilo, a paleta, a composição e o clima das ilustrações dela (a gravura em sépia no alto à direita e as faixas noturnas azuis no alto de cada carta, com um medalhão dourado no centro), e ignore o texto, os campos, as molduras das cartas e a interface.

Estilo para todas as imagens desta conversa: pintura digital de fantasia medieval sombria, noite azul profunda, pinceladas visíveis, figuras em silhueta com contorno de luz quente, faíscas e brasas no ar, textura rica.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## 1. Gravura do cabeçalho — `cartas-gravura.png`

Na tela, ela ocupa uma faixa larga e baixa (cerca de 6 × 1) atrás da busca, à direita do título, e as bordas dissolvem no pergaminho. O fundo precisa ser **pergaminho liso e claro**, porque ela é multiplicada sobre o papel da folha.

```text
Ilustração panorâmica em tinta sépia e aguada marrom sobre pergaminho liso e claro, como uma gravura de livro antigo, monocromática em tons de marrom e ocre. Numa única faixa horizontal no meio da imagem, da esquerda para a direita: uma estrela de quatro pontas desenhada em linha fina; uma pilha de livros grossos com lombadas ornamentadas, um baú de viagem com cantoneiras de metal e um grimório de capa decorada em pé; um rolo de pergaminho aberto; uma lanterna de ferro acesa com vidro; uma rosa dos ventos grande em linha fina, com círculos concêntricos e raios, como num mapa náutico; ramos e volutas finas; ao fundo, as torres pontiagudas de uma cidade gótica; à direita, outra estrela de quatro pontas grande. Linhas de hachura finas, traço de pena. Tudo concentrado no terço do meio da altura; o terço de cima e o de baixo ficam só com pergaminho liso. As bordas esquerda e direita também terminam em pergaminho liso. Sem cor além do sépia. Formato paisagem 1536 × 1024.
```

## 2. Texto base das faixas

Use este texto em cada faixa, trocando **[EMBLEMA]** e **[CENA]** pelos da tabela abaixo:

```text
Faixa horizontal larga de uma carta de RPG, pintura digital de fantasia medieval sombria em azul noite profundo, com névoa e brasas alaranjadas no ar. No centro exato da imagem, um medalhão circular: aro de ouro polido com quatro pequenas pontas em losango (em cima, embaixo, à esquerda e à direita), miolo azul muito escuro com raios finos de luz saindo do centro, e dentro dele [EMBLEMA] em ouro brilhante, com um brilho alaranjado atrás. O medalhão tem diâmetro de cerca de 38% da altura da imagem e fica perfeitamente centralizado na horizontal e na vertical. Nas laterais, [CENA], em silhueta escura com contorno de luz quente, sem nada cobrindo o medalhão. Raios de luz saindo do medalhão para os lados. Vinheta escura nas bordas. Tudo o que importa fica na faixa horizontal do meio; o terço de cima e o terço de baixo ficam só com céu e chão escuros, sem detalhes. Formato paisagem 1536 × 1024.
```

| Arquivo | [EMBLEMA] | [CENA] |
|---|---|---|
| `cartas-faixa-habilidades.png` | duas espadas cruzadas | à esquerda, guerreiros encapuzados com lanças entre rochas; à direita, um guerreiro de perfil empunhando uma espada |
| `cartas-faixa-magias.png` | uma chama arcana azul e branca em espiral | à esquerda, um mago de capuz erguendo um cajado; à direita, uma torre de feiticeiro e runas flutuando como faíscas |
| `cartas-faixa-efeitos.png` | uma estrela radiante de oito pontas | à esquerda, uma figura ajoelhada envolta em luz; à direita, um sacerdote com as mãos erguidas e partículas de luz |
| `cartas-faixa-armas.png` | um machado de guerra de lâmina dupla sobre uma espada longa, cruzados | à esquerda, um ferreiro diante de uma bigorna com faíscas; à direita, uma armaria com lanças e espadas em pé |
| `cartas-faixa-armaduras.png` | um peitoral de armadura com ombreiras | à esquerda, um cavaleiro de armadura completa de pé; à direita, um suporte com elmo e cota de malha |
| `cartas-faixa-escudos.png` | um escudo heráldico com uma faixa em diagonal | à esquerda, uma fileira de soldados com escudos erguidos; à direita, a muralha de um castelo com estandartes |
| `cartas-faixa-acessorios.png` | uma mochila de couro com fivelas e uma aljava com flechas | à esquerda, um viajante com cajado numa estrada; à direita, uma carroça coberta e uma lanterna pendurada |
| `cartas-faixa-consumiveis.png` | um frasco de poção redondo com líquido âmbar brilhante | à esquerda, um boticário diante de prateleiras de frascos; à direita, um caldeirão fumegante sobre brasas |
| `cartas-faixa-materiais.png` | um lingote de metal e dois cristais lapidados | à esquerda, um mineiro com picareta na entrada de uma mina; à direita, veios de cristal brilhando na rocha |
| `cartas-faixa-chaves.png` | uma chave antiga ornamentada, na vertical | à esquerda, uma porta de masmorra com grades; à direita, um guarda com um molho de chaves e uma tocha |
| `cartas-faixa-itens-de-missao.png` | um pergaminho enrolado com lacre de cera | à esquerda, um mensageiro a cavalo; à direita, uma mesa com mapa aberto e uma vela |
| `cartas-faixa-diversos.png` | uma bolsa de couro amarrada com cordão | à esquerda, um mercador com uma banca de feira; à direita, caixotes, sacos e um barril |
| `cartas-faixa-moedas.png` | uma pilha de moedas de ouro com uma moeda em pé na frente | à esquerda, um cambista contando moedas numa mesa; à direita, um baú aberto com brilho de ouro |
| `cartas-faixa-criaturas.png` | a cabeça de um lobo de perfil | à esquerda, um caçador com arco entre árvores; à direita, olhos brilhando na floresta escura |

## 3. O grimório do detalhe — `cartas-detalhe-livro.png`

É a peça que faz a carta aberta ficar **igual ao conceito aprovado** (`referencia/detalhe-grimorio.png`). A pintura é o **conceito inteiro, com as páginas em branco**: o livro aberto de capa de couro azul-escuro com cantoneiras douradas, o maço de páginas curvadas, os fechos de latão, as argolas da lombada, e em volta as velas, a pena no tinteiro, os livros empilhados e o veludo azul.

**Nas páginas não pode haver nada:**
- nenhum quadro, moldura, filete, estrela ou canto ornamentado;
- nenhum texto, ícone, medalhão ou arte.

A plataforma desenha tudo isso por cima, nas posições do conceito. Também **sem a moldura dourada de fora** e sem o botão de fechar, que já são da plataforma.

**Anexe o conceito** (`referencia/detalhe-grimorio.png`) neste pedido e peça a mesma composição, o mesmo enquadramento e a mesma posição do livro:
- a lombada no centro;
- a página esquerda da faixa de 15% a 50% da largura, e a direita de 50% a 89%;
- o topo das páginas a cerca de 5% da altura, e o pé a cerca de 92%.

Se o livro sair noutra posição ou em outro tamanho, peça de novo antes de salvar. O conteúdo é calibrado para essa geometria.

```text
Use a imagem anexada como referência exata de composição, enquadramento, iluminação e estilo. Gere a mesma cena, na mesma posição e no mesmo tamanho: o grimório aberto no centro, com capa de couro azul-escuro, cantoneiras e fechos de latão, argolas douradas na lombada e o maço de páginas curvadas nas bordas; à esquerda, velas acesas, uma pena branca num tinteiro de latão; à direita, velas acesas e livros antigos empilhados; o livro apoiado num veludo azul-noite. A única diferença: as duas páginas do livro ficam completamente em branco, só o pergaminho envelhecido e liso, sem nenhum quadro, moldura, filete, ornamento, estrela, texto, ícone, medalhão ou ilustração. Não desenhe a moldura dourada que contorna a imagem de referência nem o botão circular de fechar: a cena vai até as bordas da imagem. Formato paisagem 1536 × 870 (proporção 1395 × 790).
```

## Depois de gerar

- Rode o `preparar_arte.py`: as faixas vão para `public/arte/cartas/`.
- Confira a sobreposição com `E2E_APP_URL=http://localhost:5188 node platform/frontend/e2e/fidelidade-cartas.mjs`: o medalhão pintado precisa cair no mesmo lugar do medalhão da referência.
- Se uma categoria nova entrar no `itens.json`, ela ganha a faixa de reserva até alguém pintar a dela, com o nome `cartas-faixa-<categoria>.png` (hífens no lugar de sublinhados).
