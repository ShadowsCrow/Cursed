# Arte da primeira fatia da nova estética (para o ChatGPT)

> **Estado (2026-09-28): as 13 imagens foram geradas, revisadas e aprovadas.** Estão em `platform/frontend/arte-original/` (fora do Git). Revisão: nenhuma tem texto, moldura ou borda; o texto escuro sobre o pergaminho tem contraste de 7,8:1 no pior ponto; o emblema saiu com fundo transparente, mas com halo avermelhado nas bordas; as duas texturas não repetem sem emenda. O tratamento de tudo isso está nas tarefas 3.5 a 3.8 e no design D11. Este guia serve para regenerar ou trocar imagens.

Este guia lista as imagens que o tema precisa nesta mudança e traz os prompts prontos para colar no ChatGPT. Os prompts estão em português, e o ChatGPT os entende bem.

## O que o ChatGPT faz e não faz

- Gera três formatos: **quadrado (1024×1024)**, **paisagem (1536×1024, 3:2)** e **retrato (1024×1536, 2:3)**. Não gera 3:1 nem 3:4; peça o formato mais próximo e eu recorto.
- Não tem flags nem prompt negativo. O que evitar entra como frase ("sem texto, sem moldura").
- Gera uma imagem por vez. Para variações, peça de novo na mesma conversa.
- Não garante textura repetível sem emenda nem fundo transparente. Compenso isso no código (ver as observações de cada item).

## Como usar

1. Abra **uma conversa nova** para a arte do projeto e cole a **mensagem inicial** abaixo.
2. Gere a **âncora** (item 1) primeiro. Escolha a melhor e deixe-a na conversa.
3. Nos itens seguintes, **anexe a âncora** e comece o pedido com a frase "Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz)". Isso mantém tudo na mesma família visual.
4. Se vier com texto, moldura ou borda, peça: "Refaça sem nenhum texto, letra, moldura ou borda."
5. Baixe cada imagem em PNG com o nome da tabela e me passe. Eu converto para WebP e comprimo.
6. Confira os termos de uso do ChatGPT para o uso das imagens no projeto.

Nenhuma imagem deve conter **texto, letras, runas legíveis, logotipos ou marca d'água**: o nome "CURSED" e todos os rótulos são texto real da interface.

## Mensagem inicial (colar primeiro)

```text
Vou pedir várias ilustrações para a interface de um jogo de RPG de mesa chamado Cursed, de fantasia medieval sombria. Guarde este estilo para todas as imagens desta conversa:

pintura digital de fantasia sombria, pinceladas visíveis, atmosfera noturna e melancólica, sombras em azul-meia-noite e verde-azulado dessaturado, acentos quentes de luz de vela em âmbar e dourado envelhecido, névoa suave e luz volumétrica, texturas ricas, composição cinematográfica.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem cores vivas e saturadas. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## Tabela de arquivos

| Arquivo | Uso | Formato a pedir | Como uso |
|---|---|---|---|
| `ancora-castelo.png` | cabeçalho do assistente e da ficha | paisagem 3:2 | recorto em 2:1; texto por cima, à esquerda |
| `fundo-noite.png` | fundo da moldura da mesa | quadrado | repetição com emenda corrigida por mim |
| `pergaminho.png` | superfície de leitura | quadrado | repetição com emenda corrigida por mim |
| `emblema-cursed.png` | marca na barra lateral | quadrado | dourado sobre preto, mistura por tela |
| `retrato-vazio.png` | retrato quando o jogador não enviou um | retrato 2:3 | recorto em 3:4 |
| `etapa-conceito.png` … `etapa-conferencia.png` (8) | ilustração no topo de cada etapa | paisagem 3:2 | uso direto, bordas cobertas pela moldura |

Pasta de destino: `platform/frontend/public/arte/`.

## Cabeçalho

### 1. `ancora-castelo.png` (gerar primeiro)

Vou recortar em 2:1, então o que importa fica na faixa central da imagem.

```text
Paisagem 3:2. Vista panorâmica noturna de um castelo gótico medieval de torres altas sobre um penhasco rochoso, acima de um vale de pinheiros coberto de névoa. Lua cheia atrás de nuvens finas, algumas janelas do castelo acesas em âmbar quente, montanhas nevadas ao longe se perdendo na neblina. O terço esquerdo da imagem é muito escuro e calmo, apenas névoa e sombra, para receber um título por cima. O castelo e o penhasco ficam nos dois terços da direita, na faixa horizontal central da imagem (o céu no topo e a base do vale podem ser cortados). Sem texto e sem moldura.
```

## Texturas

### 2. `fundo-noite.png`

```text
Quadrado. Textura contínua de pedra escura azul-quase-preta e couro desgastado, com grão sutil e rachaduras muito leves. Contraste extremamente baixo, iluminação uniforme, visão de cima, totalmente plana. Sem objetos, sem ponto focal, sem bordas mais escuras nos cantos. Sem texto.
```

Observação: para repetir, eu espelho e misturo as bordas no código. Se aparecer um ponto focal, gere de novo.

### 3. `pergaminho.png`

Não cole o bloco de estilo aqui: ele escurece demais.

```text
Quadrado. Textura contínua de pergaminho envelhecido, em creme quente e bege claro, com fibras e manchas suaves em marrom-claro. Contraste muito baixo, claro o bastante para que texto escuro fique legível por cima. Visão de cima, totalmente plana, iluminação uniforme, sem vinheta escura nas bordas. Sem escrita, sem marcas, sem dobras, sem rasgos, sem moldura.
```

Critério: o texto escuro precisa passar em contraste 4,5:1 sobre a imagem. Se estiver escura ou manchada demais, gere de novo pedindo "mais claro e mais uniforme".

## Marca e retrato

### 4. `emblema-cursed.png`

```text
Quadrado. Uma rosa dos ventos antiga e ornamentada, estrela de oito pontas com linhas gravadas finas e pequenos floreios decorativos, em ouro envelhecido com bordas gastas. Perfeitamente centralizada e simétrica, vista de frente, isolada em fundo preto puro e liso. Sem texto, sem letras, sem moldura.
```

Se o ChatGPT devolver com fundo transparente, ótimo; se vier com fundo preto, também serve: uso mistura por tela.

### 5. `retrato-vazio.png`

```text
Retrato 2:3. Meio corpo de um viajante encapuzado visto de costas em três quartos, rosto completamente escondido pela sombra do capuz, capa escura com um pequeno fecho dourado, ao fundo uma noite enevoada e desfocada. Centralizado, composição vertical. Sem rosto visível, sem texto, sem moldura.
```

## Ilustrações das oito etapas do assistente

Todas em **paisagem 3:2**, com o assunto ao centro e a cena preenchendo a imagem até as bordas. O escurecimento das bordas e as molduras ficam por minha conta, no CSS. Anexe a âncora e comece cada pedido com: "Use a imagem anexa apenas como referência de estilo (paleta, pincelada, luz)."

### 6. `etapa-conceito.png`

```text
Paisagem 3:2. Um diário de couro aberto sobre uma mesa de madeira, ao lado de uma vela e uma pena, um mapa enrolado e uma pequena bússola. Luz quente de vela em um escritório escuro, sensação de começo de uma história. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 7. `etapa-identidade.png`

