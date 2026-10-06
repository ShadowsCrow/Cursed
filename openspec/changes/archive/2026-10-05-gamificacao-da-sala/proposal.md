# Proposal

## Why

A Sala já tem grid, dados 3D e música, mas o jogo ainda não reage aos grandes momentos. Hoje:
- um 20 natural aparece igual a qualquer outro número;
- não há como reagir ao que acontece na cena sem falar por cima de alguém;
- ninguém sabe se está com azar nos dados nem quanto sangrou na campanha;
- o grupo não tem um ritual para reconhecer quem brilhou na sessão.

O usuário pediu (2026-10-04) uma plataforma mais gamificada e aprovou quatro itens na Sala. Junto, pediu que o Chat reservado saia e dê lugar a uma aba própria de cada papel: **Mestre** para o Narrador e **Jogador** para os jogadores.

Classificação: ferramenta da aplicação, com uma parte exclusiva do Narrador (aba Mestre). O item 1 também toca o **núcleo** das regras: a faixa de crítico pode ser ampliada (decisão do usuário, 2026-10-04).

## What Changes

**Abas Mestre e Jogador (no lugar do Chat)**
- Sai a aba **Chat**, que era só um espaço reservado. No mesmo lugar entra a aba **Mestre**, que só o Narrador vê, ou a aba **Jogador**, que os jogadores veem.
- A aba **Jogador** mostra as estatísticas do próprio jogador, da sessão atual e da campanha inteira:
  - vida perdida e vida recuperada nos seus personagens;
  - quantas rolagens fez;
  - quantos críticos e falhas críticas tirou;
  - a "sorte nos dados": se os dados dele estão saindo acima ou abaixo da média esperada.
- A aba **Mestre** reúne os controles do Narrador:
  - iniciar e encerrar a sessão de jogo;
  - ligar o destaque de críticos;
  - mostrar as estatísticas da mesa para todos;
  - abrir e encerrar a votação de MVP;
  - ver as estatísticas de todos os jogadores.

**Sub-abas no painel (pedido do usuário, 2026-10-04)**
- A aba Mestre se divide em sub-abas: Sessão, Preferências, MVP e Estatísticas.
- A aba Cena do Narrador troca as seções que abrem e fecham por sub-abas: Cenas, Personagens e Tokens. O jogador continua vendo só os tokens da cena.

**Sessões de jogo**
- O Narrador inicia e encerra sessões numeradas na aba Mestre. A tabela de sessões já existe, mas nada a usava.
- Rolagens e alterações de vida feitas durante uma sessão ficam ligadas a ela. É isso que separa as estatísticas da sessão das da campanha.

**Item 1. Destaque de críticos**
- O Narrador liga ou desliga o destaque de críticos na aba Mestre. Por padrão, fica desligado.
- Ligado, cada d20 cujo valor natural cai na **faixa de crítico** do personagem ganha destaque para toda a mesa: o dado 3D brilha, a faixa "Crítico!" aparece no tabuleiro e o resultado fica marcado no histórico. Um d20 na **faixa de falha crítica** recebe destaque próprio, com a faixa "Falha crítica!".
- A faixa padrão é a das regras: crítico em 20 natural e falha crítica em 1 natural. Habilidades de classe, arquétipo e raça podem ampliá-la:
  - o crítico pode começar em 19, 18…;
  - a falha crítica pode ir até 2, 3…
- A ampliação vem **só dos catálogos** (`classes.json` e `racas.json`), por um campo opcional nas habilidades. Nenhuma habilidade atual recebe valor; cada valor é decisão do usuário.
- A faixa **não aparece** para os jogadores. Eles só veem o destaque quando ele acontece.
- Uma rolagem sem ficha usa a faixa padrão.
- **BREAKING (spec):** o resultado da rolagem deixa de ser sempre "sem leitura mecânica". Com o destaque ligado, ele passa a indicar crítico e falha crítica no d20. Sucesso, CD e vantagem continuam fora.
- Regras: `rules/sistema/Rolagens.md` ganha um parágrafo dizendo que uma habilidade, classe ou raça pode ampliar as faixas de 20 natural e 1 natural.

