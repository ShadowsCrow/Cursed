# Proposal

## Why

As regras já dizem que uma Cena de Disputa usa Rodadas, Turnos e Iniciativa (`Turnos e Ações.md` e `Iniciativa, Movimento e Posicionamento.md`). Na Sala, porém, a ordem da disputa fica de cabeça ou num papel:
- cada jogador rola a iniciativa num lugar diferente;
- o Narrador soma e desempata à mão;
- ninguém vê de quem é a vez nem em que rodada a mesa está.

O usuário pediu (2026-10-04) um "modo turno" como o do Baldur's Gate 3. O Narrador entra no modo, todos rolam iniciativa, e uma barra com os retratos em ordem mostra de quem é a vez.

Classificação: ferramenta da aplicação que representa regras do **núcleo** (Iniciativa, Rodadas e Turnos). Não muda nenhuma regra. O controle do modo é do Narrador.

## What Changes

**Entrar em modo turno**
- Na Sala, o Narrador ganha "Entrar em modo turno". Só funciona com uma sessão em andamento (capacidade `estatisticas-e-mvp-da-mesa`, mudança `gamificacao-da-sala`) e com uma cena ativa que tenha personagens.
- Entram na ordem todos os personagens com token na cena ativa:
  - os personagens dos jogadores;
  - os NPCs e monstros.
- Tokens sem personagem, como objetos, ficam de fora. Os tokens de uma mesma ficha que estão na cena ao entrar rolam uma vez só e ficam juntos na ordem, como a regra permite para um grupo de criaturas idênticas. Um token posto depois, com o modo turno aberto, rola e joga sozinho (decisão do usuário, 2026-10-05).

**Teste de iniciativa**
- Ao entrar no modo, cada jogador vê o aviso "Role iniciativa", com um botão por personagem dele na ordem.
- O teste é `1d20 + Raciocínio + Prontidão`, conforme a regra:
  - o servidor sorteia e soma os valores da ficha;
  - os dados 3D rolam no tabuleiro;
  - a rolagem entra no histórico da aba Dados, marcada como iniciativa.
- O Narrador rola pelos NPCs e monstros, um a um ou todos de uma vez. As rolagens deles saem ocultas dos jogadores.
- O Narrador vê quem já rolou e quem falta, e pode rolar por um jogador que demorar.
- O Narrador pode "Começar a disputa" antes de todos rolarem. Quem ainda não rolou fica no fim da fila até rolar, e então entra na posição do seu resultado.
- Empates são desfeitos pelo servidor, como manda a regra: maior Raciocínio, depois maior Prontidão e, por fim, nova rolagem só entre os ainda empatados.

O modo turno serve para qualquer Cena de Disputa (batalha, perseguição, debate, competição…), e não só para combate (decisão do usuário, 2026-10-04). Por isso a interface fala em "disputa": "Começar a disputa". Os nomes internos (o estado `combate`, as tabelas `turn_combats` e `turn_participants`) ficam como estão.

**Barra de ordem estilo BG3**
- Durante a disputa, uma faixa no topo do grid mostra:
  - os retratos na ordem de iniciativa;
  - a vez atual em destaque;
  - o contador "Rodada N".
- O Narrador avança com "Próximo turno". Depois do último, a vez volta ao primeiro e a rodada aumenta.
- Os jogadores não veem os NPCs e monstros com token oculto nem os totais de iniciativa deles. Cada jogador vê o próprio total.
- Quem não tem mais token na cena ativa sai da barra e é pulado.
- O Narrador encerra com "Sair do modo turno". Encerrar a sessão também encerra o modo turno.
- Entrar, começar, avançar e sair entram no registro da mesa e chegam à Sala de todos sem recarregar.

**Deslocamento no modo turno (pedido do usuário, 2026-10-04)**
- O **Deslocamento** passa a ser um valor calculado da ficha, em Status, com as fontes à mostra:
  - a base é o Deslocamento da raça; quando nada o define, vale 9 m, como manda a regra;
  - somam-se os bônus de itens equipados e de efeitos ativos (magias e habilidades aplicadas) com alvo `deslocamento`;
  - somam-se também os bônus que as habilidades de classe, arquétipo e raça declararem no catálogo.

  Nenhuma habilidade atual recebe valor; cada valor é decisão do usuário.
- Durante a disputa, o jogador só move o token do seu personagem **na própria vez**, até o Deslocamento.
- Cada passo para uma casa vizinha custa 1 m, inclusive na diagonal (decisão do usuário, registrada nas regras). O servidor recusa o movimento que passar do saldo.
- O saldo volta no começo de cada vez daquele personagem.
- Na própria vez, o jogador pode **Correr**: troca a Ação Padrão por outro movimento, e o saldo do turno dobra.
- A barra mostra quanto falta ("Deslocamento: 4 de 9 m").
- O Narrador move tudo sem limite.

## Capabilities

### New Capabilities
- `modo-de-turno`: entrar e sair do modo turno, o teste de iniciativa de todos os participantes da cena, o desempate pela regra, a ordem e a vez, as rodadas e a barra de ordem na Sala.

### Modified Capabilities
- `calculo-de-valores-da-ficha`: o Deslocamento entra nos valores calculados (Status), com a base da raça e os bônus.
- `catalogo-de-classes-e-racas`: as habilidades do catálogo ganham o bônus opcional de Deslocamento.
- A rolagem de iniciativa usa a rolagem pela ficha que já existe (capacidade `rolador-de-dados`), com Raciocínio e Prontidão como parcelas, e só ganha a marca "Iniciativa" no histórico, coberta pela capacidade nova.

## Non-goals

- O Deslocamento não aplica sozinho reduções e condições: a metade por Sobrecarga, o Derrubado e o terreno difícil (que custa 2 m por metro) ficam com o Narrador, que move sem limite.
- Não há régua nem prévia do caminho ao arrastar; o custo é o da casa de origem até a de destino.
- O jogador não encerra a própria vez; quem avança é o Narrador.
- Não há "voltar turno", reordenar a fila nem tirar alguém dela (opções não escolhidas desta vez). Quem chega no meio da disputa entra sim (decisão do usuário, 2026-10-05).
- Não controla Ações (Padrão, Movimento, Bônus), Reações, Surpresa nem efeitos com duração em rodadas.
- Não muda nenhuma regra de `rules/sistema`.

## Impact

- **Dependência:** a mudança `gamificacao-da-sala`, pelas sessões de jogo. As migrações desta mudança (`0028`, `0029` e `0030`) vêm depois da `0027`.
- **Banco:** tabelas da disputa e dos participantes, com a ordem, os resultados, o desempate, a vez e a rodada; e uma marca de iniciativa na rolagem.
- **API:**
  - rotas de entrar, rolar iniciativa (própria, do Narrador por alguém e de todos os NPCs), começar, próximo turno e sair;
  - leitura do estado da disputa, filtrada por quem vê;
  - aviso em tempo real `sala.turno`;
  - OpenAPI e `schema.ts` regenerados.
- **Interface:**
  - botão "Entrar em modo turno" para o Narrador;
  - aviso "Role iniciativa" para os jogadores;
  - painel da fase de iniciativa para o Narrador;
  - barra de ordem no topo do grid;
  - marca "Iniciativa" no histórico da aba Dados.
- **Arte:** nenhuma pintura nova; a barra usa os retratos dos personagens.
