# Design — reformular-visual-da-ficha

## Context

A motivação está no proposal.md. O estado atual que molda a solução:

- **Cabeçalho, faixa e abas.** `SheetHeader.tsx`, `ActiveStateStrip.tsx`, `ResourcesStatus.tsx` e a barra de abas em `CharacterSheetPage.tsx` usam as classes da primeira fatia da estética (`character-hero`, `sheet-tabs`). As seções usam `.ficha-secao.tema-pergaminho` (`src/design/tema-telas.css`). O Resumo já tem molduras recortadas em 9 fatias (`resumo/molduras/quadro.svg` e `quadro-destaque.svg` via `border-image`) e ornamentos SVG em `resumo/ornamentos.tsx` (medalhões, volutas, cristas, cantos). Essas são as peças que o usuário aprovou.
- **Grade.** `inventory/InventoryGrid.tsx` desenha a grade com CSS Grid e as variáveis `--colunas`, `--linhas`, `--c`, `--l`, `--w` e `--h`. O tamanho do quadrado sai da largura da área (`celulaSobPonteiro` divide a largura pelas colunas), então qualquer tamanho de célula continua funcionando no arraste. As ações do item aparecem num grupo abaixo da grade. Já existem ícone de grade e arte por item (`dados.icone_grade`, `dados.imagem_ativo`), mas `InventoryGridPanel.tsx` **não passa `icones`** à grade, e a ficha só mostra nomes.
- **Tamanho da grade.** Pela regra (`carga-em-grade`):
  - colunas de 2 a 11 pelo Tamanho, mais ampliações de mochila e magia;
  - linhas iguais a 2 + Força (3 a 7 com Força 1–5), mais as da mochila e mais a linha vermelha.
  - Uma grade de até 8 colunas precisa caber em 400 px sem rolagem (`inventario-em-grade`).
- **Moedas.** São itens `subtipo="moedas"` com `dados = {cobre, prata, ouro, platina}`. `TIPOS_MOEDA` está duplicado em `cursed_platform/domain/grade.py`, `gridEngine.ts` e `CoinPurse.tsx`, e o contrato fica em `contracts.py:345`.
- **Itens.** São criados como cartas (`ConteudoItem` + `FormatoItemGrade`) ou recebem formato depois (`DefinirFormatoDialog` + `ItemFormatEditor`). Na concessão (`cartas_ciclo.py`), `item = {**dados, nome, quantidade}`, e o `texto` da carta se perde.
- **Avisos ao Narrador.** O padrão atual é `personagem.nivel_pela_migracao`: uma marca na ficha que `validacao_ficha.py` transforma em aviso e que o Narrador confirma (`policies.py` limpa a marca).

## Goals / Non-Goals

**Goals:**
- A bolsa e a grade ficam bonitas em qualquer combinação de Tamanho, Força e ampliações, do Minúsculo F1 ao Colossal F5 com mochila, de 360 a 1920 px.
- As molduras reaproveitam a técnica do Resumo, sem uma terceira forma de desenhar quadro.
- Os dados de raridade e categoria vêm de catálogo JSON, com a mesma fonte para backend e frontend.

**Non-Goals:**
- Mudar o motor da grade (`gridEngine.ts` / `domain/grade.py`), a validação no servidor ou o arraste. Só mudam a aparência, as ações do painel e a lista de moedas.
- Tema claro ou escuro alternativo para a bolsa: ela é sempre couro.

## Decisions

### D1. Bolsa em camadas que esticam, não uma pintura fixa

A bolsa é um contêiner em volta da área da grade, com cinco camadas:

