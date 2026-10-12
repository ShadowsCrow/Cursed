# Medidas da referência — aba Personalidade

Gabarito da cópia fiel. As medidas foram tiradas da imagem do usuário (`personalidade.webp`, 1122 × 1402 px, de 2026-09-29) por varredura de pixels. As coordenadas são da imagem inteira. A seção vai de x 12 a 1110 (**1098 px de largura**), e essa é a largura em que a prévia é comparada (design D0).

As caixas exatas usadas na comparação (caixa de tinta, relativa ao canto da folha, que fica em x 13, y 407) estão em `platform/frontend/e2e/fixtures/referencias/personalidade/caixas.json`. As tabelas abaixo são a leitura humana delas.

Arquivos desta pasta:
- `personalidade.webp`: a referência inteira; `secao.png`: só a seção.
- `recorte-escrivaninha.png` e `recorte-historia.png`: anexos dos prompts das pinturas.
- `recorte-icones.png`: anexo do prompt da folha de ícones (os 2 emblemas, o livro da História e os 11 ícones das linhas).
- `canto-superior-esquerdo.png`, `canto-inferior-direito.png`, `quadro-grupo-canto.png` e `quadro-historia-canto.png`: ampliados 4×, modelos dos desenhos em SVG.

## Paleta (mediana dos pixels)

| Uso | Cor |
|---|---|
| Fundo da página (noite) | `#050d14` |
| Pergaminho, centro e quadros | `#f2dcb4` |
| Pergaminho, perto das bordas | `#edd1a2` (vinheta e manchas mais escuras) |
| Moldura externa, bronze escuro | `#493824`, com os filetes e a filigrana em ouro `#c8953f` |
| Títulos ("Personalidade", grupos, "História") | `#0d0000` (quase preto) |
| Eyebrow "QUEM É LION" | `#765123` |
| Subtítulos | `#5b4d33` |
| Citação | `#573e21` |
| Rótulos das linhas | `#7a562d` |
| Valores | `#272517` |
| Valor vazio ("Não informado") | `#726752`, em itálico |
| Ícones e emblemas | `#5a3816` / `#552f0a` |
| Etiqueta: fundo, borda e texto | `#e3c18a`, `#a07a45` e `#583e12` |
| Botão "Editar": fundo, borda e texto | `#f4e3c2`, `#c9af84` e `#201e15` |
| Texto da História | `#4d402d` |

## Tipografia (estimada pela altura das maiúsculas)

| Elemento | Família | Tamanho | Peso / estilo |
|---|---|---|---|
| Eyebrow "QUEM É LION" | sem serifa (Alegreya Sans) | ≈ 15 px (maiúscula de 11 px) | 700, espaçamento ≈ 0,14em, filete fino embaixo |
| "Personalidade" | serifa pesada | ≈ 52 px (maiúscula de 36 px) | 700 |
| Subtítulo do topo | serifa | ≈ 19 px | 400 |
| Citação | serifa | ≈ 21 px | itálico, 2 linhas centradas; aspas de abertura em negrito, destacadas à esquerda |
| Etiquetas | sem serifa | ≈ 15 px | 600 |
| Título do grupo | serifa pesada | ≈ 24 px | 700 |
| Subtítulo do grupo | serifa | ≈ 15 px | 400 |
| Rótulo da linha | sem serifa | ≈ 11,5 px | 700, maiúsculas, espaçamento ≈ 0,14em, até 2 linhas |
| Valor | serifa | ≈ 19 px | 600 |
| Botão "Editar" | serifa | ≈ 16 px | 500, lápis preenchido de 16 px |
| "História" | serifa pesada | ≈ 36 px | 700 |
| Subtítulo da História | serifa | ≈ 15 px | 400 |
| Texto da História | serifa | ≈ 19 px, entrelinha ≈ 1,45 | 400 |

A serifa da referência é mais encorpada e tem olho maior que o Cormorant Garamond do projeto. A escolha entre Cormorant Garamond e EB Garamond (OFL, servida localmente como as outras) sai da primeira sobreposição (tarefa 2.2).

