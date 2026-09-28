# Spec Delta

## Purpose

Dar a cada efeito um ícone estável e reconhecível no estilo visual do jogo, com um ícone padrão para efeitos sem ícone próprio e ícones enviados pelo Narrador para a mesa dele.

## ADDED Requirements

### Requirement: Ícone estável por efeito
Cada efeito SHALL ser exibido sempre com o mesmo ícone na faixa de estado ativo, no painel de efeitos e na lista de efeitos default. O ícone SHALL NOT depender da posição do efeito na lista.

#### Scenario: Mesmo efeito, mesmo ícone
- **WHEN** o personagem tem os efeitos Derrubado e Agarrado, e Derrubado é encerrado
- **THEN** Agarrado continua com o mesmo ícone de antes

### Requirement: Precedência de ícones
O ícone exibido SHALL seguir esta ordem: primeiro o ícone enviado pelo Narrador para aquele efeito na mesa; depois o ícone do catálogo do sistema; por fim o ícone padrão de interrogação.

#### Scenario: Condição sem ícone próprio
- **WHEN** o personagem fica Silenciado, que não tem ícone no catálogo, e o Narrador não enviou ícone
- **THEN** o efeito aparece com o ícone padrão de interrogação

#### Scenario: Narrador personaliza uma condição
- **WHEN** o Narrador envia um ícone para Derrubado na mesa dele
- **THEN** Derrubado passa a usar esse ícone em todas as fichas da mesa, e as outras mesas continuam com o ícone de antes

### Requirement: Ícone padrão do sistema
O sistema SHALL incluir, como ativo próprio, o ícone padrão de interrogação fornecido pelo usuário (moldura dourada, fundo azul-noite). O ícone original do Sobrepeso (`cc_above.png`) SHALL ser preservado como ativo do sistema e SHALL poder representar a Sobrecarga derivada, sem reativar o efeito legado.

#### Scenario: Ícone padrão disponível sem aplicativo antigo
- **WHEN** a plataforma roda sem a pasta do aplicativo antigo
- **THEN** o ícone padrão continua disponível

### Requirement: Envio de ícone pelo Narrador
O Narrador SHALL poder enviar, trocar ou remover o ícone de qualquer efeito da mesa dele, seja efeito default ou personalizado, usando o envio de imagens. O ícone enviado para um efeito default SHALL valer só naquela mesa e SHALL NOT alterar o catálogo do sistema. Jogadores SHALL NOT enviar ícones de efeitos default.

#### Scenario: Narrador remove o ícone personalizado
- **WHEN** o Narrador remove o ícone que tinha enviado para Derrubado
- **THEN** Derrubado volta a usar o ícone do catálogo ou, sem ele, o ícone padrão

### Requirement: Ícone acessível
O ícone SHALL ser complementar ao nome: o nome do efeito SHALL estar disponível como texto para leitores de tela e no detalhe do efeito, e o significado do efeito SHALL NOT depender só da imagem.

#### Scenario: Leitor de tela na faixa de efeitos
- **WHEN** um jogador navega pela faixa de efeitos com leitor de tela
- **THEN** cada ícone é anunciado pelo nome do efeito