1. **Couro:** `background` com uma textura de couro que se repete (pintura gerada, como `pergaminho.webp`). Ela cobre qualquer tamanho.
2. **Borda:** `border-image` com um SVG de 9 fatias (`inventario/molduras/bolsa.svg`), com costura tracejada, rebites e cantos reforçados. Os cantos ficam fixos e os lados esticam, na mesma técnica de `quadro.svg`.
3. **Alça lateral:** três elementos decorativos (ponta superior, meio com `background-repeat: repeat-y`, ponta inferior), presos à borda direita. Ela acompanha a altura.
4. **Laterais pintadas, como um lanche** (revisado em 2026-09-29, a pedido do usuário): a grade fica entre duas pinturas altas, uma à esquerda e outra à direita.
   - Cada lateral é uma faixa vertical de couro com costura, rebites e fivelas. Os objetos fazem parte da própria pintura, no alto e embaixo, e saem só para o lado de fora: à esquerda, o mapa enrolado preso numa correia e o tecido vermelho pendurado; à direita, a fivela da alça e o saco de moedas pendurado.
   - O `preparar_arte.py` apaga o fundo, recorta a pintura rente ao objeto e a divide em três partes: topo, miolo e base. O miolo é a faixa onde só aparece a tira de couro, detectada pela largura do objeto em cada linha, e fica sem emenda na vertical.
   - Na tela, cada lateral é uma coluna com topo e base em `<img>`, na proporção natural, e o miolo como fundo com `background-repeat: no-repeat round`. A lateral acompanha qualquer altura de grade sem distorcer. A borda de dentro da pintura encosta na grade e os objetos avançam para fora.
   - No celular, as laterais ficam com cerca de metade da largura.
   - Um carregamento prévio das seis partes decide o visual. Enquanto carregam, a bolsa já reserva o espaço das laterais, sem desenhá-las, e nada se move quando elas chegam. Se alguma parte falhar, a bolsa usa a alça, a fivela e o pingente em CSS/SVG. O resultado vale para a sessão, e nenhuma imagem quebrada aparece.
   - `aria-hidden` e `pointer-events: none`, como todo ornamento.
5. **Tampa e base pintadas** (pedido do usuário em 2026-09-29, depois das laterais): elas fecham o lanche em cima e embaixo.
   - **Tampa:** a aba da bolsa aberta, dobrada para trás, com o fecho. É uma pintura só, centralizada, de altura fixa, que não estica. Ela sai por cima da bolsa, atrás dela e das laterais (`z-index` negativo), e a coluna da bolsa reserva a altura que fica à mostra. Numa bolsa estreita, a largura máxima (80% da bolsa) encolhe a imagem com `object-fit: contain`, ancorada embaixo.
   - **Base:** estica na largura com a mesma técnica das laterais, deitada: ponta esquerda, miolo que se repete (`background-repeat: round no-repeat`) e ponta direita. O `preparar_arte.py` reaproveita a divisão das laterais, com a imagem girada 90°. Ela fica sobre a costura de baixo e sob as laterais, sem cobrir células.
     - A primeira versão, uma faixa de couro com cantoneiras de latão, foi reprovada pelo usuário em 2026-09-29 ("meio feia").
     - A base passa a ser o fundo de um saco de couro aberto. A borda de cima é reta e esmaece no couro da bolsa (máscara em degradê), os cantos de baixo são arredondados, e o mesmo pano vinho das laterais sai do saco perto das pontas e cai para baixo. O miolo é só o couro do fundo, sem pano, para a repetição não formar padrão.
     - A altura e o quanto ela sai para fora da bolsa ficam em variáveis (`--base-altura`, `--base-fora`), calibradas com a pintura.
   - Os dois grupos (laterais; tampa e base) carregam e caem para o fallback de forma independente. Sem tampa e base, o alto e o pé ficam com a costura em SVG.
   - No celular, as duas ficam mais baixas.
5. **Placa de indicadores:** fica sempre no topo, dentro da bolsa. Numa bolsa estreita, os blocos se empilham, e a placa não alarga a bolsa (`contain: inline-size`). Revisado na implementação: tirar a placa da bolsa quebrava a ideia do objeto único.

**Alternativas descartadas:**
- Pintura única de bolsa com a grade por cima: não serve para 2 a 13 colunas.
- Peças soltas presas aos cantos (mapa, tecido e saco de moedas, cada um numa pintura): implementadas e reprovadas pelo usuário em 2026-09-29, porque pareciam coladas por fora da bolsa.
- Moldura feita de imagem recortada: reprovada pelo usuário no Resumo; molduras só em SVG/CSS.

### D2. Tamanho da célula por container query

A área da grade vira `container-type: inline-size`. A célula é:

```
--celula: clamp(var(--celula-min), (100cqi - var(--folga-bolsa)) / var(--colunas), var(--celula-max));
```

