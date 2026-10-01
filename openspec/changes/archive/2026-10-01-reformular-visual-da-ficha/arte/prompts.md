# Arte do Inventário da ficha (para o ChatGPT)

São cinco pinturas **opcionais** que deixam a bolsa do Inventário mais próxima da imagem de referência: o couro, as duas laterais, a tampa e a base. A grade fica no meio, como o recheio de um lanche: laterais dos lados, a tampa aberta saindo por cima e a base de couro embaixo. Quando uma pintura não existe, ela simplesmente não aparece:
- a bolsa continua com o couro em gradiente;
- sem as laterais, a alça, a fivela e o pingente aparecem desenhados em SVG e CSS;
- as moedas continuam em SVG.

A moldura e a costura do alto e de baixo da bolsa **não** vêm de imagem: continuam em SVG e CSS para ficarem nítidas em qualquer tamanho de grade (decisão da estética: molduras nunca em imagem). As laterais são ilustração: couro pintado com os objetos presos a ele.

Abra uma **conversa nova** no ChatGPT, cole a mensagem inicial abaixo e **anexe a imagem de referência do Inventário** em cada pedido.

### Mensagem inicial (colar primeiro)

```text
Vou pedir algumas ilustrações para a tela de inventário de um RPG de mesa de fantasia medieval chamado Cursed. Vou anexar uma imagem de referência: use-a só como referência de estilo (paleta, pincelada e luz) e ignore o texto, os quadros, as molduras e o layout.

Estilo para todas as imagens desta conversa: pintura digital de fantasia medieval, pinceladas visíveis, luz quente de vela, couro envelhecido, latão e ouro gastos, tons de marrom, vinho, ocre e dourado, texturas ricas, clima de aventura com um toque sombrio.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## Como as laterais esticam

A bolsa muda de altura conforme o personagem (de 3 a 7 linhas, mais a mochila). Por isso cada lateral é pintada em **três faixas**:

| Faixa | Altura na imagem | O que tem | Na tela |
|---|---|---|---|
| Topo | cerca de 1/3 de cima | a ponta de cima da tira de couro e os objetos do alto | aparece uma vez, inteira |
| Miolo | cerca de 1/3 do meio | **só** a tira de couro reta com a costura, sem nenhum objeto | se repete quantas vezes a bolsa precisar |
| Base | cerca de 1/3 de baixo | a ponta de baixo da tira e os objetos pendurados | aparece uma vez, inteira |

O `preparar_arte.py` deixa o miolo sem emenda. A faixa do miolo de cada pintura fica em `LADOS_DO_INVENTARIO`, em frações da altura; com `None`, o script a acha sozinho, pelas linhas em que só aparece a tira. Por isso o miolo precisa ser **só couro reto**, com a tira sempre na mesma posição e largura.

**Lição das pinturas de 2026-09-29:** o tecido vermelho corria atrás da tira de cima a baixo, também no terço do meio. Repetida, a borda franjada do tecido vira um serrilhado regular ao lado da tira. No miolo, **nada pode aparecer ao lado da tira**, nem tecido atrás dela. Quanto mais alto o miolo limpo, menos a repetição aparece.

A tira fica **encostada na borda de dentro** (a que encosta na grade) e os objetos avançam **só para fora**:
- na lateral esquerda, a tira fica à direita da imagem e os objetos saem para a esquerda;
- na lateral direita, a tira fica à esquerda da imagem e os objetos saem para a direita.

## Truque do fundo de pergaminho

As laterais são pedidas **sobre fundo de pergaminho liso**, porque o ChatGPT não garante transparência. O `preparar_arte.py` troca esse fundo por transparência. Ele mede a cor no **canto superior direito** (na lateral direita, no **canto superior esquerdo**) e apaga só a área dessa cor ligada às bordas. Por isso:
- o fundo deve ser **liso e uniforme**, sem mesa, sem sombra projetada forte e sem vinheta escura nas bordas;
- o canto medido deve ser só fundo;
- a tira **não encosta** no alto nem no pé da imagem: sobra um pouco de fundo acima e abaixo;
- tudo o que for pintado precisa **tocar a tira**. Moeda solta ou pedaço de pano separado é apagado.

O couro é o contrário: uma **textura que ocupa a imagem inteira**, sem objeto nem fundo.

## Arquivos

| Arquivo | Lugar | Formato a pedir | Como uso |
|---|---|---|---|
| `inventario-couro.png` | Fundo da bolsa, repetido | Quadrado (1024×1024) | → `inventario/inventario-couro.webp` (512×512), com as bordas misturadas para repetir sem emenda |
| `inventario-lado-esquerdo.png` | Lateral esquerda da bolsa | Retrato (1024×1536) | Sem fundo, recortada → `inventario/inventario-lado-esquerdo-{topo,miolo,base}.webp` |
| `inventario-lado-direito.png` | Lateral direita da bolsa | Retrato (1024×1536) | Sem fundo, recortada → `inventario/inventario-lado-direito-{topo,miolo,base}.webp` |
| `inventario-tampa.png` | Tampa aberta, saindo por cima da bolsa, centralizada | Paisagem (1536×1024) | Sem fundo, recortada → `inventario/inventario-tampa.webp` (640 de largura) |
| `inventario-base.png` | Base de couro no pé da bolsa, esticando na largura | Paisagem (1536×1024) | Sem fundo, recortada → `inventario/inventario-base-{esquerda,miolo,direita}.webp` (160 de altura) |

O mapa, o tecido e o saco de moedas avulsos (`inventario-mapa.png`, `inventario-tecido.png` e `inventario-saco-moedas.png`) não são mais usados: agora fazem parte das laterais.

Salve em `platform/frontend/arte-original/` com esses nomes e rode, na raiz do repositório:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```

