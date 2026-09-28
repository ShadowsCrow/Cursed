# Spec Delta — envio-de-imagens

## MODIFIED Requirements

### Requirement: Pontos de envio
O sistema SHALL permitir enviar ou trocar imagem em:
- retrato do personagem;
- arte de item do inventário;
- ícone de grade de item do inventário ou de carta de item, independente da arte;
- efeito personalizado do personagem;
- arte de carta, inclusive carta de item, no editor do Narrador;
- mapa de uma cena da sala;
- capa da campanha;
- foto do perfil da pessoa.

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

#### Scenario: Narradora envia a capa
- **WHEN** a Narradora envia uma imagem como capa da campanha
- **THEN** a capa aparece na lista de campanhas e na abertura da campanha para todos os participantes

### Requirement: Validação no servidor
O servidor SHALL aceitar somente PNG, JPEG e WEBP cujo conteúdo corresponda ao formato declarado, dentro de um tamanho máximo por tipo de ponto (retrato, arte de item do inventário, ícone de grade de item ou carta, efeito, ícone de efeito e foto do perfil: `5 MB`; arte de carta, inclusive carta de item, e capa da campanha: `8 MB`; mapa: `15 MB`). Imagens recusadas SHALL gerar uma mensagem que diga o motivo, e nada SHALL ser gravado.

#### Scenario: Arquivo grande demais
- **WHEN** o jogador envia um retrato de `12 MB`
- **THEN** o sistema recusa e informa que o limite do retrato é `5 MB`

#### Scenario: Extensão falsa
- **WHEN** alguém envia um arquivo `.png` cujo conteúdo não é uma imagem PNG
- **THEN** o sistema recusa o envio e não grava nada

## ADDED Requirements

### Requirement: Capa da campanha e foto do perfil
A capa da campanha SHALL ser guardada no espaço da mesa, enviada e removida somente pelo Narrador, e legível por todos os participantes ativos da mesa; a troca SHALL entrar no histórico da mesa sem a imagem. A foto do perfil SHALL ser guardada no espaço da própria pessoa, enviada e removida somente por ela, e legível por ela e por quem participa de ao menos uma mesa ativa com ela; a troca SHALL NOT entrar no histórico de nenhuma mesa. Ambas SHALL ser entregues em tamanho de exibição, preservando a original.

#### Scenario: Jogador tenta trocar a capa
- **WHEN** um jogador tenta enviar a capa da campanha
- **THEN** o sistema recusa o envio

#### Scenario: Foto de outra pessoa
- **WHEN** alguém tenta enviar ou remover a foto do perfil de outra pessoa
- **THEN** o sistema recusa e nada muda
