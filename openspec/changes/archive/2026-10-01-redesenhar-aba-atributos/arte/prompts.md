# Arte da aba Atributos (para o ChatGPT)

São quatro pinturas **opcionais**: a gravura com as três figuras no alto da folha e três cenas para as faixas dos cartões Físicos, Sociais e Mentais. A que não existir simplesmente não aparece:
- sem a gravura, fica um emblema em SVG com o ícone de cada grupo;
- sem a cena, a faixa fica num degradê na cor do grupo.

A moldura da folha, a moldura dos cartões, os medalhões, as faixas de legenda e os ícones **não** vêm de imagem: são SVG e CSS, para ficarem nítidos em qualquer tamanho.

Abra uma **conversa nova** no ChatGPT, cole a mensagem inicial abaixo e **anexe a imagem de referência da aba Atributos** (Lion, Especialista de Combate · Elfo) em cada pedido.

### Mensagem inicial (colar primeiro)

```text
Vou pedir algumas ilustrações para a aba de atributos da ficha de um RPG de mesa de fantasia medieval chamado Cursed. Vou anexar uma imagem de referência: use-a só como referência de estilo das ilustrações (as três figuras desenhadas no alto e as três cenas coloridas das faixas dos cartões) e ignore o texto, as tabelas, os botões, as molduras e o layout.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura, borda, faixa ou fita com legenda. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## Gravura: desenho a bico de pena sobre papel liso

Na referência, as três figuras são **um desenho só**, contínuo (as montanhas passam de uma figura para a outra). As fitas com as legendas e os nós de filigrana entre elas são SVG, desenhados por cima da parte de baixo. Na tela, o papel da imagem se funde com o pergaminho da folha (mistura "multiplicar") e as bordas se esmaecem. Por isso:
- o papel deve ser **liso, claro e uniforme**, cor de pergaminho clara, sem manchas escuras, sem vinheta escura nas bordas e sem sombra;
- as três figuras ficam centradas em **1/6, 1/2 e 5/6 da largura**, do peito para cima, e o **quinto de baixo** da imagem fica mais vazio (é onde entram as fitas);
- só tinta sépia e marrom-escura, com hachuras, como uma gravura antiga; sem cor.

## Faixas: cena pintada na cor do grupo

As cenas ocupam a faixa larga no alto de cada cartão, atrás do nome do grupo. A tela recorta uma faixa **3:1 do centro** e escurece a parte de baixo para o título branco. Por isso:
- a composição é **horizontal e larga**, com o interesse nas laterais e o **centro mais calmo e escuro** (o medalhão e o título ficam ali);
- a imagem ocupa o quadro inteiro, sem fundo liso.

## Arquivos

| Arquivo | Lugar | Formato a pedir | Como uso |
|---|---|---|---|
| `atributos-gravura.png` | Gravura das três figuras, no alto da folha | Paisagem (1536×1024) | Recorte 11:4 → `atributos/atributos-gravura.webp` (1440×524) |
| `atributos-faixa-fisicos.png` | Faixa do cartão Físicos | Paisagem (1536×1024) | Recorte 3:1 do centro → `atributos/atributos-faixa-fisicos.webp` (1200×400) |
| `atributos-faixa-sociais.png` | Faixa do cartão Sociais | Paisagem (1536×1024) | → `atributos/atributos-faixa-sociais.webp` (1200×400) |
| `atributos-faixa-mentais.png` | Faixa do cartão Mentais | Paisagem (1536×1024) | → `atributos/atributos-faixa-mentais.webp` (1200×400) |

Salve em `platform/frontend/arte-original/` com esses nomes e rode, na raiz do repositório:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```

## Prompts

### 1. Gravura das três figuras (`atributos-gravura.png`)

```text
Desenho a bico de pena em tinta sépia sobre papel pergaminho claro e liso, no estilo de uma gravura antiga com hachuras finas, numa composição horizontal larga com três figuras lado a lado, do peito para cima, ligadas por um mesmo fundo contínuo:
- à esquerda (centro em 1/6 da largura): um guerreiro de cabelo curto e crespo, peito nu e musculoso, de três quartos, olhando para a direita com expressão firme; atrás dele, picos de montanha e rochas pontudas;
- no meio (centro na metade da largura): uma figura serena de manto longo com capuz baixado, vista de costas ou de frente, de cabeça levemente inclinada, com um halo de raios finos como um sol nascente atrás da cabeça;
- à direita (centro em 5/6 da largura): um erudito encapuzado lendo um livro grande e aberto, de três quartos, com uma esfera armilar e círculos de um mapa celeste em traço leve atrás dele.
Entre as figuras, algumas estrelas de quatro pontas, penas e folhas finas. O quinto de baixo da imagem fica quase vazio, só com o fim das figuras se dissolvendo no papel.

Só tinta sépia e marrom-escura, sem cor. Papel uniforme, sem manchas, sem vinheta escura nas bordas e sem sombra; nada encosta nas bordas da imagem. Sem texto, letras, runas legíveis, faixa, fita, moldura ou borda. Formato paisagem.
```

Se vier com fitas ou legendas, peça: "Refaça sem nenhuma fita, faixa ou texto; a parte de baixo deve ficar vazia."

### 2. Faixa Físicos (`atributos-faixa-fisicos.png`)

```text
Pintura digital de fantasia medieval, pinceladas visíveis, em tons de vinho, ferrugem e marrom-avermelhado escuros, com luz baixa de crepúsculo. Paisagem larga e sombria: à esquerda, a silhueta de um arqueiro sobre uma rocha, com o arco tensionado; à direita, um castelo gótico de torres pontudas sobre um penhasco; entre os dois, montanhas recortadas contra um céu avermelhado e nuvens de fumaça. O centro da imagem é mais calmo e escuro, sem figuras.

Composição horizontal e larga, preenchendo o quadro inteiro. Sem texto, letras, logotipo, moldura ou borda. Formato paisagem.
```

### 3. Faixa Sociais (`atributos-faixa-sociais.png`)

```text
Pintura digital de fantasia medieval, pinceladas visíveis, em tons de verde-escuro, verde-musgo e verde-azulado sombrios, com luz fria e nebulosa. Praça de uma cidade medieval à noite: à esquerda, um grupo de figuras encapuzadas conversando; à direita, pessoas em mantos reunidas diante de fachadas de pedra e estandartes; entre os dois, a névoa e o chão de pedra da praça. O centro da imagem é mais calmo e escuro, sem figuras.

Composição horizontal e larga, preenchendo o quadro inteiro. Sem texto, letras, símbolos legíveis nos estandartes, logotipo, moldura ou borda. Formato paisagem.
```

### 4. Faixa Mentais (`atributos-faixa-mentais.png`)

```text
Pintura digital de fantasia medieval, pinceladas visíveis, em tons de azul-escuro, azul-petróleo e anil, com o brilho quente de uma vela. Interior de um gabinete de estudos: à esquerda, uma vela acesa sobre uma pilha de livros antigos e um tinteiro com pena; à direita, uma esfera armilar de latão e um mapa celeste circular na parede, com outra vela pequena; entre os dois, a sombra de uma estante. O centro da imagem é mais calmo e escuro, sem objetos em destaque.

Composição horizontal e larga, preenchendo o quadro inteiro. Sem texto, letras, runas legíveis, logotipo, moldura ou borda. Formato paisagem.
```

Se alguma vier com texto, com moldura ou com o centro ocupado, peça: "Refaça sem nenhum texto nem moldura, com o centro mais escuro e vazio."