## Prompts

### 1. Couro da bolsa (`inventario-couro.png`)

```text
Textura de couro marrom-avermelhado envelhecido, vista de frente e bem de perto, preenchendo a imagem inteira: poros e rugas finas, marcas de uso, leves manchas mais escuras e brilho discreto de gordura, luz quente e uniforme vinda de cima. Sem costuras, sem bordas, sem objetos, sem sombra de vinheta nas bordas: a textura deve poder se repetir lado a lado. Formato quadrado.
```

### 2. Lateral esquerda (`inventario-lado-esquerdo.png`)

```text
Ilustração vertical da lateral esquerda de uma bolsa de aventureiro, vista de frente. Uma tira vertical de couro marrom-avermelhado grosso, reta, com cerca de um quarto da largura da imagem, encostada na borda DIREITA da imagem e indo de perto do alto até perto do pé, sem tocar as bordas de cima e de baixo. A tira tem costura tracejada clara nas duas beiradas, rebites de latão e pontas arredondadas e reforçadas em cima e embaixo.
No terço de cima: uma correia com fivela de latão prende à tira um mapa de pergaminho enrolado, amarrado com cordão, inclinado e saindo para a ESQUERDA.
No terço do meio: só a tira de couro reta com a costura, sem nenhum objeto, fivela, rebite grande ou mancha marcante, igual de cima a baixo, com fundo liso dos dois lados: nenhum tecido atrás ou ao lado da tira nesse trecho.
No terço de baixo: um pano grosso de lã vinho-escuro, com a barra desfiada e bordado dourado gasto, preso à tira e caindo em pregas para a ESQUERDA e para baixo.
Tudo o que foi pintado toca a tira; nada avança para a direita da tira. Fundo liso e uniforme de pergaminho claro, sem mesa, sem sombra projetada e sem vinheta; o canto superior direito acima da tira é só fundo. Formato retrato.
```

### 3. Lateral direita (`inventario-lado-direito.png`)

```text
Ilustração vertical da lateral direita de uma bolsa de aventureiro, vista de frente, no mesmo estilo e com o mesmo couro da lateral esquerda. Uma tira vertical de couro marrom-avermelhado grosso, reta, com cerca de um quarto da largura da imagem, encostada na borda ESQUERDA da imagem e indo de perto do alto até perto do pé, sem tocar as bordas de cima e de baixo. A tira tem costura tracejada clara nas duas beiradas, rebites de latão e pontas arredondadas e reforçadas em cima e embaixo.
No terço de cima: uma alça de couro com uma fivela grande de latão trabalhado, presa à tira e dobrando para a DIREITA.
No terço do meio: só a tira de couro reta com a costura, sem nenhum objeto, fivela, rebite grande ou mancha marcante, igual de cima a baixo, com fundo liso dos dois lados: nenhum tecido atrás ou ao lado da tira nesse trecho.
No terço de baixo: uma pequena bolsa de couro amarrada com cordão, pendurada na tira por uma argola, aberta e com moedas de ouro, prata e cobre aparecendo na boca, virada para a DIREITA.
Tudo o que foi pintado toca a tira; nada avança para a esquerda da tira. Fundo liso e uniforme de pergaminho claro, sem mesa, sem sombra projetada e sem vinheta; o canto superior esquerdo acima da tira é só fundo. Formato retrato.
```

