# Design — redesenhar-aba-pericias

## Context

A motivação está no proposal.md. A referência do usuário está em `referencia/pericias.webp` (1448 × 1086 px, a ficha real do Lion com cabeçalho, faixa e abas). O estado atual que molda a solução:

- **Aba hoje.** `CharacterSheetPage.tsx` põe `AttributeTable` (`categoria="pericia"`, `semTitulo`) dentro de `MolduraSecao`. `AttributeTable` guarda toda a edição em lote: rascunho, limites (0–5 na base para personagens), erros por campo, `campoEditavel`, `campoExigeAprovacao`, salvar com `onSave(alteracoes)` e avisos "salvas" / "enviadas para aprovação". O total vem de `FontesDoValor` (popover com as fontes).
- **Grupos e nomes.** `GRUPOS_PERICIAS` em `sheetCatalog.ts` (Talentos, Técnicas, Conhecimentos, 10 nomes cada, nas chaves antigas, como "Oficios" e "Linguistica"). O valor derivado é achado por `chaveDerivada`. Nomes fora da lista vão para "Outros registrados na ficha".
- **Ícones.** `listas_ficha.json` → `icones_ficha` (nome → ícone, validado no servidor por `^[a-z][a-z0-9_]*$`) e `IconeFicha` em `resumo/ornamentos.tsx` (ícones de traço). Hoje só 19 das 30 perícias têm ícone, e vários se repetem (Prontidão e Investigação usam o olho).
- **Técnicas aprovadas.** A folha do Resumo (`Pergaminho`, `CantoDaFolha`, `FlorDaBorda`, moldura dupla em CSS), os quadros em 9 fatias (`resumo/molduras/quadro.svg`), o `Medalhao` (aro dourado de 8 pontas e miolo colorido) e as pinturas opcionais que somem sem deixar imagem quebrada (`Pintura`, `preparar_pinturas`). A memória do projeto manda seguir essa construção e nunca usar imagem para moldura.
- **Prévia.** `/preview/ficha` (`ProvaDaFicha.tsx`) já monta a ficha real do Lion com a API de demonstração, na mesma composição da referência.

## Goals / Non-Goals

**Goals:**
- Cópia fiel da referência em 1448 px, conferida por sobreposição com a imagem (D9), e bonita de 360 a 1920 px.
- Nenhuma mudança de comportamento na edição, nos limites, no cálculo ou na aprovação.
- Um só conjunto de ícones e um só código de edição em lote para Atributos e Perícias.

**Non-Goals:**
- Redesenhar Atributos (continua com `AttributeTable`, que só troca a lógica interna pelo gancho).
- Mudar contrato, API, migração ou regras.

## Decisions

### D0. Mesma construção da aba Atributos (revisto na implementação, 2026-09-29)

Enquanto esta mudança era planejada, outra sessão fez a aba Atributos (`redesenhar-aba-atributos`), com uma referência do mesmo desenho: folha de pergaminho, cartões com faixa pintada, volutas, medalhão e a tabela Nome · Base · Ajuste manual · Total. Para as duas abas ficarem iguais, a folha de Perícias **reaproveita a construção dos Atributos**:
- as classes de `atributos.css` (`atributos-folha`, `atributos-cartao`, `atributos-tabela` e outras);
- os ornamentos exportados de `AtributosFicha.tsx` (`VolutaDaFaixa`, `ArcoDaFaixa`, `FiligranaDoMedalhao`, `PinturaOpcional`);
- `MedalhaoGrupo`, `IconeGrupo` e `IconePena`, de `atributos/icones.tsx`;
- o gancho `useEdicaoEmLote`, que a outra sessão já tinha extraído de `AttributeTable`. Por isso não há `useEdicaoDeValores`.

`pericias/pericias.css` só guarda as diferenças medidas na referência de Perícias: dez linhas mais densas, a base em número simples, o selo só na maior base, as cores dos grupos e a paisagem única no cabeçalho.

O nome `atributos-*` nas classes compartilhadas é um resto histórico. Quando as duas mudanças forem arquivadas, vale renomear para um nome neutro.

### D1. Folha própria, construída como a do Resumo

`pericias/PericiasFicha.tsx` desenha um `<Pergaminho as="section">` com a moldura dupla em CSS e os quatro `CantoDaFolha` e as duas `FlorDaBorda` do Resumo, reaproveitados de `resumo/ornamentos.tsx`. A aba sai de `MolduraSecao`: o painel da aba muda de `ficha-secao--moldura` para `ficha-secao--pericias`, como o Resumo e o Inventário.

Medidas-alvo na referência (1448 px de janela, folha de 1428 px):

