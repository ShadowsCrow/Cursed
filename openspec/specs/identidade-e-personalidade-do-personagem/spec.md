# Identidade e personalidade do personagem

## Purpose

Completar as informações básicas e a personalidade da ficha com os campos e as listas fixas da ficha original, validados no servidor, para que o personagem tenha a mesma identidade narrativa que tinha antes.

## Requirements

### Requirement: Informações básicas completas
A ficha SHALL ter, além de nome, classe, arquétipo e raça:
- **Idade**: inteiro maior ou igual a `0`, podendo ficar vazia.
- **Sexo**: uma das opções `Masculino`, `Feminino` ou `Outro`, podendo ficar vazio. A lista vem do mesmo JSON de dados do sistema das listas de personalidade.

A raça SHALL ser escolhida do catálogo de raças.

#### Scenario: Jogador preenche idade e sexo
- **WHEN** o jogador informa idade `27` e sexo `Feminino` e salva
- **THEN** a ficha mostra os dois valores e o histórico registra a alteração

#### Scenario: Idade negativa
- **WHEN** alguém tenta gravar idade `-3`
- **THEN** o sistema recusa a gravação e informa que a idade não pode ser negativa

#### Scenario: Sexo fora da lista pela API
- **WHEN** uma gravação tenta registrar o sexo "Indefinido"
- **THEN** o sistema recusa a gravação e informa as opções válidas

### Requirement: Alinhamento e Pecado Capital em listas fixas
A personalidade SHALL ter:
- **Alinhamento**: uma das 9 opções `Leal | Bom`, `Neutro | Bom`, `Caótico | Bom`, `Leal | Neutro`, `Neutro | Neutro`, `Caótico | Neutro`, `Leal | Mal`, `Neutro | Mal`, `Caótico | Mal`.
- **Pecado Capital**: uma das 7 opções Ira, Gula, Ganância, Luxúria, Inveja, Preguiça e Orgulho, exibida com o ícone correspondente da ficha original.

O servidor SHALL recusar valores fora dessas listas. A grafia antiga `Ganancia` SHALL ser aceita como equivalente a `Ganância`.

As listas de sexo, alinhamento e pecado (com os ícones e as grafias equivalentes) SHALL vir de um arquivo JSON de dados do sistema, lido pelo servidor e pela tela, e SHALL NOT ser repetidas em código. Elas são iguais para todas as mesas.

#### Scenario: Lista alterada no JSON
- **WHEN** o usuário troca no JSON o ícone do pecado Ira e salva o arquivo
- **THEN** a ficha passa a mostrar o novo ícone para Ira, sem mudança de código

#### Scenario: Escolha de pecado
- **WHEN** o jogador escolhe o pecado Orgulho
- **THEN** a ficha mostra "Orgulho" com seu ícone

#### Scenario: Ficha migrada com grafia antiga
- **WHEN** o jogador abre uma ficha migrada com o pecado `Ganancia`
- **THEN** a ficha mostra "Ganância" sem aviso de valor inválido

### Requirement: Campos narrativos de personalidade
A personalidade SHALL ter os campos de texto Coisa favorita, O que odeia, Quando me veem pensam que, Manias ou hábitos, Vivo para, Meu lema, Medo ou fobia, Valor inquebrável, Religião ou crença e **História**. Cada campo SHALL mostrar uma dica de preenchimento (a da ficha original, quando existia). Esses campos são narrativos e SHALL NOT ter efeito mecânico.

A História SHALL ser um texto longo, opcional, com quebras de parágrafo preservadas e limite de `4000` caracteres; o servidor SHALL recusar gravações acima do limite, informando-o. A lista de campos, suas dicas, qual deles é longo e o limite SHALL vir do mesmo JSON de dados do sistema das listas de personalidade.

#### Scenario: Dados migrados aparecem
- **WHEN** o jogador abre uma ficha migrada que tinha "Medo ou fobia: aranhas gigantes"
- **THEN** o campo Medo ou fobia mostra "aranhas gigantes"

#### Scenario: Campo vazio com dica
- **WHEN** o campo Vivo para está vazio
- **THEN** o campo mostra a dica "Ex: proteger os inocentes" sem gravá-la como valor

#### Scenario: Jogador escreve a História
- **WHEN** o jogador escreve dois parágrafos na História, na aba Personalidade, e salva
- **THEN** a ficha guarda o texto com a quebra de parágrafo, o histórico registra a alteração como "História" e o Resumo passa a mostrá-lo

#### Scenario: História acima do limite
- **WHEN** uma gravação tenta registrar uma História com `4001` caracteres
- **THEN** o sistema recusa a gravação e informa o limite de `4000` caracteres

#### Scenario: História na criação guiada
- **WHEN** o jogador está na etapa Personalidade do assistente de criação
- **THEN** a História aparece como campo opcional, com a mesma dica e o mesmo limite

### Requirement: Valores antigos fora das listas
Fichas existentes com sexo, alinhamento ou pecado fora das listas SHALL continuar legíveis, com o valor original visível e sinalizado para correção. O sistema SHALL NOT trocar o valor automaticamente, e gravações que não alterem esse campo SHALL ser aceitas.

#### Scenario: Alinhamento escrito à mão
- **WHEN** uma ficha migrada tem o alinhamento "caótico e bondoso"
- **THEN** a ficha mostra o texto original com o aviso de fora da lista e oferece escolher uma das 9 opções

### Requirement: Permissões e histórico dos novos campos
Os novos campos SHALL seguir as permissões de edição da mesa, incluindo campos bloqueados e campos que exigem aprovação, e SHALL ser registrados no histórico de auditoria com rótulos legíveis.

#### Scenario: Campo que exige aprovação
- **WHEN** a mesa exige aprovação para a idade e o jogador altera a idade
- **THEN** a alteração vira um pedido pendente para o Narrador, como os demais campos