## Caixas

### Folha
- **Moldura externa:** x 12–1110, y ≈ 405–1368. O pergaminho vai de x 19 a 1097.
- **Cantos:** filigrana de ≈ 95 × 95 px, vazada, com azul-noite entre os ramos. Eles avançam ≈ 8 px para fora do retângulo.
- **Borda:** filete dourado duplo nos quatro lados.

### Topo (y 440–605)
| Peça | Caixa |
|---|---|
| Haste vertical ornamentada | x 45–62, y 455–580 (medalhão com cruz no meio, pontas em lança) |
| Eyebrow | x 82, maiúsculas de y 454 a 465; filete sob o texto, x 82–165 |
| Título | x 83–341, maiúsculas de y 482 a 518 |
| Linha sob o título | y ≈ 533, x 82–440, com ponta de seta à esquerda e ponto à direita |
| Subtítulo | x 82–425, y 549–565 |
| Divisor do topo | y ≈ 595, x 48–806, com floreio de ponto e losango na ponta esquerda |
| Quadro da citação | x 473–767, y 451–542; filete fino duplo com volutas nos cantos da esquerda; à direita, entra na pintura |
| Aspas e texto | x 499–742, y 476–522 |
| Etiquetas | x 487–809, y 556–588 (altura 32); quatro pílulas separadas por ≈ 10 px, raio 6 |
| Pintura da escrivaninha | x ≈ 740–1100, y 405–620; encosta na moldura em cima e à direita, e esmaece à esquerda e embaixo |

### Grupos (y 620–1075; os dois quadros têm a mesma altura)
| Peça | Esquerda | Direita |
|---|---|---|
| Quadro | x 48–550 | x 570–1075 |
| Emblema | 71 × 70 em (71, 632) | 71 × 72 em (598, 631) |
| Título do grupo | x 155, maiúsculas de y 649 a 669 | x 683, y 645–666 |
| Subtítulo do grupo | x 155–400, y 680–693 | x 683, y ≈ 680–693 |
| Divisor do cabeçalho | y ≈ 711, x 68–530 | y ≈ 711, x 592–1055 |
| Linhas | 5; centros em 745, 807, 871, 940 e 1013 (passo ≈ 67) | 6; centros em 743, 798, 853, 911, 972 e 1033 (passo ≈ 58) |
| Ícone da linha | x 78–118 (≈ 40 × 35) | x 603–645 |
| Rótulo | x 142, até ≈ 110 px de largura | x 672, até ≈ 130 px |
| Valor | x 265 | x 820 |
| Botão "Editar" | x 445–528, 36 px de altura | x 972–1055 |

- **Linhas:** preenchem a altura do quadro. Com 5 linhas, cada uma fica mais alta que numa coluna de 6, e as duas colunas terminam na mesma altura.
- **Separadores:** filete de 1 px entre as linhas, com um ponto na ponta esquerda e um pequeno tique de seta logo depois.
- **Quadro:** filete fino (≈ `#b8905c`), duplo no alto, com voluta fina em cada canto (`quadro-grupo-canto.png`).

### História (y 1090–1330)
| Peça | Caixa |
|---|---|
| Quadro | x 48–1075; filete dourado duplo e cantos de filigrana dourada de ≈ 30 px (`quadro-historia-canto.png`) |
| Ícone do livro | ≈ 45 × 40 em (95, 1120) |
| Título "História" | x 163, y ≈ 1120–1150 |
| Subtítulo | x 163, y ≈ 1160–1172 |
| Divisor | y ≈ 1190, x 90–600, com losango ornado no meio e floreios nas pontas |
| Texto | x 117–600, y 1215–1260 (2 linhas no exemplo) |
| Pintura | x ≈ 640–1070, y 1095–1320; esmaece à esquerda |
| Filigrana d'água | canto de baixo à esquerda, x 55–170, y 1230–1320, em tom de pergaminho mais escuro |
