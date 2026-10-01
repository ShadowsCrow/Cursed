# Design — redesenhar-aba-atributos

## Context

- **Hoje:** a aba Atributos é `MolduraSecao` (cabeçalho comum com medalhão) + `AttributeTable`, que desenha três tabelas simples lado a lado (`attribute-table__grupos` em `design/preview.css`). A mesma `AttributeTable` serve a aba Perícias.
- **Edição:** `AttributeTable` guarda um rascunho por caminho (`atributos.valores.Força`, `atributos.ajustes.Força`), valida os limites da base (1 a 5 em personagens; sem limite em NPCs e monstros), grava tudo numa chamada (`onSave` → `saveMany`) e avisa quando alguma alteração exige aprovação do Narrador. O total vem do servidor (`ValorDerivadoResumo`) e abre as fontes em `FontesDoValor` (popover acessível).
- **Estética aprovada:**
  - o Resumo tem a folha de pergaminho com moldura dupla, `CantoDaFolha` e `FlorDaBorda` (`resumo/ornamentos.tsx`), e o `Medalhao` com aro de oito pontas;
  - o Inventário mostrou o padrão das pinturas opcionais: pré-carregadas, com fallback em SVG/CSS, sem imagem quebrada e sem salto de layout;
  - molduras só em SVG/CSS; pinturas só como ilustração (memória do usuário e D9 de `reformular-visual-da-ficha`).
- **Referência:** imagem do usuário de 2026-09-29 (Lion, Especialista de Combate · Elfo), a 1448 px de largura.

## Goals / Non-Goals

**Goals:**
- Reprodução fiel da referência a partir de 1100 px de largura da seção, e versões coerentes em tablet e celular (360 px sem rolagem horizontal).
- Mesma leitura, edição, limites, aprovação e fontes do total que a aba tem hoje.
- Reaproveitar os ornamentos do Resumo; nenhuma moldura em imagem.

**Non-Goals:**
- Perícias com o visual novo (fica para outra mudança; só a lógica é compartilhada).
- Qualquer mudança de regra, cálculo, contrato ou dado.

## Decisions

### D1. Componente próprio da aba, lógica compartilhada

- `useEdicaoEmLote(categoria, ficha, permissoes, onSave, aplicarLimites)` sai da `AttributeTable` e concentra rascunho, validação, alterações, aviso de aprovação e gravação. A `AttributeTable` passa a usá-lo sem mudar o que desenha (os testes atuais continuam verdes).
- `atributos/AtributosFicha.tsx` desenha a aba nova com o mesmo gancho. `CharacterSheetPage` troca, só na aba Atributos, `MolduraSecao` + `AttributeTable` por `AtributosFicha`.
- Por quê: a edição é a parte sensível (limites, aprovação, uma gravação só). Duplicá-la criaria duas regras que podem divergir.

### D2. Folha e cabeçalho

- A folha é `Pergaminho` com a moldura dupla do Resumo (`CantoDaFolha` nos quatro cantos e `FlorDaBorda` nas laterais), em `atributos-folha__moldura`, com as mesmas cores (`--ouro-700`, `--ouro-500`).
- O cabeçalho é uma grade de três áreas:
  - **título:** sobretítulo "BASE MECÂNICA" (versalete espaçado), `h2` "Atributos" em fonte de exibição, e a frase de apresentação;
  - **vinhetas:** três figuras (Força do corpo, Presença social, Foco mental), cada uma com uma faixa de pergaminho em SVG com a legenda e a frase curta (Supera desafios físicos; Conecta pessoas; Compreende o mundo). As vinhetas são decorativas para leitores de tela (`aria-hidden`), porque repetem os títulos dos grupos;
  - **ações:** "Editar valores" com ícone de pena, em botão claro de borda dourada.
- Em larguras menores, as vinhetas descem para baixo do título e encolhem; abaixo de 560 px, somem as frases das faixas e ficam só os nomes.
- O `role="tabpanel"` continua no contêiner da página; o `h2` da aba substitui o título da `MolduraSecao`.

### D3. Cartão de grupo

- **Faixa:** cena pintada do grupo como fundo (`object-fit: cover`), com um degradê escuro na cor do grupo embaixo, para o título branco e o subtítulo em versalete ("FORÇA DO CORPO", "PRESENÇA SOCIAL", "FOCO MENTAL") terem contraste ≥ 4,5:1 mesmo sem a pintura.
  - Cores: Físicos vinho (`#5a1d14` → `#2a0d09`), Sociais verde (`#1d4a3a` → `#0c211a`), Mentais azul (`#1c3350` → `#0b1626`). Grupo "Outros": noite neutra.
  - Sem pintura: o mesmo degradê com uma trama sutil em CSS.
