# Arte da aba Perícias (para o ChatGPT)

São quatro pinturas **opcionais**:
- a paisagem em sépia atrás do título;
- os três estandartes dos grupos (Talentos, Técnicas e Conhecimentos).

Sem elas, a folha continua completa:
- o cabeçalho ganha rosas dos ventos em SVG;
- cada estandarte fica num degradê da cor do grupo.

Molduras, medalhões, ícones e a tabela **não** vêm de imagem: são SVG e CSS, para ficarem nítidos em qualquer largura.

Abra uma **conversa nova** no ChatGPT, cole a mensagem inicial e **anexe a imagem de referência da aba Perícias** em cada pedido. Gere todas em **paisagem (1536 × 1024)**. O `preparar_arte.py` recorta a faixa do meio, então tudo o que importa precisa estar **na faixa horizontal central**; o alto e o pé da imagem se perdem.

Salve as matrizes em `platform/frontend/arte-original/` com os nomes indicados e rode:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```

### Mensagem inicial (colar primeiro)

```text
Vou pedir algumas ilustrações para a tela de perícias de um RPG de mesa de fantasia medieval sombria chamado Cursed. Vou anexar uma imagem de referência: copie o estilo, a paleta, a composição e o clima das ilustrações dela (a paisagem em sépia no alto e as três faixas pintadas acima das tabelas), e ignore o texto, as tabelas, os ícones, as molduras douradas e os medalhões.

Estilo para todas as imagens desta conversa: pintura digital de fantasia medieval sombria, pinceladas visíveis, arquitetura gótica com torres pontiagudas, figuras em silhueta ou meia-luz, textura rica, clima de aventura.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura, borda, medalhão ou emblema. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## 1. Paisagem em sépia do cabeçalho — `pericias-cena.png`

Na tela, ela ocupa uma faixa larga e baixa (cerca de 6 × 1) à direita do título, e as bordas dissolvem no pergaminho. O fundo precisa ser **pergaminho liso e claro**, sem manchas, porque o script o apaga.

```text
Ilustração panorâmica em tinta sépia e aguada marrom sobre pergaminho liso e claro, como um desenho de mapa antigo ou gravura de livro, monocromática em tons de marrom e ocre. Da esquerda para a direita, numa única faixa horizontal no meio da imagem: uma aventureira de capa correndo com uma lâmina; um guerreiro encapuzado grande, de perfil, empunhando uma lança longa inclinada para a direita; uma cidade gótica de torres pontiagudas e muralhas ao fundo, bem detalhada; duas rosas dos ventos grandes desenhadas em linha fina no céu, com círculos concêntricos e raios, como num mapa náutico; uma tenda e bandeirolas; à direita, uma figura com uma lança e outra puxando uma carroça, e mais torres ao longe. Linhas de hachura finas, traço de pena. Tudo concentrado no terço do meio da altura; o terço de cima e o terço de baixo ficam só com pergaminho liso, sem nada desenhado. As bordas esquerda e direita também terminam em pergaminho liso. Sem cor além do sépia. Formato paisagem 1536 × 1024.
```

## 2. Estandarte de Talentos — `pericias-talentos.png`

Na tela, uma faixa de cerca de 4 × 1. O centro fica atrás do título "Talentos" e de um medalhão dourado no alto, então o centro precisa ser **mais escuro e calmo**, e as figuras ficam nas laterais.

```text
Pintura digital de fantasia medieval sombria, paleta de vermelho sangue, vinho, marrom e laranja de brasa, ao entardecer. Composição horizontal larga, tudo na faixa central da altura. À esquerda, a silhueta de um guerreiro de armadura avançando com uma lança longa apontada para a frente, capa ao vento, poeira. Ao fundo, montanhas pontiagudas e a silhueta de um castelo gótico de torres finas, à direita. O centro da imagem é um céu avermelhado mais escuro e liso, com névoa, sem figuras, para caber um título por cima. Vinheta escura nas bordas. Luz de brasa vindo de baixo. Formato paisagem 1536 × 1024, com o terço de cima e o terço de baixo só de céu e chão escuros, sem detalhes importantes.
```

## 3. Estandarte de Técnicas — `pericias-tecnicas.png`

```text
Pintura digital de fantasia medieval sombria, paleta de verde musgo, verde escuro, oliva e dourado apagado, numa floresta ao crepúsculo. Composição horizontal larga, tudo na faixa central da altura. À esquerda, um arqueiro encapuzado de perfil puxando a corda de um arco longo, mirando para a direita. À direita, um alvo de treino redondo de palha preso a um poste, com flechas cravadas, e troncos de árvores altas. Ao fundo, a silhueta de uma torre de madeira e lanternas quentes pequenas entre as árvores. O centro da imagem é mais escuro e liso, com névoa verde, sem figuras, para caber um título por cima. Vinheta escura nas bordas. Formato paisagem 1536 × 1024, com o terço de cima e o terço de baixo sem detalhes importantes.
```

## 4. Estandarte de Conhecimentos — `pericias-conhecimentos.png`

```text
Pintura digital de fantasia medieval sombria, paleta de azul noite, azul petróleo, dourado de vela e marrom de madeira, dentro de uma biblioteca antiga à noite. Composição horizontal larga, tudo na faixa central da altura. À esquerda, uma estante alta cheia de livros e uma vela acesa num castiçal, com a chama iluminando lombadas douradas. À direita, uma esfera armilar ou astrolábio de latão com anéis finos e uma vela mais alta, perto de uma janela gótica com vitral azul. O centro da imagem é mais escuro e liso, penumbra azul, sem objetos, para caber um título por cima. Vinheta escura nas bordas. Formato paisagem 1536 × 1024, com o terço de cima e o terço de baixo sem detalhes importantes.
```

## Depois de gerar

- A paisagem precisa do pergaminho **liso** em volta. Se vier com manchas fortes, peça: "a mesma imagem, com o fundo em pergaminho claro totalmente liso, sem manchas nem textura".
- Nos estandartes, se o centro vier com uma figura, peça: "a mesma imagem, com o centro vazio e escuro, as figuras só nas laterais".
