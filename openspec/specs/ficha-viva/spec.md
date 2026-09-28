# Ficha Viva Specification

## Purpose

Transforma a ficha em uma superfície visual de jogo que comunica estado, recursos e consequências com clareza, mantendo edição modular e acessível quando necessária.

## Requirements

### Requirement: Leitura é o estado principal da ficha
A ficha SHALL apresentar informações como conteúdo de jogo e SHALL revelar controles de edição apenas por ação contextual e quando o usuário possuir permissão.

#### Scenario: Jogador abre a própria ficha
- **WHEN** a ficha termina de carregar
- **THEN** o jogador vê retrato, identidade, recursos e estado atual sem uma página dominada por campos de formulário

### Requirement: Seções modulares preservadas
A ficha SHALL oferecer resumo, retrato, informações básicas, personalidade, atributos, perícias, habilidades, equipamentos, inventário, status e efeitos como seções organizáveis sem perder o conteúdo atualmente suportado. O resumo SHALL ser a primeira seção e a seção aberta quando nenhuma outra for indicada.

#### Scenario: Jogador navega entre seções
- **WHEN** o jogador seleciona uma seção da ficha
- **THEN** o sistema mantém o contexto do personagem e apresenta a seção sem exigir recarregamento manual dos dados

#### Scenario: Ficha aberta sem seção indicada
- **WHEN** o jogador abre a ficha sem indicar uma seção
- **THEN** o sistema apresenta a seção de resumo

### Requirement: Efeitos ativos legíveis e acessíveis
O sistema SHALL representar efeitos ativos por ícones distinguíveis e SHALL disponibilizar nome, descrição, origem, duração e condições de encerramento por foco, toque ou acionamento, sem depender apenas de hover.

#### Scenario: Usuário de dispositivo móvel consulta um efeito
- **WHEN** o usuário toca no ícone de um efeito ativo
- **THEN** o sistema abre seus detalhes completos e oferece uma forma clara de fechá-los

### Requirement: Equipamento e inventário visualmente distintos
A ficha SHALL diferenciar itens possuídos de itens equipados e SHALL mostrar efeitos, cargas, quantidades e recursos relevantes sem exigir que o jogador entre em modo de edição.

#### Scenario: Jogador equipa uma arma
- **WHEN** o jogador confirma a ação de equipar uma arma autorizada
- **THEN** a arma passa a ocupar sua apresentação de equipamento e seus efeitos aplicáveis são recalculados com causas visíveis

### Requirement: Automação explicável
Todo valor derivado ou efeito automatizado relevante SHALL permitir que o jogador consulte suas fontes e SHALL evitar ocultar escolhas ou consequências mecânicas.

#### Scenario: Defesa é alterada por equipamento e condição
- **WHEN** o jogador consulta o valor atual de Defesa
- **THEN** o sistema apresenta o valor final e a contribuição identificável de cada fonte aplicável

### Requirement: Importações não ocupam seção permanente
A importação de equipamentos, efeitos ou cartas SHALL ser acessada por ação contextual e apresentada em diálogo ou painel temporário com pré-visualização antes da confirmação.

#### Scenario: Jogador importa um equipamento portátil
- **WHEN** o jogador fornece um código compatível
- **THEN** o sistema exibe conteúdo, origem e impactos antes de permitir adicioná-lo ao destino autorizado