Valores:
- `--celula-max` ≈ 5.5rem, para uma grade pequena não virar tabuleiro gigante;
- `--celula-min` = 2.25rem (36 px), para 8 colunas caberem em 400 px (8 × 36 = 288 px, mais a borda fina do celular);
- `--folga-bolsa` diminui no celular, onde a borda da bolsa fica mais fina.

Se `colunas × celula-min` passar da largura, a área rola na horizontal **dentro da bolsa**, com sombra de fade na borda que indica mais conteúdo. A página nunca rola. O arraste continua certo porque `celulaSobPonteiro` usa `getBoundingClientRect` da área, que já inclui o deslocamento da rolagem.

**Alternativa descartada:** calcular a célula em JS com `ResizeObserver`. Funciona, mas duplica o que o CSS resolve e cria renderizações a mais durante o arraste.

### D3. Disposição por largura da seção

A seção vira contêiner (`container-name: inventario`), com três arranjos:

- **Largo** (seção ≥ largura da bolsa + 34rem): `grid-template-columns: auto minmax(20rem, 1fr) 13rem`, ou seja, bolsa, painel do item e categorias. As moedas ficam abaixo do painel, como na referência.
- **Intermediário:** as categorias viram uma fileira de botões rolável acima da grade, e o painel fica ao lado da bolsa.
- **Estreito** (< 760 px ou bolsa larga demais): tudo em coluna, na ordem indicadores, categorias, bolsa, painel e moedas. Ao selecionar um item, o painel recebe `scrollIntoView` só se estiver fora da tela e se o movimento reduzido não estiver ativo.

A largura da bolsa é conhecida pelo CSS (`--colunas × --celula-max` mais a folga), então a escolha entre largo e intermediário também é feita em CSS, com `@container` e uma classe de faixa calculada a partir de `colunas` no componente (`bolsa--estreita/media/larga`). Isso evita medir o DOM.

### D4. Células, itens e estados

- **Célula:** quadrado escuro com `box-shadow: inset`, borda fina bronze e cantos levemente arredondados.
- **Área vermelha:** `repeating-linear-gradient` vinho com um pequeno SVG de alerta. Sem cadeado.
- **Item:** ocupa `--w × --h` células sobre fundo com vinheta. O ícone usa a lógica já existente de `--w0/--h0` e rotação.
- **Quantidade:** selo circular no canto inferior direito quando `quantidade > 1` ou a pilha tem mais de uma unidade. Nas moedas, mostra o total da pilha.
- **Estados:**
  - equipado: borda dourada, brilho e o marcador "E" que já existe (não depende de cor);
  - selecionado: moldura dourada mais grossa;
  - sobrecarga: borda vermelha e ícone;
  - esmaecido pelo filtro: `opacity` e `saturate` reduzidos, e o item continua focável e clicável.
- **Ícones na ficha:** `InventoryGridPanel` passa a resolver `dados.icone_grade` (e, na falta dele, `dados.imagem_ativo`) com `useAssetImage` e entrega o mapa `icones` à grade. As consultas vão em paralelo e ficam em cache pelo react-query existente.
- **Desenho padrão por subtipo:** SVGs próprios (peitoral, capacete, luvas, botas, uma mão, duas mãos, escudo, mochila, aljava, moedas, outro), com traço dourado sobre a vinheta, num novo `inventario/iconesItem.tsx`, no mesmo estilo de `IconeFicha`. Isto é ícone de conteúdo, não moldura, então SVG é o formato natural.

### D5. Painel do item e ações

O grupo `grade-inventario__acoes` sai de baixo da grade e vira o painel "Item selecionado". O estado de seleção sobe de `InventoryGrid` para um componente pai (`InventarioFicha`), para o painel viver fora da bolsa. Assim, `InventoryGrid` passa a aceitar `selecionadoId` e `onSelecionar` controlados, mantendo o modo não controlado para o protótipo e a sala.

**Ações:**
- Equipar/Desequipar é o botão principal (cor vinho, largura inteira).
- Girar e Largar no chão ficam lado a lado.
- Remover da grade e Oferecer ficam na linha seguinte.
- Empunhadura aparece só nas versáteis.
- O envio de arte e ícone continua no painel, para quem pode editar.
- "Mover pelo teclado" sai. Enter ou Espaço sobre o item já inicia o movimento (`teclaNoItem`), e a dica de teclado passa a ser o `aria-describedby` do item.

