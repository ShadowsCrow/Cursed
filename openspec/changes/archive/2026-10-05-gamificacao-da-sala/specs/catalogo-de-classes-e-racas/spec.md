# Spec Delta

## ADDED Requirements

### Requirement: Ampliação das faixas de crítico pelo catálogo
Cada habilidade de classe, arquétipo ou raça no catálogo SHALL poder declarar, de forma opcional:
- uma **ampliação da faixa de crítico**: um inteiro positivo de quantos valores a faixa desce a partir de 20;
- uma **ampliação da faixa de falha crítica**: um inteiro positivo de quantos valores a faixa sobe a partir de 1.

O catálogo SHALL recusar valor que não seja inteiro positivo, mantendo a última versão válida, como em qualquer erro do catálogo. Nenhuma habilidade SHALL receber ampliação sem decisão do usuário. Sem ampliação declarada, nada muda.

A faixa de um personagem SHALL ser calculada pelo servidor:
- **início do crítico** = 20 − a soma das ampliações de crítico das habilidades do catálogo que o personagem tem como cartas;
- **fim da falha crítica** = 1 + a soma das ampliações de falha crítica dessas habilidades.

O início do crítico SHALL NOT ficar abaixo de 2, e o fim da falha crítica SHALL NOT passar de 19. Só contam cartas de habilidade do catálogo que o personagem tem e que não foram arquivadas; outras cartas não ampliam a faixa.

A ampliação SHALL NOT aparecer no texto, nos campos nem nas respostas das cartas para os jogadores, nem em nenhuma tela de jogador. Ela vale só para o destaque de críticos (capacidade `rolador-de-dados`).

#### Scenario: Habilidade que amplia o crítico
- **WHEN** uma habilidade do Gatuno no catálogo declara ampliação de crítico 1, e o personagem é Gatuno
- **THEN** o crítico desse personagem começa em 19

#### Scenario: Ampliações se somam
- **WHEN** o personagem tem duas habilidades do catálogo, uma com ampliação de crítico 1 e outra com 1
- **THEN** o crítico dele começa em 18

#### Scenario: Ampliação de falha crítica
- **WHEN** a habilidade de uma raça declara ampliação de falha crítica 1
- **THEN** a falha crítica dos personagens dessa raça vai de 1 a 2

#### Scenario: Troca de classe tira a ampliação
- **WHEN** o personagem troca de classe e perde a carta da habilidade que ampliava o crítico
- **THEN** o crítico dele volta a começar em 20

#### Scenario: Valor inválido no catálogo
- **WHEN** alguém grava ampliação de crítico 0 ou "duas" numa habilidade do JSON
- **THEN** o catálogo recusa a versão nova e continua com a última válida

#### Scenario: Jogador não vê a faixa
- **WHEN** o jogador abre a carta da habilidade que amplia o crítico, ou a própria ficha
- **THEN** não aparece nenhum número de faixa de crítico
