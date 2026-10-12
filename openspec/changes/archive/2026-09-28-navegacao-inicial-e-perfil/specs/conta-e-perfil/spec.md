# Spec Delta — conta-e-perfil

## Purpose

Permitir que uma pessoa crie a própria conta, entre na plataforma por e-mail e senha ou pelo Google e se apresente às mesas com um apelido e uma foto escolhidos por ela.

## ADDED Requirements

### Requirement: Cadastro por e-mail e senha
A tela de entrada SHALL oferecer a criação de conta com e-mail e senha. A plataforma SHALL exigir a confirmação do e-mail antes do primeiro acesso e SHALL informar, sem revelar se o e-mail já tinha conta, que uma mensagem de confirmação foi enviada.

#### Scenario: Nova conta
- **WHEN** uma pessoa informa e-mail e senha válidos e pede para criar a conta
- **THEN** a plataforma avisa que enviou a confirmação para o e-mail e não abre as mesas até que ele seja confirmado

#### Scenario: E-mail já cadastrado
- **WHEN** alguém tenta criar conta com um e-mail que já tem conta
- **THEN** a plataforma mostra a mesma mensagem de confirmação enviada, sem dizer que o e-mail existe

### Requirement: Entrada por e-mail e senha ou pelo Google
A tela de entrada SHALL permitir entrar com e-mail e senha e com a conta Google. Falhas de entrada SHALL mostrar uma mensagem que não indique se o erro foi no e-mail ou na senha.

#### Scenario: Entrada pelo Google
- **WHEN** a pessoa escolhe "Entrar com Google" e autoriza no Google
- **THEN** ela volta à plataforma já autenticada, no Início (ou no primeiro acesso, se ainda não confirmou o perfil)

#### Scenario: Senha errada
- **WHEN** a pessoa informa uma senha incorreta
- **THEN** a plataforma diz que o e-mail ou a senha não conferem e não cria sessão

### Requirement: Recuperação de senha
A tela de entrada SHALL oferecer "Esqueci minha senha", que envia um link de redefinição ao e-mail informado, sem revelar se o e-mail tem conta. O link SHALL levar a uma tela para escolher a nova senha.

#### Scenario: Redefinição
- **WHEN** a pessoa abre o link de redefinição e escolhe uma nova senha válida
- **THEN** a senha é trocada e ela entra na plataforma

### Requirement: Primeiro acesso
Enquanto a pessoa não confirmou o apelido, a plataforma SHALL mostrar a tela de primeiro acesso antes de qualquer outra seção, com o apelido pré-preenchido a partir da identidade (nome da conta Google ou parte do e-mail) e o envio da foto opcional.

#### Scenario: Confirma o apelido sugerido
- **WHEN** alguém entra pela primeira vez pelo Google e confirma o apelido sugerido sem enviar foto
- **THEN** o perfil é gravado, a pessoa vai ao Início, e o avatar mostra as iniciais do apelido

#### Scenario: Volta depois sem ter confirmado
- **WHEN** a pessoa fecha a tela de primeiro acesso sem confirmar e entra de novo
- **THEN** a tela de primeiro acesso aparece outra vez

### Requirement: Apelido
O apelido SHALL ter de 2 a 40 caracteres depois de retirar espaços das pontas e SHALL ser o nome mostrado dessa pessoa em todas as mesas, participantes, histórico e sala. O apelido escolhido SHALL NOT ser substituído pelo nome vindo da identidade em acessos seguintes. Apelidos iguais entre pessoas diferentes SHALL ser permitidos.

#### Scenario: Apelido muda nas mesas
- **WHEN** a pessoa troca o apelido de "Rique" para "Corvo" no perfil
- **THEN** a lista de participantes das mesas dela passa a mostrar "Corvo"

#### Scenario: Apelido curto demais
- **WHEN** alguém tenta gravar o apelido "R"
- **THEN** a plataforma explica o limite de 2 a 40 caracteres e não grava

### Requirement: Foto do perfil
A pessoa SHALL poder enviar, trocar e remover a própria foto do perfil. Sem foto, o avatar SHALL mostrar as iniciais do apelido sobre um fundo do tema. A foto SHALL ser visível para a própria pessoa e para quem participa de ao menos uma mesa ativa com ela, e para mais ninguém.

#### Scenario: Colega de mesa vê a foto
- **WHEN** a Narradora abre a campanha e um jogador dela tem foto
- **THEN** a foto aparece ao lado do apelido dele

#### Scenario: Pessoa sem mesa em comum
- **WHEN** alguém que não divide mesa com a pessoa tenta abrir a foto dela
- **THEN** o sistema responde como se a imagem não existisse

### Requirement: Página de perfil e saída
O avatar na barra superior SHALL abrir um menu com "Meu perfil" e "Sair". "Meu perfil" SHALL permitir trocar apelido e foto e mostrar o e-mail e o modo de entrada (e-mail ou Google). "Sair" SHALL encerrar a sessão e voltar à tela de entrada.

#### Scenario: Sair
- **WHEN** a pessoa escolhe "Sair" no menu do avatar
- **THEN** a sessão é encerrada, os dados carregados são descartados e a tela de entrada aparece

### Requirement: Modo de desenvolvimento preservado
O modo de desenvolvimento local, que entra escolhendo uma identidade de teste sem Supabase, SHALL continuar funcionando, com perfil, primeiro acesso e navegação iguais aos do login real.

#### Scenario: Identidade de teste
- **WHEN** alguém entra como "jogador-1" no modo de desenvolvimento pela primeira vez
- **THEN** a tela de primeiro acesso aparece com o apelido "Jogador 1" sugerido
