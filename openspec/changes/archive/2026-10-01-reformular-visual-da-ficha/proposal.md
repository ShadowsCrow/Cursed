# Proposta — reformular-visual-da-ficha

## Why

Fora do Resumo, a ficha ainda tem cara de formulário. O cabeçalho é uma caixa lisa e as abas são só texto. O Inventário, que é onde o jogador decide o que levar, o que abandonar e quando arriscar a Sobrecarga, é uma grade de quadrados cinza, com o nome dos itens escrito e as ações soltas embaixo. A tensão da escassez, que o sistema quer presente, some numa tela que não mostra de relance o que se carrega, o que está equipado e quanto espaço resta. A imagem de referência enviada pelo usuário em 2026-09-28 mostra o que se quer:
- **cabeçalho** noturno com moldura dourada, retrato emoldurado e PV/PP;
- **abas** com ícones;
- **inventário** como uma bolsa de couro em volta da grade, com um painel "Item selecionado", categorias e moedas.

Há também duas lacunas de conteúdo. Os itens não têm **raridade** nem **categoria**, e sem elas não dá para identificar nem filtrar o que se carrega. E o usuário decidiu reduzir as moedas para **três tipos**.

Classificação: **núcleo**. Quase tudo é interface. Há três mudanças de conteúdo decididas pelo usuário:
- **Raridade:** só etiqueta e cor, sem efeito mecânico.
- **Categoria:** serve para organizar e filtrar.
- **Moedas:** a platina deixa de existir. Isto muda o livro de regras (`Carga.md`).

## What Changes

- **Cabeçalho da ficha** (todas as abas, exceto o Resumo, que já tem o seu):
  - quadro escuro com moldura dourada recortada e o castelo ao fundo;
  - retrato com moldura de filigrana, com "Trocar retrato" e "Remover retrato" embaixo;
  - classe · raça com a cor da classe, nome em destaque e etiquetas;
  - quadro de PV e PP com barras e o máximo.
- **Faixa de estado:** Exaustão e Estresse em placas com ícone, Esforço como botão destacado e Efeitos ativos ao lado.
- **Barra de abas:** ícone e nome em cada uma das dez abas. A aba ativa vira uma placa dourada. Se não couberem, a fileira rola e a aba ativa fica sempre visível.
- **Moldura das seções:** o pergaminho de cada aba ganha moldura recortada e um cabeçalho com medalhão de ícone, título e subtítulo. O conteúdo das demais abas não muda.
- **Aba Inventário redesenhada:**
  - **Bolsa:** a grade fica dentro de uma bolsa de couro montada em camadas, que acompanha qualquer tamanho de grade (2 a 11 colunas mais ampliações; 2 + Força linhas, mais mochila e linha vermelha).
  - **Indicadores:** placa com capacidade (células ocupadas/verdes), mãos ocupadas e estado da carga (Normal ou Sobrecarga, com as células na área vermelha). **Não há peso.**
  - **Grade:**
    - células escuras afundadas;
    - itens com ícone, selo de quantidade, borda dourada quando equipados e destaque quando selecionados;
    - área vermelha hachurada com sinal de alerta (sem cadeado).
  - **Ícones:** os ícones de grade enviados passam a aparecer na grade da ficha (hoje só o protótipo os mostra). Sem ícone, aparece um desenho padrão do subtipo.
  - **Painel "Item selecionado":**
    - arte ou ícone, nome e etiquetas de raridade e categoria;
    - detalhes (tipo, dimensão, mãos, quantidade, cargas, equipado), descrição e efeitos do item, só em texto.
    - **Ações:** Equipar/Desequipar como principal, depois Girar, Largar no chão, Remover da grade e Oferecer. **Não há botão Mover**: mover continua sendo arrastar ou usar o teclado. O antigo "Tirar da grade" passa a se chamar "Remover da grade".
  - **Categorias e busca:** contagem por categoria. Filtrar ou buscar **destaca** os itens na grade e esmaece os demais, sem esconder nem reordenar. Não existe "Ordenar por".
  - **Moedas:** barra com cobre, prata e ouro, e as totais editáveis como hoje.
  - **Seções auxiliares:** "Fora da grade", "Sem dimensão" e ofertas ganham o mesmo acabamento.
