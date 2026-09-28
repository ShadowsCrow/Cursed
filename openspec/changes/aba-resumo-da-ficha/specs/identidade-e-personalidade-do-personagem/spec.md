# Spec Delta

## MODIFIED Requirements

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
