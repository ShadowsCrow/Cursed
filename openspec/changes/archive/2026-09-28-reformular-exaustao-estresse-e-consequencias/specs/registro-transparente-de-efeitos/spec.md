# Registro Transparente de Efeitos

## Purpose

Definir uma experiência de ficha digital em que desgaste e efeitos sejam rápidos de alterar, fáceis de compreender, rastreáveis até sua origem e administráveis sem duplicar cálculos ou esconder consequências do jogador e do mestre.

## ADDED Requirements

### Requirement: Resumo visível de desgaste

A ficha SHALL exibir Exaustão e Estresse com valor atual, valor máximo, nome da faixa atual e consequências ativas. Ela SHALL também informar o próximo limiar e as consequências de alcançá-lo, sem depender apenas de cor.

#### Scenario: Consultar estado atual

- **WHEN** a ficha de um personagem com 9 de Exaustão e 7 de Estresse é exibida
- **THEN** ela mostra Exaustão 9/15 no estado Exausto e Estresse 7/10 no estado Abalado
- **AND** apresenta as penalidades derivadas de ambas as faixas

#### Scenario: Informação não depende de cor

- **WHEN** a interface usa cores para diferenciar faixas
- **THEN** cada faixa também possui nome, valor e descrição textual ou ícone acompanhado de rótulo

### Requirement: Alteração rápida com prévia

A ficha SHALL permitir ganhos e reduções rotineiras de Exaustão ou Estresse em no máximo duas interações de confirmação. Antes de persistir uma alteração, ela SHALL mostrar valor anterior, valor resultante, mudança de faixa, efeitos derivados que entram ou saem e qualquer colapso ou consequência persistente que será criado.

#### Scenario: Aumento muda a faixa

- **WHEN** o usuário solicita aumentar Exaustão de 8 para 9
- **THEN** a prévia informa a passagem de Cansado para Exausto e a mudança das penalidades
- **AND** a alteração somente é persistida após confirmação

#### Scenario: Alteração não muda a faixa

- **WHEN** o usuário solicita reduzir Estresse de 8 para 7
- **THEN** a prévia informa que o estado permanece Abalado
- **AND** não apresenta efeitos inexistentes como se fossem alterados

#### Scenario: Prévia de colapso

- **WHEN** uma alteração levará Estresse a 10
- **THEN** a prévia informa que ocorrerá Colapso Mental e que um Trauma relacionado deverá ser criado ou intensificado

### Requirement: Origem obrigatória e preenchimento contextual

Toda alteração de desgaste e todo efeito aplicado SHALL possuir uma origem identificável. Cartas, equipamentos, habilidades, classes e efeitos do sistema SHALL preencher automaticamente sua origem quando iniciarem a alteração. Em uma alteração manual, o mestre SHALL informar uma descrição curta ou selecionar uma origem disponível.

#### Scenario: Alteração iniciada por carta

- **WHEN** uma carta de magia aplica 2 de Estresse
- **THEN** o registro identifica automaticamente a carta como origem

#### Scenario: Alteração manual do mestre

- **WHEN** o mestre adiciona Exaustão por uma marcha não representada por outro objeto do sistema
- **THEN** ele registra uma origem como “Marcha forçada” antes de confirmar

### Requirement: Efeitos derivados possuem fonte única

Efeitos de faixa de Exaustão e Estresse SHALL ser calculados a partir dos valores atuais e não SHALL ser persistidos como cópias editáveis. A interface SHALL impedir que o mesmo efeito derivado seja aplicado novamente como efeito manual.

#### Scenario: Entrar em faixa cria efeito derivado apenas uma vez

- **WHEN** a Exaustão passa de 8 para 9
- **THEN** a ficha passa a exibir o efeito derivado da faixa Exausto
- **AND** nenhuma cópia é adicionada à lista de efeitos persistentes

#### Scenario: Valor muda após reabrir a ficha

- **WHEN** uma ficha salva com 9 de Exaustão é reaberta
- **THEN** a penalidade de Exausto é recalculada a partir do valor salvo
- **AND** não depende de um segundo registro manual

### Requirement: Ciclos de vida distintos para efeitos

A ficha SHALL distinguir pelo menos três ciclos de vida: derivado, vinculado e aplicado. Um efeito derivado SHALL existir enquanto sua condição calculada for verdadeira; um efeito vinculado SHALL existir enquanto sua origem, como um equipamento, permanecer ativa; e um efeito aplicado SHALL persistir até ser tratado, removido ou encerrado conforme sua regra.

#### Scenario: Efeito vinculado a equipamento

