# Arte da navegação inicial (para o ChatGPT)

Imagens que as telas de Início, entrada, Campanhas, Personagens e Biblioteca precisam, com os prompts prontos. Seguem o mesmo processo e a mesma família visual da primeira fatia (`criacao-guiada-e-nova-estetica/arte/prompts.md`).

## Como usar

1. Use **a mesma conversa** da arte anterior, se ainda existir. Se não, abra uma nova e cole a **mensagem inicial** abaixo.
2. Em **todos** os pedidos, anexe `platform/frontend/arte-original/ancora-castelo.png` e comece com: "Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz)." (exceto no item 7, a moldura).
3. Se vier com texto, moldura ou borda, peça: "Refaça sem nenhum texto, letra, moldura ou borda."
4. Baixe em PNG com o nome indicado e coloque em `platform/frontend/arte-original/`. Eu recorto, converto para WebP e comprimo.

Nenhuma imagem deve conter **texto, letras, runas legíveis, logotipo ou marca d'água**: títulos, botões e o nome "CURSED" são texto real da interface.

## Mensagem inicial (só se abrir conversa nova)

```text
Vou pedir várias ilustrações para a interface de um jogo de RPG de mesa chamado Cursed, de fantasia medieval sombria. Guarde este estilo para todas as imagens desta conversa:

pintura digital de fantasia sombria, pinceladas visíveis, atmosfera noturna e melancólica, sombras em azul-meia-noite e verde-azulado dessaturado, acentos quentes de luz de vela em âmbar e dourado envelhecido, névoa suave e luz volumétrica, texturas ricas, composição cinematográfica.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem cores vivas e saturadas. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## Tabela de arquivos

| # | Arquivo | Onde aparece | Formato a pedir | Como uso |
|---|---|---|---|---|
| 1 | `abertura-inicio.png` | abertura do Início (título e botões por cima, à esquerda) | paisagem 3:2 | recorto em ≈ 16:9 e 2:1; degradê escuro na esquerda |
| 2 | `abertura-entrada.png` | fundo das telas de entrar, cadastro e senha | paisagem 3:2 | cartão do formulário no centro; recorte vertical no celular |
| 3 | `capa-campanha-padrao.png` | capa de campanha sem imagem enviada (lista e faixa) | paisagem 3:2 | faixa 3:1 no topo da campanha e miniatura 3:4 na lista |
| 4 | `faixa-visao-geral.png` | cabeçalho da Visão geral na Biblioteca | paisagem 3:2 | faixa 3:1, título à esquerda |
| 5 | `faixa-regras.png` | cabeçalho de Regras na Biblioteca | paisagem 3:2 | faixa 3:1, título à esquerda |
| 6a | `retrato-vazio-npc.png` | NPC sem retrato | retrato 2:3 | recorto em 3:4 e em círculo |
| 6b | `retrato-vazio-monstro.png` | monstro sem retrato | retrato 2:3 | recorto em 3:4 e em círculo |
| 7 | `moldura-ornamental.png` | ~~cantos da moldura~~ **não usada**: reprovada na revisão visual; molduras seguem o SVG do Resumo (design D10) | quadrado | — |

O retrato padrão de personagem de jogador continua o `retrato-vazio.png` que você já gerou. Os ícones dos atalhos e do menu (livro, pessoas, busto, rosa dos ventos), o nome "CURSED", divisores e selos eu faço em SVG e fonte.

**Ordem sugerida:** 7 (moldura) e 1 (Início) primeiro, porque definem a cara do site; depois 3, 2, 4, 5 e 6.

## 1. `abertura-inicio.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Paisagem 3:2. Um aventureiro solitário de capa longa e escura, visto de costas, em pé sobre uma rocha no alto de uma encosta, olhando para um vale amplo ao entardecer azul. No vale, um rio sinuoso entre pinheiros e névoa leva a um grande castelo gótico de torres altas sobre uma colina, com algumas janelas acesas em âmbar, e montanhas nevadas ao fundo sob nuvens iluminadas. O aventureiro fica no centro-direita da imagem, o castelo à direita. O terço esquerdo da imagem é bem mais escuro e calmo — sombra de árvores e névoa —, para receber um título e dois botões por cima. Luz fria de crepúsculo com toques quentes. A cena preenche toda a imagem até as bordas. Sem texto, sem moldura, sem borda.
```

Critério: o terço esquerdo precisa ser escuro e sem detalhes fortes; se o aventureiro ou o castelo invadirem a esquerda, peça "mova tudo para a direita e deixe o terço esquerdo escuro e vazio".

## 2. `abertura-entrada.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Paisagem 3:2. O grande portão de pedra de uma fortaleza gótica à noite, entreaberto, com luz âmbar quente vazando pela fresta e iluminando a névoa baixa sobre uma escadaria. Tochas nas laterais, estandartes escuros sem nenhum símbolo, céu noturno azul com lua encoberta. Composição simétrica, o portão no centro. A área central à frente do portão é calma e pouco detalhada, para receber um formulário por cima. A cena preenche toda a imagem até as bordas. Sem texto, sem símbolos nos estandartes, sem moldura, sem borda.
```

## 3. `capa-campanha-padrao.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Paisagem 3:2. Vista noturna de uma cidade gótica medieval de telhados pontudos e torres de catedral, sob lua cheia entre nuvens, com uma ponte de pedra em arcos sobre um rio e janelas acesas em âmbar. Névoa baixa nas ruas. Composição horizontal equilibrada: a lua e as torres mais altas na metade direita, a metade esquerda com céu escuro e telhados baixos. A faixa horizontal central concentra a cidade (o topo do céu e o rio podem ser cortados). A cena preenche toda a imagem até as bordas. Sem pessoas em destaque, sem texto, sem moldura, sem borda.
```

Critério: a cidade precisa ser reconhecível também recortada num retângulo estreito vertical no centro (miniatura da lista).

## 4. `faixa-visao-geral.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Paisagem 3:2. Uma mesa de guerra de madeira escura vista de um ângulo baixo, com um grande mapa de terras desconhecidas aberto, um compasso de latão, peças de miniatura, um dado antigo de ossos e uma vela quase no fim. Ao fundo, uma janela em arco mostra, desfocado, um castelo sob a lua. Os objetos ficam na metade direita; a metade esquerda é sombra quente e calma, para receber um título. O mapa não tem nenhuma palavra ou letra, só desenhos de montanhas, rios e florestas. A cena preenche toda a imagem até as bordas. Sem texto, sem moldura, sem borda.
```

## 5. `faixa-regras.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Paisagem 3:2. O interior de uma biblioteca antiga à noite: um grande tomo aberto sobre um atril de madeira entalhada, iluminado por uma vela e por um feixe frio de luar vindo de uma janela alta, estantes altas cheias de livros de couro desaparecendo na penumbra. As páginas do tomo estão vazias ou com manchas ilegíveis, sem nenhuma letra. O tomo e o atril ficam na metade direita; a metade esquerda é estante na sombra, calma, para receber um título. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem moldura, sem borda.
```

## 6a. `retrato-vazio-npc.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Retrato 2:3. Busto de uma figura de frente, com capuz e manto de viagem gastos, segurando uma pequena lanterna à altura do peito; a luz âmbar da lanterna ilumina o tecido e as mãos, mas o rosto permanece totalmente na sombra do capuz. Fundo de beco noturno enevoado e desfocado. Figura centralizada, cabeça no terço superior. Sem rosto visível, sem texto, sem moldura, sem borda.
```

## 6b. `retrato-vazio-monstro.png`

```text
Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz).
Retrato 2:3. Uma criatura indistinta emergindo da névoa numa floresta escura: só a silhueta de ombros largos e chifres irregulares, e dois olhos brilhando em âmbar pálido. Nenhum detalhe anatômico claro, o que importa é a presença ameaçadora. Fundo de troncos escuros e névoa azulada. Figura centralizada, cabeça no terço superior. Sem sangue, sem texto, sem moldura, sem borda.
```

## 7. `moldura-ornamental.png` (sem anexar a âncora)

Esta é a moldura dourada que aparece em todo o site da referência. Peço uma moldura inteira quadrada; eu corto os quatro cantos e repito os lados.

```text
Quadrado. Uma moldura retangular ornamental em ouro envelhecido, vista perfeitamente de frente, sobre fundo preto puro e liso. Os quatro cantos têm filigrana gótica delicada com pequenos arabescos e uma ponta em forma de flor-de-lis voltada para dentro, todos os quatro cantos idênticos e espelhados. Entre os cantos, os quatro lados são um friso fino e reto de duas linhas douradas paralelas, totalmente uniforme e sem nenhum enfeite no meio, para poder ser esticado. A espessura da moldura é pequena, cerca de um vigésimo da largura da imagem, e os cantos ocupam no máximo um oitavo de cada lado. O centro é preto puro e vazio. Perfeitamente simétrica. Sem texto, sem sombra projetada, sem fundo texturizado, sem nada além da moldura.
```

Critérios: (1) os lados entre os cantos precisam ser lisos e iguais — se tiver enfeite no meio de um lado, peça "sem nenhum enfeite no meio dos lados, só o friso reto"; (2) os quatro cantos iguais; (3) fundo e centro pretos puros. Se preferir uma moldura mais rica, peça uma variação "com os cantos mais elaborados", mantendo os lados lisos.

Opcional: se quiser o detalhe dos cartões da Biblioteca da referência (moldura em pergaminho), gere uma segunda versão `moldura-ornamental-escura.png` com o mesmo texto trocando "ouro envelhecido" por "bronze escuro quase marrom".

## Conferência ao receber as imagens

- [ ] Nenhuma tem texto, letras, moldura (exceto a 7), borda ou marca d'água.
- [ ] Nas imagens 1, 4 e 5, o lado do título (esquerda) está escuro e calmo.
- [ ] Na 2, o centro à frente do portão está calmo.
- [ ] A 3 funciona recortada em faixa larga e em miniatura vertical.
- [ ] As 6a e 6b não mostram rosto e combinam com o `retrato-vazio.png`.
- [ ] A 7 tem cantos idênticos, lados lisos e fundo preto puro.
- [ ] Todas combinam com a âncora (azul-noite com âmbar), sem pender para o âmbar demais.