Se o ChatGPT puser objetos ou tecido no miolo, peça de novo: "Refaça igual, mas no terço do meio deixe só a tira de couro reta, com fundo liso dos dois lados: o tecido começa só no terço de baixo."

## Tampa e base

A **tampa** aparece inteira, sem esticar: fica centralizada no alto da bolsa, atrás dela, e só a parte de cima aparece (cerca de 4rem de altura no computador). A borda de baixo dela some atrás da bolsa, então deve ser **reta e horizontal**.

A **base** é o fundo de um saco de couro aberto, com o pano vinho das laterais caindo para baixo. Ela estica na largura da bolsa, que vai de 2 a 13 colunas, e funciona como as laterais, deitada: ponta esquerda, **miolo que se repete** e ponta direita.
- O pano cai **perto das pontas**, nunca no meio.
- O terço do meio deve ser **só o couro do fundo do saco**, com a costura, sem pano, rebite grande, fivela nem dobra marcante. Senão, a repetição forma um padrão, como o serrilhado das laterais.
- A borda de cima do couro fica **reta e horizontal**: ela some, esmaecida, dentro da bolsa.
- As laterais cobrem um pouco das pontas, então o pano fica melhor **um pouco para dentro** das extremidades.

A primeira versão, uma faixa reta com cantoneiras de latão, ficou parecendo uma régua solta e foi trocada por esta.

### 4. Tampa aberta (`inventario-tampa.png`)

```text
Ilustração da aba de couro de uma bolsa de aventureiro, aberta e dobrada para trás, vista de frente, no mesmo estilo e com o mesmo couro marrom-avermelhado das laterais. A aba tem a forma de um arco largo e baixo, com a borda de baixo reta e horizontal, costura tracejada clara acompanhando o contorno, rebites de latão nos cantos e, no centro da borda de cima, uma lingueta com um fecho de latão trabalhado. A aba ocupa cerca de dois terços da largura da imagem e cerca de metade da altura, centralizada. Fundo liso e uniforme de pergaminho claro, sem mesa, sem sombra projetada e sem vinheta; o canto superior direito é só fundo. Nada de texto. Formato paisagem.
```

### 5. Base da bolsa: fundo do saco (`inventario-base.png`)

```text
Ilustração da parte de baixo de um saco de couro de aventureiro, aberto, vista de frente, no mesmo estilo e com o mesmo couro marrom-avermelhado das laterais e da tampa. O couro forma uma faixa horizontal larga, de perto da borda esquerda até perto da borda direita da imagem, sem tocar as bordas. A borda de cima do couro é reta e horizontal, como se o saco continuasse para cima e tivesse sido cortado ali. A borda de baixo tem os cantos bem arredondados, com dobras suaves do couro e uma costura tracejada clara acompanhando o fundo.
Perto das duas pontas, um pouco para dentro: o mesmo pano grosso de lã vinho-escuro das laterais, com a barra desfiada e bordado dourado gasto, sai de dentro do saco e cai para baixo em pregas, passando da borda de baixo do couro.
No terço do meio: só o couro do fundo do saco, reto, com a costura, sem pano, sem rebite grande, fivela ou dobra marcante, igual de uma ponta à outra, com fundo liso abaixo.
Fundo liso e uniforme de pergaminho claro, sem mesa, sem sombra projetada e sem vinheta; o canto superior direito é só fundo. Nada de texto. Formato paisagem.
```

Se o pano aparecer no meio, peça de novo: "Refaça igual, mas com o pano só perto das duas pontas; no terço do meio, só o couro do fundo do saco."