**Item 2. Reações**
- No canto inferior direito do grid fica um botão flutuante e discreto de reação. Ele abre uma pequena bandeja com as reações, cada uma com pintura própria gerada pelo Codex.
- Ao escolher uma reação, sobe pelo grid um balãozinho discreto com a figura e o nome de quem reagiu, que some em poucos segundos. É parecido com o Teams, só que mais discreto.
- As reações são passageiras: chegam pelo tempo real da Sala e não ficam guardadas.

**Item 3. Estatísticas da mesa visíveis**
- Na aba Mestre, a chave "Mostrar estatísticas da mesa" faz a aba Jogador de todos ganhar o placar do grupo, com as estatísticas de cada jogador lado a lado. Desligada, cada jogador vê só as próprias.

**Item 4. Votação de MVP**
- O Narrador abre a votação na aba Mestre. Cada jogador vota secretamente em outro jogador e não pode votar em si.
- Enquanto a votação está aberta, o Narrador vê só quantos já votaram. Ao encerrar, todos veem o vencedor, anunciado no tabuleiro.
- Em caso de empate, o Narrador escolhe entre os empatados.
- O MVP não dá bônus mecânico.
- A aba Mestre guarda a lista dos MVPs anteriores.

## Capabilities

### New Capabilities
- `estatisticas-e-mvp-da-mesa`: sessões de jogo, estatísticas por jogador (sessão e campanha), placar visível pelo Narrador e votação de MVP.
- `reacoes-da-sala`: botão de reação no grid e balões passageiros vistos por toda a mesa.

### Modified Capabilities
- `experiencia-da-mesa`: as abas do painel mudam. Sai Chat; entra Mestre ou Jogador, conforme o papel.
- `rolador-de-dados`: o resultado passa a indicar crítico e falha crítica no d20 quando o Narrador liga o destaque, e o dado 3D, o tabuleiro e o histórico mostram esse destaque.
- `catalogo-de-classes-e-racas`: as habilidades do catálogo ganham a ampliação opcional das faixas de crítico e de falha crítica, que vale para quem tem a habilidade.

## Non-goals

- Não cria XP nem forma de ganhar nível: as regras deixam isso em aberto.
- O MVP, as reações e as estatísticas não dão bônus mecânico.
- O destaque de críticos não decide acerto, dano nem efeito. Ele mostra o dado natural, e a consequência segue com o Narrador e as regras.
- Não há ajuste manual da faixa de crítico pelo Narrador (decisão do usuário: só pelos catálogos).
- Não implementa o chat da mesa, que sai do painel e fica fora desta mudança.
- Não muda a física nem o visual base dos dados 3D, só acrescenta o brilho do destaque.
- Não cria conquistas, medalhas, perfil com vitrine nem diário de sessões (ideias não escolhidas desta vez).

## Impact

- **Regras:** `rules/sistema/Rolagens.md` (um parágrafo sobre a ampliação das faixas).
- **Dados:** `cursed_platform/catalogos/classes.json` e `racas.json` aceitam o campo opcional nas habilidades, com leitura em `cursed_platform/catalogos.py`.
- **Banco (migração `0027`, depois da `0026` da música):**
  - preferências da Sala por mesa: destaque de críticos e estatísticas visíveis;
  - `sessao_id` e marcas de crítico nas rolagens;
  - votações e votos de MVP.
- **API:**
  - rotas de sessão (iniciar e encerrar);
  - preferências da Sala;
  - estatísticas (minhas e da mesa);
  - votação (abrir, votar, encerrar, desempatar);
  - o resultado da rolagem passa a trazer as marcas de crítico;
  - novos avisos em tempo real: `sala.preferencias`, `sala.sessao` e `sala.votacao`;
  - OpenAPI e `schema.ts` regenerados.
- **Interface:**
  - `abasDoPainel.ts` e `PainelDaSala.tsx` (sai Chat);
  - novos `MestreDoPainel.tsx` e `JogadorDoPainel.tsx`;
  - destaque no `RoladorDeDados.tsx`, em `dados3d` e no tabuleiro;
  - botão e balões de reação sobre o `RoomCanvas`, pelo canal efêmero (`useRoomEphemera`).
- **Arte:** pinturas das reações e do selo de MVP pelo Codex CLI (`arte-original/` e `public/arte/`).
- **Convivência:** a mudança `musica-da-sala` está ativa e também altera `experiencia-da-mesa`, mas em requisitos diferentes. Ela deve ser arquivada antes desta.