| Parte | Medida |
|---|---|
| Recuo do texto | 42 px da borda da folha |
| Etiqueta "ESPECIALIDADES" | 12 px, versalete, espaçamento .28em, tinta 600 |
| Título "Perícias" | cerca de 56 px, fonte de exibição, 700, tinta 900 |
| Texto | 17 px, entrelinha 1.1, até 340 px de largura (duas linhas) |
| Botão "Editar valores" | 166 × 46 px, a 36 px da direita e 20 px do alto |
| Cena | de 410 a 1340 px na horizontal, 155 px de altura, passando por trás do alto dos quadros |
| Quadros | três de cerca de 455 px, com 15 px entre eles, começando 155 px abaixo do topo da folha |

### D2. Cabeçalho com a cena em sépia

- A cena (`pericias-cena.webp`) é uma `<img>` absoluta, `aria-hidden`, atrás do cabeçalho e do alto dos quadros (`z-index` abaixo dos quadros). Ela tem máscara em degradê nas quatro bordas, para dissolver no pergaminho, e `mix-blend-mode: multiply`, para o fundo claro da pintura sumir no papel.
- Sem a cena, aparecem duas `RosaDosVentos` grandes e desbotadas e um friso (`DivisorOrnado`), para o cabeçalho não ficar vazio.
- O botão "Editar valores" usa a placa clara com borda dourada e o ícone de pena (`Glyph`), na mesma linha da etiqueta. Durante a edição, ele some, e "Cancelar" e "Salvar alterações (n)" aparecem no pé da folha, como hoje.
- O título é `<h2>` (o `<h1>` da página é o nome do personagem no cabeçalho).

### D3. Quadro do grupo: estandarte pintado, medalhão e tabela

Cada grupo é um `<section aria-labelledby>` com três camadas:

1. **Corpo:** moldura recortada em 9 fatias, `pericias/molduras/grupo.svg`, no desenho do `quadro.svg` (linha dupla dourada, chanfro com mordida, volutas nos cantos de baixo, maiores que as do Resumo, como na referência). O fundo é o pergaminho mais claro.
2. **Estandarte:** faixa de cerca de 104 px no alto do quadro, com a pintura do grupo em `object-fit: cover` e um véu escuro embaixo para o título ficar legível. Por cima, a moldura do estandarte em 9 fatias, `pericias/molduras/estandarte.svg`, com linha dourada e volutas maiores nos quatro cantos. Sem a pintura, o estandarte fica num degradê da cor do grupo com vinheta.
3. **Medalhão:** 76 px, centrado na borda de cima do estandarte, com metade para fora. O `Medalhao` ganha os tipos `talentos` (braço flexionado), `tecnicas` (espadas cruzadas) e `conhecimentos` (livro aberto), com miolo na cor do grupo e símbolo em ouro claro.

O título do grupo fica em 28 px, fonte de exibição, cor pergaminho, com sombra. O lema fica em 11 px, versalete, espaçamento .22em, ouro 300.

O **lema e a cor** são apresentação e ficam junto dos grupos no frontend (`pericias/grupos.ts`):

| Grupo | Lema | Cor do miolo e do degradê |
|---|---|---|
| Talentos | Instinto e ação | vinho `#5b1c14` |
| Técnicas | Prática e ofício | verde `#1f3b26` |
| Conhecimentos | Sabedoria e mundo | azul `#172a4d` |

"Outros registrados na ficha" usa o mesmo quadro, com estandarte em degradê sépia, sem pintura e sem medalhão.

### D4. Linha da perícia

É uma `<table>` por grupo, com `<caption>` só para leitor de tela (o nome visível está no estandarte), cabeçalho "Nome", "Base", "Ajuste manual" (em duas linhas) e "Total", em 12 px e negrito. As linhas têm cerca de 31 px, separadas por uma linha fina dourada. As colunas, num quadro de 455 px:

| Coluna | Largura | Conteúdo |
|---|---|---|
| Nome | resto | ícone cheio de 22 px e o nome em 16 px, fonte de exibição |
| Base | 64 px | número centrado; a maior base ganha o **selo**: círculo escuro de 22 px, aro dourado, número claro |
| Ajuste manual | 76 px | caixa de 54 × 24 px, fundo pergaminho acinzentado, borda interna; o valor ou "—" |
| Total | 76 px | placa dourada de 58 × 28 px, degradê de ouro, borda escura, número em negrito com sinal |