- **Moldura:** borda dourada dupla em CSS em volta do cartão inteiro, com volutas em SVG nos dois cantos de cima da faixa e cantos ornados embaixo, na mesma família do Resumo (`CantoDaFolha` em escala menor).
- **Medalhão:** círculo sobre a borda de cima, com aro dourado de oito pontas (mesma construção do `Medalhao` do Resumo), miolo na cor do grupo e o ícone do grupo em traço dourado claro: braço flexionado, aperto de mãos e livro aberto.
- **Tabela:** uma `<table>` por grupo, nomeada pelo título do cartão (`aria-labelledby`), com cabeçalho Nome, Base, "Ajuste manual" (quebrado em duas linhas) e Total.
  - **Nome:** ícone preenchido do atributo (punho, corredor, escudo, máscara, duas pessoas, estrela de quatro pontas, olho, cérebro, triângulo com olho) e o nome em negrito. Os ícones são novos (`atributos/icones.tsx`), porque a referência usa silhuetas cheias e o Resumo usa traço; o Resumo não muda.
  - **Base:** disco escuro com aro bronze e o número claro.
  - **Ajuste:** caixa clara afundada, com o valor com sinal ou "—".
  - **Total:** placa dourada arredondada com o total com sinal (`+3`); é o gatilho do popover de fontes. Total não calculável: "—" com o motivo no popover, como hoje.
- **Edição:** o disco e a caixa viram `input type="number"` com a mesma forma. Os erros aparecem logo abaixo da linha (`field-error`, `role="alert"`), e os botões Cancelar e "Salvar alterações (N)" ficam no pé da folha.

### D4. Pinturas opcionais

Quatro pinturas, geradas pelo usuário no ChatGPT com os prompts de `arte/prompts.md`:

| Pintura | Uso | Saída |
|---|---|---|
| `atributos-gravura.png` | as três figuras do alto (Força do corpo, Presença social, Foco mental) | `atributos/atributos-gravura.webp`, 11:4, 1440 × 524 |
| `atributos-faixa-fisicos.png` | cena da faixa de Físicos | `atributos/atributos-faixa-fisicos.webp`, 3:1, 1200 × 400 |
| `atributos-faixa-sociais.png` | cena da faixa de Sociais | idem `-sociais` |
| `atributos-faixa-mentais.png` | cena da faixa de Mentais | idem `-mentais` |

- **Gravura única** (revisado em 2026-09-29, na comparação com a referência): as três figuras são um desenho contínuo, com as montanhas passando de uma para a outra. Três vinhetas separadas não reproduzem isso. As fitas com as legendas e os nós de filigrana entre elas são SVG, por cima do quinto de baixo da gravura.
- **Tinta sobre papel:** na tela, `mix-blend-mode: multiply` funde o papel da pintura com o pergaminho da folha, e uma máscara radial esmaece as bordas. Não há recorte de fundo: o traço fino de hachura não sobrevive à remoção por cor.
- **Encaixe da gravura** (2026-09-29, com a pintura do usuário, que veio em 2,75:1): a saída mantém 11:4, porque um recorte 4:1 cortaria a cabeça do guerreiro e o halo. Na tela, a caixa tem 3,5:1 (reservada por `aspect-ratio`, com ou sem a imagem), a gravura fica ancorada no alto e o pé vazio fica de fora, de modo que as fitas cobrem o peito das figuras, como na referência.
- **Faixas:** cena pintada; recorte 3:1 com a altura escolhida por cena (o arqueiro e o castelo no alto; as figuras e o mapa celeste no meio). As pinturas vieram com cores fortes, e a referência é quase monocromática: na tela, a cena perde saturação e brilho e recebe a cor do grupo (`mix-blend-mode: color`), mais o degradê escuro embaixo para o título.
- `preparar_arte.py` ganha `ARTES_DOS_ATRIBUTOS` (recorte e redimensionamento, como `ARTES_DO_RESUMO`).
- **Carregamento:** as pinturas são `<img>` decorativos (`alt=""`, `aria-hidden`) em caixas de tamanho fixo. Se a gravura falhar, cada fita ganha um emblema a traço com o ícone do grupo; se a cena falhar, fica o degradê da faixa. Nada se move quando elas chegam.

