# Arte de Informações básicas (para o ChatGPT)

São duas pinturas **opcionais**. Sem elas, a aba continua completa: a rosa dos ventos em SVG fica no lugar da paisagem, e o texto do conceito ocupa o espaço da natureza-morta da direita. A natureza-morta da **esquerda** já existe: é a do Resumo (`resumo-natureza-morta`), com livros, vela e tecido azul.

Molduras, cantos, ícones e emblemas **não** vêm de imagem: são SVG e CSS.

Abra uma **conversa nova** no ChatGPT, cole a mensagem inicial e **anexe a imagem de referência da aba Informações básicas** em cada pedido.

### Mensagem inicial (colar primeiro)

```text
Vou pedir duas ilustrações para a ficha de personagem de um RPG de mesa de fantasia medieval chamado Cursed. Vou anexar uma imagem de referência: use-a só como referência de estilo (paleta, traço e luz) e ignore o texto, os quadros, as molduras e o layout.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## 1. Paisagem do cabeçalho — `informacoes-paisagem.png`

Fica à direita do título, sobre o pergaminho. Na tela ela é **multiplicada** sobre o papel e tem as bordas esmaecidas: o fundo liso some sozinho, sem recorte. Por isso o fundo precisa ser **pergaminho claro e liso**, e o desenho em tons de sépia.

```text
Ilustração horizontal, formato 3:2. Desenho a nanquim e aguada em tons de sépia e marrom, como a ilustração de um livro antigo, sobre fundo de pergaminho claro, liso e uniforme (cor creme, sem manchas fortes). Um castelo medieval de muitas torres pontudas no alto de uma colina, à direita do centro, com uma ponte de pedra em arcos sobre um rio embaixo, árvores e arbustos no primeiro plano, algumas aves no céu e nuvens leves. À direita do castelo, uma rosa dos ventos desenhada com traço fino. O desenho se dissolve suavemente no papel em todas as bordas, principalmente na esquerda e embaixo, sem contorno nem moldura. Metade esquerda da imagem quase vazia, só papel e um pouco de nuvem. Só tons de sépia, sem outras cores.
```

## 2. Natureza-morta da direita — `informacoes-conceito-direita.png`

Fica no canto direito da faixa "Conceito do arquétipo", espelhando a natureza-morta da esquerda. O `preparar_arte.py` **apaga o fundo** medindo a cor do canto de cima à direita: o fundo precisa ser **liso e de uma cor só**, e os objetos não podem encostar nesse canto.

```text
Ilustração quadrada, 1:1. Pintura digital de fantasia medieval, pinceladas visíveis, luz quente de vela vinda da esquerda. Uma pilha alta de livros antigos com capas de couro marrom e detalhes em latão, apoiada à direita, e um pano de veludo azul-escuro com pequenas estrelas douradas bordadas, caindo em dobras por cima dos livros e escorrendo para baixo e para a esquerda. Talvez um tinteiro com pena e uma vela apagada ao lado. Os objetos ficam encostados na borda direita e na borda de baixo, ocupando cerca de dois terços da altura. O canto de cima à esquerda e todo o alto da imagem ficam vazios. Fundo branco liso e uniforme, sem sombra projetada no fundo, sem chão desenhado.
```

## Como usar

1. Salve as duas imagens em `platform/frontend/arte-original/` com os nomes acima (`.png`).
2. Rode, na raiz do repositório:
   ```bash
   .venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
   ```
3. Saem `public/arte/informacoes-paisagem.webp` (1536 × 1024, fundo mantido) e `public/arte/informacoes-conceito-direita.webp` (512 × 512, sem fundo). A aba passa a usá-las sozinha.