**Por que o pai controla a seleção:** o painel precisa de dados do servidor (descrição, raridade, efeitos, cargas) que o `ItemGrade` do motor não carrega. O pai tem os dois.

### D6. Raridade e categoria em catálogo

Um novo arquivo `cursed_platform/catalogos/itens.json`:

```json
{
  "raridades": [{"id": "comum", "rotulo": "Comum", "cor": "#8b8172"}, …, {"id": "lendario", …}],
  "categorias": [
    {"id": "armas", "rotulo": "Armas", "icone": "espada", "subtipos": ["uma_mao", "duas_maos"]},
    {"id": "armaduras", "subtipos": ["peitoral", "capacete", "luvas", "botas"]},
    {"id": "escudos", "subtipos": ["escudo"]},
    {"id": "acessorios", "subtipos": ["mochila", "aljava"]},
    {"id": "moedas", "subtipos": ["moedas"]},
    {"id": "consumiveis", "escolha_em_outros": true}, {"id": "materiais", …}, {"id": "chaves", …},
    {"id": "itens_de_missao", …}, {"id": "diversos", "escolha_em_outros": true, "padrao_outros": true}
  ]
}
```

- **Onde o dado fica:** `ConteudoItem` ganha `raridade` (padrão `comum`) e `categoria` (obrigatória só quando o subtipo é `outro`; nos demais, é derivada e não pode ser enviada). Os dois são validados contra o catálogo. Na concessão, vão para `item.dados.raridade`, `item.dados.categoria` e `item.dados.descricao` (texto da carta). A definição de formato de um item existente (`definirFormatoItem`) aceita os mesmos campos.
- **Contrato:** `ItemInventarioResumo` expõe `raridade`, `categoria` e `descricao` calculados, com os padrões aplicados. Assim o frontend não repete a regra de derivação.
- **Rótulos e cores:** saem do catálogo, servido por um endpoint de catálogos, como `listas_ficha.json` e classes.
- **Cor da raridade:** usada só na etiqueta, com o nome sempre escrito. As cores são verificadas para contraste de 4,5:1 sobre o pergaminho (texto) ou usadas como fundo com texto escuro ou claro conforme o caso.

**Alternativa descartada:** colunas novas na tabela de itens. `dados` já é o lugar de atributos descritivos do item, e raridade e categoria não entram em nenhuma consulta de servidor.

### D7. Platina: dados, contrato e aviso

- `TIPOS_MOEDA` passa a `("cobre", "prata", "ouro")` no domínio e no frontend. O contrato de moedas perde `platina` (com `extra="forbid"`, um pedido com platina é recusado com 422).
- A revisão Alembic `0019_moedas_raridade_categoria`:
  1. em cada pilha com `platina > 0`, soma a quantidade por personagem, remove a chave, apaga a pilha que zerou e renomeia as demais (`_rotulo_pilha`);
  2. grava um evento de auditoria por personagem afetado ("N moedas de platina retiradas (a platina deixou de existir)") e a marca `inventario.platina_retirada = N` na ficha;
  3. preenche `dados.raridade = "comum"` onde falta e `dados.categoria = "diversos"` nos itens `outro` sem categoria;
  4. copia o `texto` da versão da carta para `dados.descricao` nos itens com `CartaPersonagemRegistro.item_id`.
- A marca `inventario.platina_retirada` vira aviso em `validacao_ficha.py`, visível ao Narrador, com a ação "Entendi", que a limpa (mesmo fluxo de `nivel_pela_migracao`, liberado em `policies.py`).
- **Downgrade:** recoloca `platina: 0` nas pilhas e remove as marcas. As moedas retiradas não voltam, e isso fica registrado no próprio evento de auditoria.

### D8. Cabeçalho, faixa e abas

- **Cabeçalho:** `MolduraOrnamentada` painel "vazio" (a mesma da navegação) sobre uma cena recortada no chanfro, com `ancora-castelo-1536.webp` à direita e gradiente escurecendo sob o texto. Os recursos ficam num quadro noturno da mesma família. O retrato ganha aros dourados em CSS. Revisado na implementação: reaproveitar as molduras aprovadas em vez de criar uma terceira. "Trocar retrato" e "Remover retrato" continuam no `ImageUpload` existente, estilizado como links dourados.
- **Faixa de estado:** placas com ícone (`IconeFicha`), em `display: flex; flex-wrap: wrap`.
- **Abas:**
  - `SECTIONS` ganha `icone`, com um ícone por seção, desenhados em `ornamentos.tsx`;
  - a barra é `overflow-x: auto` com `scroll-snap`, e a aba ativa recebe `scrollIntoView({ inline: "nearest" })` ao mudar;
  - o `role="tablist"` e a navegação por setas continuam como estão.