- **Selo da maior base** (decisão do usuário, 2026-09-29): calculado entre as perícias da ficha (as oficiais e as de "Outros"). Todas as empatadas ganham o selo, e nenhuma o ganha quando a maior base é 0. O leitor de tela ouve "3, maior base". É só leitura rápida, sem efeito mecânico.
- **Ajuste:** caixa só de leitura fora da edição (decisão do usuário, 2026-09-29). O rótulo acessível continua "Ajuste manual de {nome}".
  - Como na referência, o positivo aparece sem sinal ("3") e o negativo com o menos tipográfico ("−1").
  - Os Atributos mostram "+1". A diferença fica registrada, e cabe ao usuário decidir se as duas abas devem igualar.
- **Base não gravada:** aparece "0". A regra diz que as Perícias não escolhidas na criação começam em 0 (`Atributos e Perícias.md`).
- **Nomes longos** (mais de 15 letras, como "Conhecimento urbano" e "Lidar com animais") ficam condensados, como na referência, para caber antes da coluna Base.
- **Total:** o gatilho do `FontesDoValor` é estilizado como placa dourada e continua abrindo as fontes. Sem valor derivado, a placa mostra "—".
- **Em edição**, base e ajuste viram `<input type="number">` do mesmo tamanho das caixas, com os mesmos `min`, `max`, `aria-invalid` e mensagens de erro de hoje. A mensagem aparece numa linha abaixo da perícia, para não alargar a coluna.

### D5. Ícones cheios (revisto na implementação: por nome, em TS, como nos Atributos)

**Revisão (2026-09-29):** a aba Atributos resolveu os ícones pelo nome do atributo em TS (`atributos/nomesDosIcones.ts`) e manteve o Resumo com os ícones de traço. Perícias segue o mesmo caminho:
- `pericias/nomesDosIcones.ts` lista os 30 nomes (chave de `chaveDerivada`);
- `pericias/icones.tsx` desenha 25 silhuetas;
- cinco perícias repetem o ícone de um atributo, como na referência: Esportes (corredor), Briga (punho), Empatia (duas pessoas), Expressão (máscara) e Ocultismo (olho);
- o `listas_ficha.json` e o Resumo não mudam, e a tarefa 2.1 saiu.

O texto abaixo é o plano original.

- A referência usa silhuetas cheias. `IconeFicha` ganha um segundo conjunto, `ICONES_CHEIOS`, desenhado com `fill="currentColor"`, e o tipo `NomeIconeFicha` passa a incluir os nomes novos. Os ícones de traço dos atributos não mudam.
- São 30 ícones, um por perícia, e o `listas_ficha.json` passa a ligar cada perícia ao seu. O servidor já valida o formato; o teste de catálogo passa a conferir que toda perícia oficial tem ícone e que nenhum se repete.

| Perícia | Ícone | Perícia | Ícone | Perícia | Ícone |
|---|---|---|---|---|---|
| Prontidão | `raio` | Lidar com animais | `pata` | Acadêmicos | `academia` |
| Esportes | `corrida` | Oficios | `engrenagem` | Arcanismo | `estrela_arcana` |
| Briga | `punho_cerrado` | Pilotagem | `leme` | Finanças | `moedas` |
| Esquiva | `bota` | Etiqueta | `taca` | Investigação | `lupa` |
| Empatia | `grupo` | Longo alcance | `mira` | Direito | `balanca` |
| Expressão | `mascara` | Armas Brancas | `espadas_cruzadas` | Linguistica | `pena` |
| Intimidação | `chifres` | Performance | `lira` | Medicina | `caduceu` |
| Liderança | `bandeira` | Prestidigitação | `mao` | Ocultismo | `olho` |
| Conhecimento urbano | `cidade` | Furtividade | `capuz` | Politica | `coroa` |
| Lábia | `balao_fala` | Sobrevivência | `fogueira` | Natureza | `folha` |

- O Resumo lê o mesmo mapa. O quadro Perícias do Resumo passa a mostrar os ícones novos, dentro do círculo que já existe.
- Um ícone desconhecido continua sendo ignorado na tela, e a linha fica sem ícone.

### D6. Edição em lote num gancho comum (feito pela aba Atributos: `useEdicaoEmLote`)

A lógica de `AttributeTable` vai para `useEdicaoDeValores` (`sheet/edicaoDeValores.ts`):
- entradas: categoria, ficha, grupos, permissões, `onSave` e limites;
- saídas: `editando`, `iniciar`, `cancelar`, `valorAtual`, `alterar`, `erroDe`, `podeEditar(path)`, `alteracoes`, `invalidos`, `exigeAprovacao`, `pendente`, `erro`, `aviso` e `salvar`.

`AttributeTable` passa a usá-lo sem mudar nada na tela, e os testes atuais dela continuam iguais. `PericiasFicha` usa o mesmo gancho. Não há duas implementações de limite ou de salvar.

