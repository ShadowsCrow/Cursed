# Arte do Resumo da ficha (para o ChatGPT)

Quatro pinturas **opcionais** que deixam o Resumo mais próximo da imagem de referência. Cada uma tem um lugar fixo na folha; a que não existir simplesmente não aparece, e a folha continua completa com os ornamentos em SVG (molduras recortadas, remates, crista, pingente com asas, cantos com folhagem e rosa dos ventos).

Molduras, cantos, remates e divisores **não** vêm de imagem: continuam desenhados em SVG, como decidido na primeira fatia, para ficarem nítidos em qualquer tamanho.

Abra uma **conversa nova** no ChatGPT, cole a mensagem inicial abaixo e **anexe a imagem da ficha de exemplo** (Thalen Aerendir, pergaminho com castelo ao fundo) em cada pedido. Não use a âncora nem a mensagem inicial da primeira fatia: as duas são noturnas, e o Resumo pede luz de fim de tarde e céu claro, como na ficha de exemplo.

### Mensagem inicial (colar primeiro)

```text
Vou pedir algumas ilustrações para a ficha de personagem de um RPG de mesa de fantasia medieval chamado Cursed. Vou anexar uma ficha de exemplo: use-a só como referência de estilo (paleta, pincelada e luz da pintura) e ignore o texto, os quadros, as molduras e o layout.

Estilo para todas as imagens desta conversa: pintura digital de fantasia medieval, pinceladas visíveis, luz quente de fim de tarde, céu azul com nuvens volumosas, tons de azul, verde-musgo, ocre e dourado envelhecido, texturas ricas, clima de aventura com um toque sombrio.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## Truque do fundo de pergaminho

A natureza-morta, a bússola e o primeiro plano são pedidos **sobre fundo de pergaminho liso**, porque o ChatGPT não garante transparência. O `preparar_arte.py` troca esse fundo por transparência: mede a cor no **canto superior direito** da imagem e apaga só a área dessa cor ligada às bordas, então áreas claras cercadas pelo objeto (o mostrador da bússola, um pergaminho enrolado) continuam. Por isso:

- o fundo deve ser **liso e uniforme**, sem mesa, sem sombra projetada forte e sem vinheta escura nas bordas;
- o **canto superior direito** deve ser só fundo;
- os objetos podem ter sombras e cores normais.

## Arquivos

| Arquivo | Lugar no Resumo | Formato a pedir | Como uso |
|---|---|---|---|
| `resumo-cena.png` | Atrás da figura, no centro | Paisagem (1536×1024) | Recorto 3:2 levemente acima do centro → `resumo-cena.webp` (1536×1024). As bordas se dissolvem no pergaminho. |
| `resumo-primeiro-plano.png` | Pedras e arbustos aos pés da figura, passando para a faixa da História | Paisagem (1536×1024) | Recorto uma faixa 3:1 da parte de baixo → `resumo-primeiro-plano.webp` (1536×512), com as laterais esmaecidas. |
| `resumo-natureza-morta.png` | Canto inferior esquerdo | Quadrado (1024×1024) | → `resumo-natureza-morta.webp` (512×512). Com ela, o texto da História abre espaço à esquerda. |
| `resumo-bussola.png` | Canto inferior direito | Quadrado (1024×1024) | → `resumo-bussola.webp` (384×384). Substitui a rosa dos ventos em SVG. |

Salve em `platform/frontend/arte-original/` com esses nomes e rode, na raiz do repositório:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```

## Prompts

### 1. Cena de fundo (`resumo-cena.png`)

```text
Use a imagem anexa apenas como referência de estilo: paleta, pincelada e luz da pintura. Ignore completamente o texto, os quadros, as molduras, os ícones e o layout de ficha; não copie nenhum deles.

Paisagem de fantasia medieval ao entardecer, vista de uma encosta: ao fundo, um castelo de torres altas e finas sobre um penhasco, uma ponte de arcos de pedra e montanhas azuladas com neve; céu azul com nuvens volumosas iluminadas pelo fim do dia; floresta de pinheiros escuros descendo a encosta; primeiro plano com pedras e arbustos baixos, sem nenhuma pessoa.

O centro da imagem deve ser a parte mais clara e aberta (céu e castelo), porque uma figura será colocada na frente dele. As laterais e a parte de baixo podem ser mais escuras e menos detalhadas.

Formato paisagem. Sem pessoas, sem animais, sem texto, letras, runas legíveis, logotipo, moldura ou borda.
```