### D4a. Fidelidade à referência

- **Método:** `e2e/capturas-atributos.mjs` captura a folha a 1448 px (a largura da referência), e a comparação é feita com a referência e a captura empilhadas na mesma escala, e com recortes ampliados do cartão e do cabeçalho. Cada rodada corrige medidas (tamanhos, espaçamentos, pesos) até a estrutura coincidir; o que resta de diferença é pintura.
- **Fonte:** a referência usa uma serifada encorpada. A plataforma mantém a Cormorant Garamond (a mesma do nome no cabeçalho), com algarismos alinhados (`lining-nums`, reaplicado depois de cada atalho `font:`) e um contorno fino do próprio texto (`-webkit-text-stroke`) para chegar ao peso da referência sem baixar outra fonte.
- **Dourado em relevo:** ornamentos em traço dourado claro com contorno escuro por `drop-shadow`, que imita o metal pintado da referência sem imagem.

### D5. Disposição

- A folha é contêiner (`container: atributos / inline-size`).
- **Cabeçalho:** três colunas (título | gravura | ação) a partir de 1100 px de folha; abaixo, título e ação na primeira linha e a gravura na segunda.
- **Cartões:** três colunas a partir de 1180 px de folha (cerca de 1250 px de tela); abaixo disso, uma coluna de até 34rem, centralizada. Três cartões com menos de ~370 px apertam a tabela: medido no e2e, "Manipulação" encostava no disco da base. Entre 1180 e 1320 px de folha, o nome e o ícone da linha encolhem um pouco.
- **< 720 px:** tudo em coluna; cartões em largura inteira; a tabela usa colunas estreitas (disco 2.4rem, caixa 3.2rem, placa 3.2rem) para caber em 328 px úteis.
- O grupo "Outros" ocupa a linha inteira abaixo dos três.

### D6. Acessibilidade

- Um `h2` (título da aba) e um `h3` por cartão; cada tabela é nomeada pelo seu `h3`.
- Ícones, vinhetas, faixas, medalhões e ornamentos com `aria-hidden` e sem foco.
- Rótulos dos valores iguais aos de hoje ("Base de Força", "Ajuste manual de Força"), para leitor de tela e testes.
- Contraste do texto: tinta escura sobre pergaminho (≥ 7:1), branco sobre o degradê da faixa (≥ 4,5:1 medido no pior ponto sem pintura), e texto escuro sobre a placa dourada.
- `prefers-reduced-motion`: sem transições no foco das placas.

### D7. Onde fica cada texto

- Grupos e nomes dos atributos: `sheetCatalog.ts`, como hoje (são as chaves gravadas nas fichas).
- Subtítulos, legendas e frases das vinhetas: constante `APRESENTACAO_DOS_GRUPOS` em `atributos/apresentacao.ts`, indexada pelo título do grupo. Texto de interface, não regra; não entra no livro nem em catálogo JSON.

## Impacto no jogo

- **Escassez, risco e ritmo:** nenhuma mudança mecânica. Ver os três grupos com cor e ícone próprios ajuda a lembrar em que o personagem é forte na hora de propor uma solução, o que reforça soluções criativas sem somar regra.
- **Carga cognitiva:** a placa do total com sinal é o número que se rola; base e ajuste ficam visíveis, mas secundários, e as fontes continuam a um toque.

## Interações e migração

- Sem migração de dados, contrato ou regra.
- `AttributeTable` e a aba Perícias continuam iguais por fora; o gancho extraído é coberto pelos testes existentes da `AttributeTable`.
- As prévias `/preview/ficha?secao=atributos` e a matriz de capturas (`e2e/capturas-ficha.mjs`) passam a incluir a aba.

## Risks / Trade-offs

- [Pinturas com texto ou estilo diferente do da referência] → prompts com regras fixas (sem texto, sem moldura) e aprovação visual do usuário antes de fechar a tarefa.
- [Vinheta com papel mais escuro que o pergaminho deixa um retângulo] → máscara radial nas bordas; o prompt pede papel liso e claro.
- [Campos de edição dentro do disco ficam apertados no celular] → no modo de edição, o disco e a caixa crescem para 3rem, e a linha pode quebrar o erro para baixo.
- [Divergência entre as abas Atributos e Perícias] → a lógica é uma só (D1); só a aparência difere.

## Open Questions

- Nenhuma. As pinturas dependem do usuário; até lá, os fallbacks cobrem a aba.
