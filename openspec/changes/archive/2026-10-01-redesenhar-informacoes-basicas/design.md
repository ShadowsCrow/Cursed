# Design — redesenhar-informacoes-basicas

## Contexto

A referência do usuário (2026-09-29) segue a mesma família visual do Resumo (`aba-resumo-da-ficha`) e do Inventário (`reformular-visual-da-ficha`). As duas já resolveram os problemas desta aba: molduras que esticam sem distorcer, ornamentos acessíveis e pinturas opcionais que somem sem deixar buraco. Esta mudança só recombina essas peças.

Impacto no jogo: nenhum sobre escassez, risco de combate ou ritmo. A carga cognitiva cai um pouco, porque os campos passam a ter grupos com nome e o conceito do arquétipo ganha destaque.

## Decisões

### D1. Folha do Resumo, não a moldura comum

A aba troca a `MolduraSecao` (medalhão + título) pela folha do Resumo: `Pergaminho`, moldura dupla em CSS, `CantoDaFolha` nos quatro cantos e `FlorDaBorda` nas laterais, todos de `resumo/ornamentos.tsx`. É o que a referência mostra (cantos grandes, sem medalhão) e segue a regra das molduras em CSS/SVG do Resumo.

- O cabeçalho da folha tem a etiqueta "IDENTIDADE" num quadro fino, o `<h2>` "Informações básicas", uma pena em SVG ao lado do título, o subtítulo e um friso com voluta.
- As demais abas continuam com a moldura comum.

### D2. Quadros do Resumo

Os dois quadros usam a mesma moldura em 9 fatias do Resumo (`resumo/molduras/quadro.svg`, `border-image ... fill`), com o remate em flor sobre a borda. O título é um `<h3>` em fonte de exibição, com um **emblema** em SVG à esquerda: busto num medalhão (pessoais) e escudo com gema (origem).

A divisão dos campos é a da referência. Tamanho base fica com as características pessoais e Tamanho atual com a origem.

### D3. Linhas sem mexer nos campos

`EditableField` e `SelectField` não mudam: cada um é envolvido por `.info-linha`, que acrescenta o ícone. O CSS da linha põe os filhos que o campo já renderiza em grade — rótulo, valor e o botão do popover — e manda aviso e nota para baixo do valor. Assim a edição, as permissões, as consequências e os avisos continuam os mesmos, e os testes deles seguem valendo.

- O botão "Editar" ganha borda, fundo claro e um lápis desenhado por `mask` em CSS.
- Tamanho base não tem botão; o espaço do botão fica vazio para alinhar a coluna.
- Ícones das linhas em SVG com `currentColor` (`informacoes/icones.tsx`): pessoa, estrela do arquétipo, medalha de nível, régua da altura, grupo (tamanho base), espadas cruzadas (classe), pena (raça), ampulheta (idade), símbolo do sexo e setas para fora (tamanho atual).
- O símbolo do sexo depende do valor: masculino, feminino ou um símbolo neutro para os demais valores da lista, sem inferir nada além do texto gravado.

### D4. Faixa do conceito

A faixa usa a moldura de destaque do Resumo (`quadro-destaque.svg`). O título é "Conceito do arquétipo {nome}", com um livro em SVG e o friso com a rosa dos ventos (`DivisorOrnado`).

- Pintura da esquerda: `resumo-natureza-morta.webp`, já no repositório (livros, vela, pergaminho, tecido azul), que casa com a referência.
- Pintura da direita: nova, `informacoes-conceito-direita.webp` (pilha de livros e tecido azul com estrelas douradas).
- Sem uma pintura, o texto ocupa o espaço dela. O texto nunca fica por baixo de uma pintura.

### D5. Paisagem do cabeçalho

`informacoes-paisagem.webp`, desenho em sépia sobre pergaminho liso. Ela é mesclada com `mix-blend-mode: multiply` e bordas esmaecidas por `mask-image`; o fundo liso da pintura desaparece no pergaminho sem recorte. Sem a pintura, a rosa dos ventos em SVG ocupa o canto.

### D6. Pinturas opcionais, como no Resumo

Mesmo contrato das pinturas do Resumo:
- componente `Pintura` com `alt=""`, `aria-hidden`, `onError` que a remove e aviso à folha para abrir espaço só depois do `onLoad`;
- `preparar_arte.py` ganha `ARTES_DAS_INFORMACOES` no mesmo formato de `ARTES_DO_RESUMO`, e a função de preparo passa a servir às duas tabelas;
- os prompts ficam em `arte/prompts.md` desta mudança.

### D7. Disposição por container query

O contêiner da folha mede a própria largura:

| Largura da folha | Disposição |
|---|---|
| ≥ 900 px | dois quadros lado a lado; paisagem à direita do título; pinturas da faixa visíveis |
| 640–899 px | quadros empilhados; paisagem menor; pinturas da faixa visíveis |
| < 640 px | quadros empilhados; sem paisagem nem pinturas; cantos menores; linha com rótulo acima do valor |

## Riscos

- **Cor da classe no valor:** a amostra de cor continua ao lado do nome, como exige o cabeçalho; não é a única pista (o nome está escrito).
- **Contraste:** o texto usa a tinta escura aprovada para o pergaminho; o dourado fica só nos ornamentos. O teste com axe cobre a aba.
- **Moldura sobre fundo de `border-image`:** como no Inventário, os quadros ganham `background-color` real no padding-box, para o axe enxergar o fundo.

## Arquivos

- `platform/frontend/src/app/characters/sheet/IdentityPanel.tsx`
- `platform/frontend/src/app/characters/sheet/informacoes/` (novo: `icones.tsx`, `informacoes.css`)
- `platform/frontend/src/app/characters/sheet/CharacterSheetPage.tsx`
- `platform/frontend/scripts/preparar_arte.py` e `cursed_platform/tests/test_preparar_arte.py`
- `platform/frontend/e2e/ficha-visual.spec.mjs` e `e2e/capturas-ficha.mjs`
