# Arte do editor de cartas

> **Geradas em 2026-09-30 pelo Codex** (`$imagegen`, na conta ChatGPT do usuário). Os prompts usados de fato estão em `prompts-codex/`, e a técnica está em `docs/tecnicas-visuais.md`, seções 8 e 9. Todas as pinturas foram geradas anexando o conceito aprovado (`referencia/conceito-editor-mochila.png`).

O conceito em si foi gerado com `prompt-conceito-editor.txt`, anexando o detalhe em grimório da aba Cartas (`redesenhar-aba-cartas/referencia/detalhe-grimorio.png`). O usuário aprovou o resultado em 2026-09-30.

## Peças

Todas são **opcionais**. Sem elas, o editor desenha o livro, os marcadores e o selo em CSS, na mesma geometria.

| Matriz em `platform/frontend/arte-original/` | Prompt | Uso | Saída |
|---|---|---|---|
| `cartas-editor-livro.png` | `prompt-editor-livro.txt` | Fundo do diálogo: o livro do conceito com as páginas em branco, sem os marcadores, sem a moldura e sem o botão de fechar. | `cartas/cartas-editor-livro.webp`, 1536 × 1024 |
| `cartas-editor-marcador.png` | `prompt-editor-marcador.txt` | Marcador de couro inativo, vazio. O emblema e o nome do tipo vêm por cima, em SVG/CSS. | `cartas/cartas-editor-marcador.webp`, 480 px de largura, sem fundo |
| `cartas-editor-marcador-ativo.png` | `prompt-editor-marcador-ativo.txt` | O marcador do tipo escolhido: couro dourado, mais alto. | `cartas/cartas-editor-marcador-ativo.webp`, 480 px, sem fundo |
| `cartas-editor-selo.png` | `prompt-editor-selo.txt` | Selo de cera vermelho do Publicar, vazio. O rótulo vem por cima, em texto. | `cartas/cartas-editor-selo.webp`, 480 px, sem fundo |

O marcador e o selo são pintados sobre pergaminho liso (`#e9dcc0`). O `preparar_arte.py` (`preparar_pecas_do_editor`) apaga o fundo medido no canto de cima à esquerda e recorta rente ao objeto.

A página esquerda usa as artes quadradas por categoria que já foram aprovadas na aba Cartas (`cartas-arte-<categoria>`). Por isso a mochila aparece com a arte de Acessórios, e não com o fundo azul do conceito: é a mesma arte que os jogadores veem no detalhe da carta.

## Como regenerar

```bash
codex exec --skip-git-repo-check -m gpt-5.6-sol -s read-only -i referencia/conceito-editor-mochila.png - < arte/prompts-codex/prompt-editor-livro.txt
```

Copie a imagem do caminho que a resposta informar para `platform/frontend/arte-original/<nome>.png` e rode:

```bash
.venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py
```
