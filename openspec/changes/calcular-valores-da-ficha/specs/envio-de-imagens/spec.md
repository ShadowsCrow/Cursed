# Spec Delta

## Purpose

Permitir enviar e trocar as imagens da mesa (retrato, itens, efeitos, arte de cartas e mapas de cena) com validação no servidor, armazenamento privado e as permissões já existentes, recuperando o envio de imagens que a ficha original oferecia.

## ADDED Requirements

### Requirement: Pontos de envio
O sistema SHALL permitir enviar ou trocar imagem em:
- retrato do personagem;
- arte de item do inventário;
- ícone de grade de item do inventário ou de carta de item, independente da arte;
- efeito personalizado do personagem;
- arte de carta, inclusive carta de item, no editor do Narrador;
- mapa de uma cena da sala.

Enviar uma nova imagem SHALL substituir a anterior daquele ponto. O sistema SHALL permitir remover a imagem de cada ponto.

#### Scenario: Troca isolada do ícone de grade
- **WHEN** o Narrador troca o ícone de grade de uma carta de item que já tem arte
- **THEN** apenas o ícone de grade é substituído, e a arte permanece disponível

#### Scenario: Jogador envia o retrato
- **WHEN** o jogador envia um PNG como retrato do próprio personagem
- **THEN** o retrato aparece no cabeçalho da ficha para quem pode ler a ficha

#### Scenario: Narrador envia o mapa da cena
- **WHEN** o Narrador envia uma imagem como mapa de uma cena
- **THEN** a sala passa a mostrar o mapa como fundo da grade para os participantes que veem a cena

### Requirement: Validação no servidor
O servidor SHALL aceitar somente PNG, JPEG e WEBP cujo conteúdo corresponda ao formato declarado, dentro de um tamanho máximo por tipo de ponto (retrato, arte de item do inventário, ícone de grade de item ou carta, efeito e ícone de efeito: `5 MB`; arte de carta, inclusive carta de item: `8 MB`; mapa: `15 MB`). Imagens recusadas SHALL gerar uma mensagem que diga o motivo, e nada SHALL ser gravado.

#### Scenario: Arquivo grande demais
- **WHEN** o jogador envia um retrato de `12 MB`
- **THEN** o sistema recusa e informa que o limite do retrato é `5 MB`

#### Scenario: Extensão falsa
- **WHEN** alguém envia um arquivo `.png` cujo conteúdo não é uma imagem PNG
- **THEN** o sistema recusa o envio e não grava nada

### Requirement: Armazenamento privado por visibilidade
As imagens SHALL ser guardadas no armazenamento privado, no espaço de visibilidade do recurso: imagens de personagem no espaço do personagem, conteúdo do Narrador no espaço do Narrador e conteúdo compartilhado no espaço da mesa. A ficha SHALL guardar só a referência à imagem, nunca a imagem codificada. Quem não pode ler o recurso SHALL NOT conseguir ler a imagem.

#### Scenario: Retrato de personagem oculto
- **WHEN** um jogador tenta abrir o retrato de um personagem que o Narrador mantém oculto
- **THEN** o sistema responde como se a imagem não existisse

### Requirement: Permissões de envio
O jogador SHALL enviar imagens do próprio personagem (retrato, arte e ícone de grade de seus itens e efeitos personalizados) somente quando a política da mesa permitir que ele edite a ficha. Arte e ícone de grade de cartas, mapa de cena e demais conteúdos do Narrador SHALL ser enviados somente pelo Narrador.

#### Scenario: Mesa bloqueia edição do jogador
- **WHEN** a mesa não permite que jogadores editem a própria ficha e o jogador tenta trocar o retrato
- **THEN** o sistema recusa o envio

#### Scenario: Jogador tenta enviar mapa
- **WHEN** um jogador tenta enviar o mapa de uma cena
- **THEN** o sistema recusa o envio

### Requirement: Histórico sem a imagem
Toda troca ou remoção de imagem SHALL ser registrada no histórico da mesa, indicando o ponto, o autor e o momento, sem incluir o conteúdo da imagem no evento.

#### Scenario: Troca de retrato no histórico
- **WHEN** o jogador troca o retrato
- **THEN** o histórico mostra "retrato alterado" com autor e horário, sem a imagem

### Requirement: Imagens em tamanho de exibição
Retratos, imagens de itens e ícones SHALL ser entregues em tamanho adequado à exibição, para carregar rápido no celular. A imagem original SHALL ser preservada.

#### Scenario: Ícone grande enviado
- **WHEN** o Narrador envia um ícone de `1254 x 1254` pixels
- **THEN** a ficha mostra o ícone numa versão reduzida, e a original continua guardada
