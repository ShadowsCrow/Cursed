# Calibração da carga em grade (carga-por-espacos 2.1)

Sessão de teste no protótipo `/preview/inventario` (sem servidor, nada é salvo). **Números aprovados pelo usuário
em 2026-09-27**; são eles que vão para `rules/sistema` (tarefas 2.2 e 2.3).

## Como testar

1. Abrir o protótipo e escolher Força e Tamanho.
2. Carregar um kit (Guerreiro, Mago, Ladino) e observar: cabe? entra em sobrecarga? sobra item fora da grade?
3. Mudar os "Números da regra" (linhas base e colunas por Tamanho) até o resultado parecer certo para a campanha.
4. Criar itens livres para testar dimensões, mochilas e o companheiro desmaiado (inteiro e com ajuda).
5. Anotar abaixo o que foi aprovado e o motivo. Em "Exportar números" o protótipo mostra os valores atuais.

Primeira leitura: com os números provisórios, o **Guerreiro Médio de Força 3 ocupa 24 de 20 células**, entra em
sobrecarga e ainda deixa as Provisões fora da grade. A grade, as peças ou as duas precisam de ajuste.

## Decisões

### 1. Tamanho da grade

| Parâmetro | Provisório | Aprovado | Motivo |
| --- | --- | --- | --- |
| Linhas | 2 + Força atual | 2 + Força atual | Mantido |
| Colunas — Minúsculo | 2 | 2 | Um aventureiro Médio de Força 3 leva o kit da classe com pouca folga |
| Colunas — Pequeno | 3 | 4 | Um aventureiro Médio de Força 3 leva o kit da classe com pouca folga |
| Colunas — Médio | 4 | 5 | Um aventureiro Médio de Força 3 leva o kit da classe com pouca folga |
| Colunas — Grande | 6 | 7 | Um aventureiro Médio de Força 3 leva o kit da classe com pouca folga |
| Colunas — Enorme | 8 | 9 | Um aventureiro Médio de Força 3 leva o kit da classe com pouca folga |
| Colunas — Colossal | 10 | 11 | Um aventureiro Médio de Força 3 leva o kit da classe com pouca folga |
| Linhas vermelhas extras | 1 | 1 | Mantido |

Perguntas guia: um aventureiro comum (Médio, Força 2 ou 3) deve levar o kit da classe e ainda ter espaço para
algum saque? Quem tem Força 1 deve sentir a carga desde o início?

### 2. Dimensões típicas por tipo de item

São sugestões iniciais do editor; o Narrador pode mudar em cada item. Aprovar ou ajustar a referência.

| Tipo | Provisório | Aprovado |
| --- | --- | --- |
| Peitoral (leve / pesado) | 2 x 2 / 2 x 3 | 2 x 2 / 2 x 3 |
| Capacete | 2 x 2 (kit do ladino usa 1 x 1) | 1 x 1 |
| Luvas | 1 x 1 | 1 x 1 |
| Botas | 1 x 2 | 1 x 2 |
| Arma de uma mão (adaga / espada) | 1 x 2 / 1 x 3 | 1 x 2 / 1 x 3 |
| Arma de duas mãos (arco / cajado, montante) | 1 x 3 / 1 x 4 | 1 x 3 / 1 x 4 |
| Escudo | 2 x 2 | 2 x 2 |
| Aljava | 1 x 2 | 1 x 2 |
| Odre, tocha | 1 x 2 | 1 x 2 |
| Provisões (3 dias) | 2 x 1 | 2 x 1 |
| Poção, ferramentas, bolsa de componentes | 1 x 1 | 1 x 1 |

### 3. Mochilas

| Mochila | Ampliação | Requisito de Força | Dimensão | Aprovado |
| --- | --- | --- | --- | --- |
| Bolsa de cintura | +1 coluna | 0 | 1 x 1 | Aprovada |
| Mochila de viagem | +1 linha | 2 | 2 x 2 | Aprovada |
| Mochila de expedição | +2 linhas | 3 | 2 x 3 | Aprovada |
| Cesto de carga | +2 linhas e +1 coluna | 4 | 3 x 3 | Aprovada |

### 4. Aljava

| Parâmetro | Provisório | Aprovado |
| --- | --- | --- |
| Tamanho na grade | 1 x 2 | 1 x 2 |
| Capacidade de flechas | 20 | Definida em cada aljava na criação (sem número fixo no livro) |

### 5. Moedas

| Parâmetro | Provisório | Aprovado |
| --- | --- | --- |
| Moedas por pilha | 100 | Configuração da campanha, ajustada pelo Narrador (a primeira configuração parametrizável da campanha); a plataforma sugere 100 numa mesa nova |

### 6. Já decidido (não recalibrar sem nova decisão)

- Corpos: Minúsculo 2 x 3, Pequeno 3 x 4, Médio 4 x 5, Grande 5 x 7; com ajuda, metade da altura arredondada
  para cima (2 x 2, 3 x 2, 4 x 3, 5 x 4). Ficam como itens padrão que o Narrador concede.
- Sobrecarga em um só nível, com as consequências aprovadas na proposta.
- Um item só é levado quando está colocado na grade; entrar e sair da bandeja fica no Registro.

## Registro da sessão

- Data: 2026-09-27
- Participantes: usuário (Narrador) e agente
- Números aprovados: `{"linhasBase": 2, "colunasPorTamanho": {"minusculo": 2, "pequeno": 4, "medio": 5, "grande": 7, "enorme": 9, "colossal": 11}}`
- Observações: com os números antigos, o Guerreiro Médio de Força 3 ocupava 24 de 20 células. Com 5 colunas e o elmo
  1 x 1, ele ocupa 23 de 25. Ajustes feitos durante a sessão: mochilas com modelos prontos e substituição da equipada,
  largar itens, giro que procura encaixe e moedas adicionadas ou retiradas sem escolher a pilha.