- **Raridade do item:** Comum, Incomum, Raro, Épico ou Lendário, definida na criação do item (carta de item e definição de formato). A lista, as cores e os rótulos ficam num JSON de catálogo editável. Itens existentes passam a Comum.
- **Categoria do item:**
  - Armas, Armaduras, Escudos e Acessórios saem do tipo.
  - Para o tipo Outros, o Narrador escolhe na criação entre Consumíveis, Materiais, Chaves, Itens de Missão e Diversos (lista em JSON).
  - Itens Outros existentes passam a Diversos.
  - As moedas têm categoria própria.
- **Descrição do item no inventário:** o texto da carta passa a acompanhar o item concedido, para aparecer no painel. Os itens já concedidos recebem o texto da carta de origem, quando ela existe.
- **BREAKING — Moedas em três tipos:** cobre, prata e ouro. A platina sai da regra, dos contratos e dos dados:
  - as pilhas perdem as moedas de platina, e a pilha que zerar some;
  - cada ficha afetada registra no histórico quantas moedas foram retiradas;
  - o Narrador recebe um aviso na ficha para compensar, se quiser;
  - não há conversão, porque as regras não têm câmbio.

## Capabilities

### New Capabilities
- `visual-da-ficha`: cabeçalho, faixa de estado, barra de abas e moldura das seções da ficha, com o comportamento no celular.

### Modified Capabilities
- `carga-em-grade`: moedas em três tipos (sem platina). Raridade e categoria não entram na regra de carga, porque não têm efeito mecânico.
- `inventario-em-grade`:
  - a aba Inventário com bolsa, indicadores sem peso e painel do item;
  - as ações renomeadas e sem Mover;
  - categorias e busca que destacam;
  - ícones de grade na ficha;
  - raridade e categoria na criação do item;
  - descrição no item concedido;
  - moedas em três tipos e migração da platina.

## Non-goals

- **Usar ou consumir itens** ("Usar item", "Restaura 1d6+2"): o usuário quer isso no futuro, numa mudança própria.
- Qualquer efeito mecânico da raridade: preço, poder, frequência de achado.
- Peso: não volta nem como informação.
- Ordenar o inventário, ou esconder itens da grade ao filtrar.
- Redesenhar o conteúdo das outras abas (Informações, Personalidade, Atributos, Perícias, Equipamentos, Status, Efeitos, Habilidades e cartas): elas só ganham a moldura nova.
- Mudar o Resumo, a sala, as grades de chão e baú ou as telas fora da ficha.
- Editor de catálogos (raridades e categorias) dentro do sistema: por enquanto só pelo JSON.
- Converter a platina em outra moeda.

## Impact

- **Regras:** `rules/sistema/Carga.md`, na seção Moedas, passa a três tipos. É mudança de regra decidida pelo usuário em 2026-09-28.
- **Dados:** novo catálogo `cursed_platform/catalogos/itens.json`, com raridades (rótulo, cor) e categorias (rótulo, ícone, subtipos ou escolha em Outros), registrado no `manifesto.json`. Também `fixtures/grade/casos.json`, que usa platina.
- **Backend:**
  - `cursed_platform/domain/grade.py`: `TIPOS_MOEDA` e divisão em pilhas;
  - `contracts.py`: moedas sem `platina`; `ConteudoItem` com `raridade` e `categoria`; `ItemInventarioResumo` expõe os dois e a descrição;
  - `cartas.py` e `cartas_ciclo.py`: validação e cópia na concessão;
  - `inventario_grade.py` e `ficha_viva.py`: definição de formato com raridade e categoria;
  - leitura do catálogo novo em `catalogos.py`.
- **Migração:** nova revisão Alembic `0019`. Ela retira a platina das pilhas, com evento no histórico e aviso ao Narrador, marca raridade Comum e categoria nos itens existentes e copia a descrição da carta de origem para os itens concedidos.
- **Frontend:**
  - `SheetHeader.tsx`, `ActiveStateStrip.tsx`, `ResourcesStatus.tsx` e a barra de abas em `CharacterSheetPage.tsx`;
  - `InventoryGridPanel.tsx`, `inventory/InventoryGrid.tsx`, `CoinPurse.tsx`, `gridEngine.ts`, `ItemFormatEditor.tsx`, `cards/CardEditor.tsx`, `InventoryPrototype.tsx`;
  - CSS novo da ficha e da bolsa; molduras SVG ao lado das do Resumo;
  - OpenAPI e cliente gerado.
- **Artes:** pinturas que o usuário gera no ChatGPT, com prompts fornecidos na implementação: textura de couro, alça em três partes, mapa enrolado, pingente, tecido e saco de moedas. As molduras continuam em SVG/CSS.