### D7. Pinturas opcionais

| Arquivo | Proporção e tamanho | Fundo |
|---|---|---|
| `pericias-cena` | 4:1, 1536 × 384 | mantido (papel multiplicado sobre o pergaminho, como a gravura dos Atributos) |
| `pericias-talentos` | 3:1, 1200 × 400, recorte a 40% | mantido |
| `pericias-tecnicas` | 3:1, 1200 × 400, recorte a 45% | mantido |
| `pericias-conhecimentos` | 3:1, 1200 × 400, recorte a 70% (velas e esfera armilar mais baixas) | mantido |

As matrizes do usuário (2026-09-29) vieram em 2048 × 768 (8:3), com as figuras na faixa do meio. As saídas ficam em `public/arte/pericias/`, geradas por `preparar_arte_das_pericias`.

- As entradas ficam em `ARTES_DAS_PERICIAS`, no formato de `ARTES_DO_RESUMO` e processadas pelo mesmo `preparar_pinturas`.
- Cada pintura usa o padrão do Resumo: some ao falhar e avisa a folha para trocar pelo desenho em SVG/CSS. As matrizes são geradas pelo usuário no ChatGPT (`arte/prompts.md`).

### D8. Larguras (revisto: segue os Atributos, três colunas a partir de 1180 px de folha e uma coluna abaixo disso)

A folha mede a própria largura (`container: pericias / inline-size`), como o Resumo:

- **A partir de 1180 px:** três quadros lado a lado, cena à direita do título.
- **De 780 a 1179 px:** dois quadros por linha, com Conhecimentos centrado na segunda linha, na mesma largura. A cena fica mais baixa, atrás do cabeçalho.
- **Abaixo de 780 px:** uma coluna, com os quadros até 560 px, centrados.
- **Abaixo de 480 px (celular):**
  - sem flores de borda, cantos menores e cena como faixa desbotada acima do título;
  - o nome da perícia pode quebrar linha;
  - as colunas Base, Ajuste e Total estreitam (caixa de 40 px e placa de 46 px) e o cabeçalho "Ajuste manual" vira "Ajuste".
- Nenhuma largura a partir de 360 px rola na horizontal.

### D9. Como garantir a cópia fiel

0. **Folha na largura da referência:** a página da prévia limita a folha a cerca de 1376 px, e a da referência mede 1428. A comparação escala a captura para a largura da referência.
1. **Mesmos dados da referência na prévia:** `/preview/ficha?secao=pericias&pericias=referencia` troca as perícias do Lion pelas da imagem:
   - Prontidão 3, com ajuste 3;
   - Esportes, Briga, Esquiva e Empatia 1;
   - Expressão, Intimidação e Liderança 2;
   - as demais 0.
2. **Sobreposição automática:** `e2e/fidelidade-pericias.mjs` captura a prévia em 1448 × 1086 e gera, em `.screenshots/pericias/`:
   - a captura, a referência e as duas lado a lado;
   - uma sobreposição a 50%;
   - um mapa de diferença.
   A comparação usa Playwright e o Python do projeto (PIL).
3. **Calibragem por medidas:** as medidas das tabelas D1 e D4 viram asserções do e2e, com tolerância de ±6 px na janela de 1448 px: largura dos quadros, altura do estandarte, altura das linhas e posição das colunas.
4. **Aprovação do usuário** com as capturas lado a lado, primeiro sem pinturas (só SVG/CSS) e depois com elas.

## Risks / Trade-offs

- **Pinturas geradas não batem com a composição** (por exemplo, figura central cortada no estandarte de 4:1) → os prompts pedem assunto nas laterais e centro livre para o título, e o `preparar_arte.py` aceita a altura do recorte (`topo`).
- **Mudar `icones_ficha` muda o Resumo** → é desejado (mesma ficha, mesmos ícones). O teste do Resumo confere a presença do ícone, não qual ícone é.
- **Árvore de trabalho misturada** (`reformular-visual-da-ficha` sem commit, e `redesenhar-informacoes-basicas` em andamento, que também mexe em `CharacterSheetPage.tsx`, `ornamentos.tsx` e `preparar_arte.py`) → as edições nesses arquivos são pontuais e aditivas, e os commits são separados por mudança.
- **Total dentro de popover estilizado** → o gatilho continua um botão com rótulo "Fontes de {perícia}", e o axe confere o contraste da placa.

## Migration Plan

Sem migração. Só muda o `icones_ficha` do JSON, sem contrato novo. Para voltar atrás, basta devolver a aba a `MolduraSecao` + `AttributeTable`.