Se vier com uma figura humana no centro, peça: "Refaça sem nenhuma pessoa; o centro deve ficar vazio, só céu e castelo."

### 2. Primeiro plano (`resumo-primeiro-plano.png`)

```text
Use a imagem anexa apenas como referência de estilo: paleta, pincelada e luz da pintura. Ignore completamente o texto, os quadros, as molduras, os ícones e o layout de ficha; não copie nenhum deles.

Faixa horizontal de primeiro plano de uma trilha na montanha, vista de frente e de baixo: pedras cobertas de musgo, arbustos baixos, samambaias, algumas flores silvestres azuladas e raízes, tudo concentrado no terço de baixo da imagem. Os dois terços de cima são apenas fundo liso cor de pergaminho claro (bege), sem céu, sem paisagem, sem nada.

A vegetação fica mais densa nas laterais e mais baixa no centro. Formato paisagem. Sem pessoas, sem animais, sem texto, letras, logotipo, moldura ou borda.
```

### 3. Natureza-morta (`resumo-natureza-morta.png`)

```text
Use a imagem anexa apenas como referência de estilo: paleta, pincelada e luz da pintura. Ignore completamente o texto, os quadros, as molduras, os ícones e o layout de ficha; não copie nenhum deles.

Natureza-morta de um estudioso de magia, isolada sobre fundo liso cor de pergaminho claro (bege), sem mesa visível: uma pilha de livros antigos de couro com cantoneiras de latão, uma vela acesa num castiçal de ferro com cera escorrida, um crânio pequeno amarelado, um frasco de vidro com líquido azul e um rolo de pergaminho. Os objetos ficam agrupados no canto inferior esquerdo e ocupam cerca de dois terços da imagem; o resto é fundo liso.

Formato quadrado. Sem texto legível nas lombadas, sem letras, logotipo, moldura ou borda.
```

### 4. Bússola (`resumo-bussola.png`)

```text
Use a imagem anexa apenas como referência de estilo: paleta, pincelada e luz da pintura. Ignore completamente o texto, os quadros, as molduras, os ícones e o layout de ficha; não copie nenhum deles.

Uma bússola antiga de latão envelhecido, vista de cima, com rosa dos ventos gravada em oito pontas e agulha fina, apoiada sobre folhas secas de carvalho e um ramo de hera. Isolada sobre fundo liso cor de pergaminho claro (bege), sem mesa visível. A bússola ocupa cerca de dois terços da imagem, no centro.

Formato quadrado. Sem letras nos pontos cardeais, sem texto, logotipo, moldura ou borda.
```

Se vier com "N", "S", "L", "O" ou outras letras, peça: "Refaça sem nenhuma letra nos pontos cardeais."

## Ilustração do personagem (para os jogadores)

A ilustração de cada personagem é enviada pelo jogador na própria ficha. Para ela encaixar bem na moldura do Resumo, a orientação ao jogador é:

- formato **retrato 2:3** (no ChatGPT, 1024×1536);
- **corpo inteiro**, com a cabeça no terço de cima e os pés visíveis;
- fundo simples ou paisagem clara, sem texto nem moldura.

Sugestão de prompt para o jogador adaptar:

```text
Ilustração de corpo inteiro, em pé, de [descrição do personagem: raça, idade, roupas, arma ou foco, postura], pintura digital de fantasia medieval, pinceladas visíveis, luz suave de fim de tarde, fundo de paisagem clara e pouco detalhada. Formato vertical, a figura ocupa a altura toda, pés visíveis. Sem texto, letras, logotipo, moldura ou borda.
```