- **Moldura da seção:** um componente `MolduraSecao` com `icone`, `titulo`, `subtitulo` e `ferramentas`, aplicado às nove seções. Hoje cada seção tem seu `section-heading`; o título passa para a moldura e os painéis internos mantêm os seus subtítulos.

### D9. Artes geradas

O usuário gera as artes no ChatGPT, com os prompts de `arte/prompts.md`:
- textura de couro que se repete (512 × 512);
- lateral esquerda: tira de couro com o mapa enrolado no alto e o tecido vermelho embaixo;
- lateral direita: tira de couro com a fivela da alça no alto e o saco de moedas embaixo.

Revisado na implementação: a alça, a fivela, o pingente e as moedas ficaram bons em CSS/SVG e saíram da lista de pinturas. Revisado em 2026-09-29: o mapa, o tecido e o saco de moedas deixaram de ser pinturas soltas e passaram a fazer parte das laterais (D1, item 4).

As pinturas passam por `preparar_arte.py`, para ganhar fundo transparente, e vão para `public/arte/inventario/`. Até elas chegarem, as camadas usam fallbacks em CSS (couro em gradiente, alça, fivela e pingente em CSS/SVG). Nada quebra sem as artes.

## Impacto no jogo

- **Escassez e risco:** mostrar capacidade, mãos e estado em primeiro plano torna a decisão de levar ou largar mais visível, sem mudar números. A Sobrecarga continua igual.
- **Ritmo e carga cognitiva:** o filtro e a busca que destacam, sem reordenar, preservam a memória espacial ("a poção fica no canto"), que é o ponto da grade. O painel do item concentra as informações que antes exigiam abrir a carta.
- **Moedas:** com três tipos, há menos contabilidade. Não há câmbio, então a mudança não mexe na economia de nenhuma mesa, a não ser pela perda da platina já registrada, que o Narrador pode compensar.

## Risks / Trade-offs

- [Grade Colossal com mochila e ampliações em telas de 1280 px espreme o painel] → a disposição intermediária move as categorias para cima e o painel fica com mínimo de 20rem. Abaixo disso, vai para a disposição empilhada. Isto está coberto pela matriz de capturas.
- [Muitos ícones por item geram muitas requisições de imagem] → as cópias de exibição já existem (`envio-de-imagens`), e o react-query evita repetir. Os itens sem ícone usam o SVG local.
- [Perda irreversível da platina] → decisão do usuário. A perda é mitigada pelo evento no histórico com a quantidade e pelo aviso ao Narrador.
- [Controlar a seleção fora do `InventoryGrid` pode quebrar a sala e o protótipo] → a seleção controlada é opcional. Sem as props, o componente funciona como hoje, e os testes existentes da grade continuam passando.
- [Peças decorativas cobrindo células em tamanhos intermediários] → elas ficam só fora da área da grade (margem da bolsa), com `pointer-events: none`, e somem abaixo das larguras mínimas. As capturas verificam os tamanhos da matriz.
- [Cores de raridade sem contraste no pergaminho] → teste automatizado de contraste das cores do catálogo contra o fundo da etiqueta.

## Migration Plan

1. Atualizar o catálogo, o contrato e o domínio, e gerar a revisão `0019`, com testes de migração cobrindo pilha mista, pilha só de platina, item sem raridade e item concedido de carta.
2. Regenerar `openapi.json` e o cliente (`schema.ts`).
3. Frontend: primeiro as moedas em três tipos e os campos novos, depois a nova aparência.
4. Aplicar a `0019` no Supabase de testes, como na `0018`.
5. **Reversão:** o `downgrade` da `0019` restaura a estrutura (sem as moedas retiradas), e o frontend antigo volta a funcionar com `platina: 0`.

## Open Questions

- Tons exatos das cinco raridades: proponho cinza, verde, azul, roxo e dourado, com a aprovação final do usuário na prova visual. Os tons ficam no catálogo, então trocar depois não muda código.
