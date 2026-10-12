# navegacao-da-plataforma Specification

## Purpose
Dar à plataforma uma entrada própria antes da mesa: uma barra de navegação superior e um Início que apresentam o Cursed e levam às campanhas, aos personagens e à biblioteca sem pedir que a pessoa escolha um papel.

## Requirements

### Requirement: Barra de navegação superior
Depois de entrar, toda seção fora da mesa SHALL mostrar uma barra superior com a marca do Cursed à esquerda, as seções **Início**, **Campanhas**, **Personagens** e **Biblioteca**, nesta ordem, e o avatar da pessoa à direita. A seção atual SHALL ser indicada por mais de um sinal além da cor (sublinhado e estado anunciado a leitores de tela). A marca SHALL levar ao Início.

#### Scenario: Seção atual
- **WHEN** a pessoa está em Campanhas
- **THEN** o item "Campanhas" aparece sublinhado e é anunciado como página atual

#### Scenario: Tela pequena
- **WHEN** a largura da tela é de 360 px
- **THEN** as seções ficam num menu recolhido acessível pelo teclado, sem rolagem horizontal da página

### Requirement: Sem escolha de papel antes das campanhas
A plataforma SHALL NOT pedir que a pessoa se declare Narradora ou jogadora ao entrar. O papel SHALL continuar pertencendo a cada mesa e só aparecer em Campanhas.

#### Scenario: Conta nova
- **WHEN** uma pessoa confirma o primeiro acesso
- **THEN** ela vai direto ao Início, sem pergunta sobre papel

### Requirement: Início
O Início SHALL mostrar uma ilustração de abertura com título e texto curtos, um botão principal vermelho **Criar campanha** e um botão secundário **Gestão de mesas**, e atalhos para Campanhas, Personagens e Biblioteca. **Gestão de mesas** SHALL levar a Campanhas. **Criar campanha** SHALL pedir o nome da campanha e, ao criar, tornar a pessoa Narradora dela e abri-la em Campanhas.

#### Scenario: Criar campanha pelo Início
- **WHEN** a pessoa escolhe "Criar campanha", informa "Sombras de Vigrad" e confirma
- **THEN** a campanha é criada com ela como Narradora e aparece selecionada em Campanhas, na lista Narrando

#### Scenario: Gestão de mesas
- **WHEN** a pessoa escolhe "Gestão de mesas"
- **THEN** a plataforma abre Campanhas

### Requirement: Endereços das seções
Cada seção e cada item selecionado SHALL ter endereço próprio, de modo que recarregar a página, voltar no navegador ou compartilhar o link mantenha a seção e a seleção. Endereços de mesa, ficha e criação de personagem já existentes SHALL continuar funcionando.

#### Scenario: Recarregar com campanha selecionada
- **WHEN** a pessoa recarrega a página com uma campanha selecionada em Campanhas
- **THEN** a mesma campanha continua selecionada

#### Scenario: Link antigo da mesa
- **WHEN** alguém abre um link `/mesas/{id}` salvo antes desta mudança
- **THEN** a mesa abre como antes

### Requirement: Caminho de volta da mesa
A mesa, a ficha e o assistente de criação SHALL oferecer um caminho de volta para a campanha em Campanhas.

#### Scenario: Sair da mesa
- **WHEN** o jogador escolhe voltar às campanhas dentro da mesa
- **THEN** Campanhas abre com aquela campanha selecionada, na lista Jogando

### Requirement: Estética da referência
As seções fora da mesa SHALL seguir a estética das imagens de referência (`platform/frontend/exemplo`): fundo noturno, molduras douradas ornamentadas em painéis e cartões, títulos serifados, botão principal vermelho, superfícies de pergaminho para leitura, sobre os tokens e componentes do tema existente. Ornamentos SHALL ser decorativos e ocultos para leitores de tela, e o contraste de texto SHALL atender ao mínimo de 4,5:1.

#### Scenario: Leitor de tela no Início
- **WHEN** um leitor de tela percorre o Início
- **THEN** ele anuncia título, botões e atalhos, e não anuncia molduras nem ilustrações decorativas
