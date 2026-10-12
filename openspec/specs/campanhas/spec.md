# campanhas Specification

## Purpose
Reunir numa só seção as campanhas que a pessoa narra e as que joga, com capa, sinopse e sistema, para escolher uma, conhecê-la e entrar na mesa dela.

## Requirements

### Requirement: Campanha é a mesa apresentada
Cada campanha SHALL corresponder a uma mesa existente, com os mesmos participantes, papéis e permissões. Toda mesa ativa em que a pessoa participa SHALL aparecer como campanha, inclusive as criadas antes desta mudança.

#### Scenario: Mesa antiga
- **WHEN** a pessoa abre Campanhas e participa de uma mesa criada antes desta mudança
- **THEN** a mesa aparece como campanha, com a capa padrão, sistema "Cursed" e sem sinopse

### Requirement: Alternância Narrando e Jogando
O topo da barra lateral SHALL oferecer a alternância entre **Narrando** (campanhas em que a pessoa é Narradora) e **Jogando** (campanhas em que é jogadora), com a quantidade de cada lado. A alternância SHALL abrir no lado da campanha selecionada; sem seleção, no último lado usado, e sem histórico no lado que tiver campanhas (Narrando se houver nos dois).

#### Scenario: Pessoa só joga
- **WHEN** alguém que só participa como jogador abre Campanhas pela primeira vez
- **THEN** a lista Jogando aparece selecionada

#### Scenario: Troca de lado
- **WHEN** a pessoa escolhe "Jogando"
- **THEN** a lista mostra só as campanhas em que ela é jogadora

### Requirement: Lista lateral
Cada item da lista SHALL mostrar a capa em miniatura, o nome e o sistema da campanha, e o item selecionado SHALL ficar destacado por mais que a cor. No lado Narrando, o fim da lista SHALL ter **Nova campanha**; no lado Jogando, **Entrar com convite**. Sem campanhas no lado escolhido, a lista SHALL explicar o que fazer.

#### Scenario: Entrar com convite
- **WHEN** o jogador escolhe "Entrar com convite", cola um código válido e confirma
- **THEN** ele passa a participar da mesa como jogador e a campanha aparece selecionada no lado Jogando

#### Scenario: Convite inválido
- **WHEN** o código está expirado ou não existe
- **THEN** a plataforma explica que o convite está indisponível e nada muda

### Requirement: Campanha selecionada
À direita da lista, a campanha selecionada SHALL mostrar a capa como faixa de abertura, o nome, o sistema, a sinopse, os personagens visíveis para a pessoa (retrato e nome) e os participantes (foto ou iniciais e apelido), e o botão **Entrar na mesa**, que abre a mesa. O que cada pessoa vê de personagens SHALL respeitar as permissões e a visibilidade já existentes. As abas internas por papel SHALL ficar fora desta mudança.

#### Scenario: Jogador não vê NPC oculto
- **WHEN** um jogador seleciona uma campanha em que o Narrador tem um NPC oculto
- **THEN** o NPC não aparece entre os personagens da campanha

#### Scenario: Entrar na mesa
- **WHEN** a pessoa escolhe "Entrar na mesa"
- **THEN** a mesa da campanha abre, com o papel dela naquela mesa

#### Scenario: Jogador sem personagem
- **WHEN** o jogador seleciona uma campanha em que ainda não tem personagem e a mesa permite criação própria
- **THEN** a campanha oferece "Criar personagem", que abre o assistente de criação

### Requirement: Dados da campanha
A campanha SHALL ter nome (obrigatório, até 200 caracteres), sinopse (opcional, até 2.000 caracteres), capa (imagem opcional) e sistema. Somente o Narrador SHALL editar nome, sinopse e capa. O sistema SHALL ser "Cursed" em toda campanha nesta versão e SHALL NOT ser editável; valores diferentes SHALL ser recusados pelo servidor. Sem capa enviada, SHALL aparecer a capa padrão do tema.

#### Scenario: Narrador edita a sinopse
- **WHEN** a Narradora grava uma nova sinopse
- **THEN** jogadores da campanha passam a ver a nova sinopse, e a alteração entra no histórico da mesa

#### Scenario: Jogador tenta editar
- **WHEN** um jogador tenta alterar o nome da campanha
- **THEN** o servidor recusa e nada muda

### Requirement: Convites pela campanha
No lado Narrando, a campanha selecionada SHALL permitir gerar um código de convite para jogadores, com a validade já existente.

#### Scenario: Gerar convite
- **WHEN** a Narradora escolhe "Convidar jogadores"
- **THEN** a plataforma mostra um código de convite para copiar e a validade dele
