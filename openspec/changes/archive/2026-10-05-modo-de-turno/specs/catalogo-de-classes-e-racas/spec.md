# Spec Delta

## ADDED Requirements

### Requirement: Bônus de Deslocamento pelo catálogo
Cada habilidade de classe, arquétipo ou raça no catálogo SHALL poder declarar, de forma opcional, um **bônus de Deslocamento**: um inteiro em metros, diferente de zero, que pode ser positivo ou negativo. O catálogo SHALL recusar um valor que não seja inteiro, ou que seja zero, mantendo a última versão válida. Nenhuma habilidade SHALL receber bônus sem decisão do usuário.

O bônus SHALL valer para todo personagem com aquela classe, arquétipo ou raça, entrando como fonte do Deslocamento calculado (capacidade `calculo-de-valores-da-ficha`).

#### Scenario: Classe veloz
- **WHEN** uma habilidade do Gatuno declara bônus de Deslocamento 3, e o personagem é Gatuno
- **THEN** o Deslocamento dele soma 3 m, com a fonte "Classe: Gatuno — nome da habilidade"

#### Scenario: Valor inválido
- **WHEN** alguém grava bônus de Deslocamento 0 ou "rápido" numa habilidade do JSON
- **THEN** o catálogo recusa a versão nova e continua com a última válida
