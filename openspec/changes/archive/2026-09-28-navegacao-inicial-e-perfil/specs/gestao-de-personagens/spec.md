# Spec Delta — gestao-de-personagens

## ADDED Requirements

### Requirement: Cópia de personagem para outra mesa
O Narrador de uma mesa SHALL poder criar nela uma cópia de um personagem de outra mesa (ou da mesma), desde que possa ler a origem como proprietário do personagem de jogador ou como Narrador da mesa de origem. A cópia SHALL:
- ser uma ficha nova e independente na mesa de destino, sem proprietário jogador, sob controle do Narrador e oculta até que ele a revele;
- ter o tipo NPC quando a origem é personagem de jogador ou NPC, e monstro quando a origem é monstro;
- levar a ficha da origem (identidade, personalidade, raça, classe e arquétipo, nível, Atributos, Perícias e demais campos da ficha) e uma cópia do retrato;
- começar com PV e PP atuais iguais aos máximos (quando calculáveis), sem efeitos, sem Desgaste nem Consequências, sem inventário e sem cartas obtidas por oferta; as cartas de classe, arquétipo e raça SHALL ser concedidas como em qualquer criação de ficha;
- passar pela mesma validação da criação de NPCs e monstros pelo Narrador (que, por decisão de 2026-09-27, não aplica os limites de personagem), sem que o servidor altere valores mecânicos para caber;
- registrar a procedência (mesa e personagem de origem) e entrar no histórico da mesa de destino.

A origem SHALL permanecer inalterada, e alterações posteriores em uma SHALL NOT afetar a outra.

#### Scenario: Cópia de personagem de jogador
- **WHEN** o Narrador da mesa B copia o próprio personagem de jogador da mesa A
- **THEN** a mesa B ganha um NPC oculto com a mesma ficha e retrato, PV e PP cheios, sem itens nem efeitos, e o histórico de B registra a cópia com a procedência

#### Scenario: Origem sem acesso
- **WHEN** alguém tenta copiar um NPC de uma mesa em que não é Narrador
- **THEN** o servidor responde como se o personagem não existisse e nada é criado

#### Scenario: Valores fora do padrão preservados
- **WHEN** a ficha de origem tem um Atributo `7`, acima do limite de personagem
- **THEN** a cópia, como NPC, mantém o Atributo `7` sem ajuste
