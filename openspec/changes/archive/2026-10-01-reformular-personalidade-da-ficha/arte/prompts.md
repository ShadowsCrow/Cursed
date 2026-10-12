# Arte da aba Personalidade (para o ChatGPT)

São duas imagens para a cópia fiel da referência (`../referencia/personalidade.webp`); a terceira, a folha de ícones, deixou de ser necessária (ver a seção 3):
1. a **pintura da escrivaninha**, no alto à direita;
2. a **pintura da História**, à direita do quadro História;
3. a **folha de ícones**, com as 14 silhuetas.

As molduras, os cantos dourados, os divisores e as aspas **não** vêm de imagem: são desenhados em SVG e CSS, para ficarem nítidos em qualquer largura. Até as imagens chegarem, a aba fica completa com ornamentos e silhuetas em SVG.

Abra uma **conversa nova** no ChatGPT e cole a mensagem inicial. Em cada pedido, anexe o **recorte indicado** da pasta `referencia/`.

### Mensagem inicial (colar primeiro)

```text
Vou pedir algumas imagens para a aba "Personalidade" da ficha de um RPG de mesa de fantasia medieval chamado Cursed. Em cada pedido vou anexar um recorte da tela que queremos reproduzir fielmente. Recrie a mesma cena ou os mesmos desenhos do recorte, com a mesma composição, os mesmos objetos nos mesmos lugares, a mesma paleta e a mesma luz, só que em resolução maior e mais nítida.

Estilo: pintura digital de fantasia medieval, pinceladas visíveis, luz quente de vela, latão e ouro envelhecidos, pergaminho cor de creme (#f2dcb4), sépia, marrom escuro e azul-noite profundo com estrelas douradas.

Regras fixas: nenhuma imagem deve conter texto, letras, números, runas legíveis, logotipo, marca d'água, moldura ou borda. Sem elementos modernos. Sem estilo cartoon, anime ou 3D plástico.

Vou pedir uma imagem por mensagem. Responda apenas com a imagem.
```

## 1. Escrivaninha (alto à direita)

Anexo: `referencia/recorte-escrivaninha.png`. Salve como `arte-original/personalidade-escrivaninha.png`.

```text
Recrie esta cena em formato paisagem 16:9, com alta resolução (pelo menos 1920 × 1080).

Mesma composição do recorte: à esquerda do centro, uma vela grossa de cera derretida acesa num castiçal alto de latão; ao lado, uma esfera armilar de latão; embaixo, livros antigos fechados; ao fundo, um arco de pedra aberto para um céu noturno azul-escuro com lua crescente grande, estrelas e as torres pontudas de um castelo; no canto de baixo à direita, um pano azul-noite com estrelas douradas bordadas caindo sobre a mesa.

Tudo concentrado nos dois terços da direita. O terço da esquerda deve ser só pergaminho creme liso e claro (#f2dcb4), com, no máximo, um leve esfumado de pedra e folhagem em sépia muito claro saindo da cena, para a imagem se fundir ao papel. A borda de baixo também deve clarear para o mesmo pergaminho. Sem moldura, sem borda e sem vinheta escura nas bordas de cima e da direita (a cena encosta nelas).
```

## 2. História (à direita do quadro História)

Anexo: `referencia/recorte-historia.png`. Salve como `arte-original/personalidade-historia.png`.

```text
Recrie esta cena em formato 2:1, com alta resolução (pelo menos 2048 × 1024).

Mesma composição do recorte: uma pena grande de escrever mergulhada num tinteiro de vidro escuro; um pergaminho enrolado e uma folha aberta com escrita ilegível (só rabiscos, sem letras reconhecíveis); uma pilha de livros grossos com capas azul-escuras e ornamentos dourados; um castiçal de latão com vela acesa à direita; um pano azul-noite com estrelas douradas caindo à direita; ao fundo, uma janela em arco com lua crescente, estrelas e o castelo de torres pontudas.

Tudo concentrado na metade da direita. A metade da esquerda deve ser pergaminho creme liso e claro (#f2dcb4), com um leve esfumado de fumaça e folhagem em sépia bem claro saindo da cena, para a imagem se fundir ao papel. Sem moldura e sem borda.
```

### Revisão da História (2026-09-30)

A primeira versão deixou a metade esquerda vazia, como o prompt pedia, e a cena ficou com metade do tamanho da referência. A versão usada trocou o último parágrafo por:

```text
The scene must FILL THE WHOLE FRAME exactly like the attached crop: the quill starts at about 15% from the left edge, the stacked books and candle fill the center and right, the window and castle fill the top, the cloth touches the right edge. Only the leftmost 10% fades into smooth light cream parchment (#f2dcb4) with a faint sepia wisp of smoke and foliage. Do not leave any large empty area. No frame and no border.
```

## 3. Folha de ícones (14 silhuetas): não é mais necessária

Em 2026-09-30, os ícones passaram a ser recortados da própria referência pelo `preparar_arte.py` (`preparar_icones_da_personalidade`). O prompt abaixo fica só como registro.

Anexo: `referencia/recorte-icones.png`. Salve como `arte-original/personalidade-icones.png`.

A folha é cortada automaticamente numa grade de **4 × 4**. Cada ícone precisa ficar **inteiro dentro da sua casa**, centralizado, sem encostar nas vizinhas, e as duas últimas casas ficam vazias. A cor final vem do tema, então só importa o desenho: **tinta escura sobre fundo claro liso**.

```text
Desenhe uma folha quadrada (2048 × 2048) com 14 ícones no mesmo estilo dos ícones do recorte anexado: silhuetas gravadas em sépia escura (#4a2a0c), preenchidas, com pequenos detalhes internos em linhas claras, como carimbo ou gravura antiga. Fundo branco-creme totalmente liso (#fbf3e3), sem textura, sem manchas e sem sombra.

Organize numa grade invisível de 4 colunas por 4 linhas, com casas iguais. Cada ícone fica centralizado na sua casa, ocupando cerca de 70% dela, com bastante espaço livre em volta. Sem linhas de grade, sem números e sem texto.

Ordem, da esquerda para a direita e de cima para baixo:
1. rosa dos ventos de oito pontas dentro de um anel com marcas, como um medalhão;
2. lua crescente dentro de um anel com raios de sol em volta, como um medalhão;
3. livro fechado grosso visto de frente, levemente aberto em pé;
4. balança da justiça;
5. livro aberto visto de frente;
6. olho aberto com íris;
7. coroa de louros aberta em cima;
8. aranha vista de cima;
9. caveira de frente;
10. duas espadas cruzadas;
11. mão aberta com a palma para a frente;
12. ampulheta com moldura;
13. estrela de oito pontas facetada (rosa dos ventos simples, sem anel);
14. lua crescente com uma estrela pequena de cinco pontas.
As casas 15 e 16 ficam vazias.
```

## Depois de gerar

1. Salve os arquivos com os nomes acima em `platform/frontend/arte-original/`.
2. Avise no chat. Eu rodo o `preparar_arte.py`, que:
   - converte as pinturas em WebP;
   - corta a folha em 14 máscaras;
   - recusa, com a posição indicada, uma casa vazia ou com dois desenhos.
3. As capturas lado a lado com a referência vão para o ponto de revisão da passada.
