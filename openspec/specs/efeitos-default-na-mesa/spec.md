# Efeitos default na mesa

## Purpose

Deixar à mão, na mesa, os efeitos default do sistema (as condições de `Condições e Tipos de Dano.md`), para que o Narrador os aplique escolhendo de uma lista, sem conhecer códigos internos.

## Requirements

### Requirement: Catálogo de efeitos default consultável
O sistema SHALL listar os efeitos default para os participantes da mesa, com nome, grupo, descrição, modificadores e substituições. As 17 condições SHALL ser agrupadas como em `Condições e Tipos de Dano.md`: abertura e mobilidade, sentidos e comunicação, capacidade, e exposição, controle e dano contínuo. O catálogo SHALL pertencer aos dados da plataforma, com procedência, e SHALL NOT depender da pasta do aplicativo antigo.

#### Scenario: Narrador consulta as condições
- **WHEN** o Narrador abre a lista de efeitos default
- **THEN** vê as 17 condições nos quatro grupos das regras, cada uma com nome, descrição e modificadores

#### Scenario: Catálogo espelha as regras
- **WHEN** a lista de condições do catálogo é comparada com `Condições e Tipos de Dano.md`
- **THEN** os nomes são os mesmos e nenhuma condição sobra ou falta

### Requirement: Aplicação por escolha
Um efeito default SHALL ser aplicado escolhendo-o da lista, vendo nome, descrição e modificadores antes de confirmar. A aplicação SHALL NOT exigir que se digite o código de associação. O efeito aplicado SHALL registrar quem o aplicou.

#### Scenario: Narrador derruba um inimigo
- **WHEN** o Narrador escolhe "Derrubado" na lista e confirma a aplicação num personagem
- **THEN** o efeito Derrubado fica ativo na ficha do personagem com a origem "catálogo do sistema" e entra no histórico

### Requirement: Quem aplica condições
O Narrador SHALL poder aplicar e encerrar efeitos default em qualquer personagem da mesa. O jogador SHALL poder aplicar e encerrar efeitos default no próprio personagem quando a política da mesa permitir que ele edite a ficha, e SHALL NOT aplicá-los em personagens de outros. Efeitos personalizados continuam reservados ao Narrador.

#### Scenario: Jogador marca que caiu
- **WHEN** o jogador aplica "Derrubado" ao próprio personagem numa mesa que permite edição pelo jogador
- **THEN** o efeito fica ativo e o histórico mostra que o jogador o aplicou

#### Scenario: Jogador tenta aplicar em outro personagem
- **WHEN** um jogador tenta aplicar "Agarrado" ao personagem de outro jogador
- **THEN** o sistema recusa a aplicação

#### Scenario: Mesa bloqueia edição do jogador
- **WHEN** a mesa não permite que jogadores editem a ficha e o jogador tenta aplicar uma condição ao próprio personagem
- **THEN** o sistema recusa a aplicação

#### Scenario: Jogador tenta criar efeito personalizado
- **WHEN** um jogador tenta aplicar um efeito que não está no catálogo default
- **THEN** o sistema recusa, porque efeitos personalizados são do Narrador

### Requirement: Substituição entre condições
Quando o catálogo declara que uma condição substitui outra, o sistema SHALL mostrar essa relação antes de aplicar e SHALL encerrar a condição substituída quando a nova for aplicada, registrando as duas operações no histórico.

#### Scenario: Cego substitui Ofuscado
- **WHEN** o personagem está Ofuscado e o Narrador aplica Cego
- **THEN** a tela avisa que Cego substitui Ofuscado; ao confirmar, Ofuscado é encerrado e Cego fica ativo

### Requirement: Efeitos que dependem de regra não vigente
Efeitos default cuja regra de origem não esteja vigente em `rules/sistema` SHALL NOT ser listados nem disparados. O Sobrepeso legado (`cc_above`), que dependia de peso carregado, SHALL permanecer suspenso e fora da lista mesmo depois da publicação da regra de carga em grade. A Sobrecarga dessa regra SHALL ser um efeito derivado distinto, aplicado automaticamente pela grade, sem reativar o Sobrepeso.

#### Scenario: Sobrepeso fora da lista
- **WHEN** o Narrador abre a lista de efeitos default
- **THEN** o Sobrepeso não aparece

#### Scenario: Regra de carga em grade publicada
- **WHEN** a regra de carga em grade está vigente e um item ocupa a área vermelha
- **THEN** a ficha mostra a Sobrecarga derivada, e o Sobrepeso legado continua indisponível para aplicação manual ou automática