```text
Paisagem 3:2. Uma mesa de madeira gasta com uma carta dobrada com selo de cera rompido, uma miniatura de retrato virada para baixo, uma chave antiga e um anel. Brilho âmbar de vela, fundo escuro, sensação de origens e segredos. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 8. `etapa-raca.png`

```text
Paisagem 3:2. Uma encruzilhada coberta de névoa ao entardecer, com várias silhuetas distintas ao longe: uma alta e esguia, uma larga e robusta, uma pequena, uma encapuzada, cada uma seguindo por um caminho diferente rumo às luzes de uma vila distante. Nenhum rosto visível. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 9. `etapa-classe.png`

```text
Paisagem 3:2. Ferramentas de aventureiro sobre um pano escuro: uma espada, um livro de magias com uma runa brilhando de leve, gazuas, um cajado de madeira e uma bolsa de couro. Luz lateral dramática, cada objeto bem distinto. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 10. `etapa-atributos.png`

```text
Paisagem 3:2. Três elementos simbólicos sobre um altar de pedra escura: um punho com manopla fechado, um olho aberto e a chama de uma vela acesa, representando corpo, mente e espírito. Contraste de luz âmbar e verde-azulada. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 11. `etapa-pericias.png`

```text
Paisagem 3:2. Uma bancada de artesão em uma oficina na penumbra, com gazuas, uma pequena luneta, um pilão com ervas, uma peça de xadrez, um rolo de corda e um livro de couro, ferramentas de vários ofícios bem arrumadas. Luz quente de lampião. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 12. `etapa-personalidade.png`

```text
Paisagem 3:2. Uma lanterna erguida em uma trilha escura de floresta, sua luz revelando um pequeno amuleto gasto pendurado em um galho, com uma pena e uma flor murcha nas raízes. Sensação de memória e vida interior, fundo de névoa. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

### 13. `etapa-conferencia.png`

```text
Paisagem 3:2. Uma porta pesada de madeira entreaberta para o salão iluminado de uma taverna, com um pergaminho aberto e um tinteiro sobre um degrau de pedra em primeiro plano. Sensação de estar pronto para partir. Exterior escuro e frio, com luz âmbar quente vazando da porta. Composição centralizada. A cena preenche toda a imagem até as bordas. Sem texto, sem letras, sem números, sem legendas, sem marca d'água, sem moldura, sem borda, sem vinheta, sem margem.
```

## O que eu faço no código (não peça ao ChatGPT)

- Molduras, cantos ornamentados, divisores, banners e selos: CSS e SVG. Ficam nítidos em qualquer tela e seguem o tema.
- O nome "CURSED" e todos os títulos: fonte serifada real.
- Ícones de interface: continuam os `Glyph` atuais, com refinamento.
- Pips de atributo, barras de recurso e abas.

## Próxima fatia (fora desta mudança)

Início, Sistemas, Biblioteca e Campanhas precisarão de: um herói de início (aventureiro de capa diante de um vale com castelo), fundos de cabeçalho por seção, retratos de exemplo e ícones ilustrados por sistema. Os prompts saem daquela mudança, reaproveitando a âncora.

## Conferência ao receber as imagens

- [ ] Nenhuma tem texto, letras, moldura, borda ou marca d'água.
- [ ] `ancora-castelo.png` tem o terço esquerdo escuro e calmo, e o castelo na faixa central.
- [ ] `fundo-noite.png` e `pergaminho.png` não têm ponto focal nem vinheta nas bordas.
- [ ] O texto escuro sobre `pergaminho.png` passa em contraste 4,5:1.
- [ ] `emblema-cursed.png` está centrado, dourado sobre preto (ou transparente).
- [ ] As oito ilustrações de etapa têm o assunto ao centro e estilo coerente com a âncora.