- **WHEN** uma armadura que concede um efeito é desequipada
- **THEN** seu efeito vinculado deixa de ficar ativo
- **AND** o histórico da alteração não é apagado

#### Scenario: Trauma aplicado persiste

- **WHEN** a fonte imediata de um Trauma deixa a cena
- **THEN** o Trauma continua registrado como efeito aplicado até cumprir sua condição própria

### Requirement: Registro estruturado de consequências persistentes

Todo Trauma, Ferimento Grave e Sequela aplicado SHALL possuir identificador estável, categoria, nome, descrição, origem, gatilho quando aplicável, consequência mecânica ou ficcional, estado de tratamento e regra de recuperação. Imagem e observações MAY ser registradas, mas não SHALL ser obrigatórias.

#### Scenario: Criar Trauma após colapso

- **WHEN** um Colapso Mental cria um Trauma
- **THEN** a ficha solicita ou preenche os campos necessários antes de concluir o registro
- **AND** associa o Trauma ao evento de colapso que o originou

#### Scenario: Consultar efeito persistente

- **WHEN** o usuário abre um Ferimento Grave
- **THEN** consegue identificar por que ele está ativo, o que ele causa e como seu tratamento progride

### Requirement: Administração explícita pelo mestre

O mestre SHALL poder criar, editar, intensificar, mitigar, encerrar e remover efeitos aplicados. Ajustes manuais SHALL exigir uma justificativa curta e SHALL ser registrados no histórico, incluindo o estado anterior e o resultante.

#### Scenario: Mestre intensifica Trauma existente

- **WHEN** um novo colapso corresponde a um Trauma existente
- **THEN** o mestre pode intensificar o registro existente
- **AND** o histórico relaciona a intensificação ao novo colapso

#### Scenario: Correção manual

- **WHEN** o mestre corrige um Ferimento Grave registrado incorretamente
- **THEN** a ficha preserva no histórico o valor anterior, o valor novo e a justificativa

### Requirement: Histórico e desfazer seguro

A ficha SHALL manter um histórico cronológico das alterações de Exaustão, Estresse e efeitos aplicados, contendo data ou ordem, origem, valor anterior, valor resultante e efeitos criados ou alterados. O usuário SHALL poder desfazer a alteração confirmada mais recente quando seus efeitos ainda puderem ser revertidos localmente sem invalidar alterações posteriores.

#### Scenario: Desfazer alteração simples

- **WHEN** o usuário adiciona por engano 2 de Exaustão e nenhuma alteração posterior depende desse evento
- **THEN** ele pode desfazer a operação
- **AND** o valor e os efeitos derivados retornam ao estado anterior

#### Scenario: Desfazer colapso com efeito criado

- **WHEN** a alteração mais recente causou um colapso e criou um Trauma
- **THEN** desfazer a alteração também remove ou restaura o Trauma produzido pela mesma transação

#### Scenario: Reversão insegura

- **WHEN** uma alteração posterior depende do evento que seria desfeito
- **THEN** a ficha impede o desfazer direto
- **AND** orienta o mestre a fazer uma correção manual rastreável

### Requirement: Compatibilidade com fichas e efeitos existentes

Ao carregar uma ficha anterior à mudança, a aplicação SHALL inicializar Exaustão e Estresse com valores seguros e SHALL preservar efeitos externos já cadastrados. Efeitos legados que contenham apenas nome, descrição e imagem SHALL continuar visíveis e editáveis, mesmo sem os novos campos estruturados.

#### Scenario: Abrir ficha antiga sem trilhas

- **WHEN** uma ficha sem campos de Exaustão e Estresse é carregada
- **THEN** ambas as trilhas são inicializadas em 0
- **AND** os demais dados da ficha permanecem inalterados

#### Scenario: Abrir efeito externo legado

- **WHEN** um efeito legado possui apenas nome, descrição e imagem
- **THEN** ele continua sendo exibido com esses dados
- **AND** a aplicação permite completar os novos metadados sem exigir conversão destrutiva

### Requirement: Estado persistido de forma consistente

Valores de desgaste, efeitos aplicados e histórico SHALL sobreviver ao ciclo de salvar e carregar uma ficha. A serialização SHALL usar valores padrão para campos ausentes e SHALL ignorar extensões desconhecidas sem corromper os dados reconhecidos.

#### Scenario: Salvar e reabrir

- **WHEN** uma ficha com desgaste e consequências persistentes é salva e reaberta
- **THEN** os valores, origens, estados de tratamento e eventos de histórico reconhecidos são restaurados

#### Scenario: Campo opcional desconhecido

- **WHEN** uma ficha contém um campo adicional não reconhecido em um efeito estruturado
- **THEN** o carregamento dos campos reconhecidos não falha

