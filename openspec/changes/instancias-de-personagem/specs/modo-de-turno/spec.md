# Spec Delta

## MODIFIED Requirements

### Requirement: Entrar no meio da disputa
Com o modo turno aberto (na fase de iniciativa ou durante a disputa), cada token com personagem que o Narrador põe na cena ativa SHALL entrar como participante novo, sem iniciativa (decisões do usuário, 2026-10-05):
- de um personagem que ainda não participa, ele entra como o grupo da ficha;
- de uma ficha que já participa (por exemplo, outro Goblin), ele SHALL jogar sozinho, com iniciativa, vez e saldo próprios. Na barra, os nomes repetidos ganham número: "Goblin", "Goblin 2", "Goblin 3".

A partir daí:
- o dono do personagem SHALL ver o aviso "Role iniciativa"; o Narrador rola pelos NPCs e monstros, como no começo;
- o Próximo turno SHALL ficar bloqueado até ele rolar;
- quando rolar, ele SHALL entrar na posição do seu resultado, e a vez atual SHALL continuar com o mesmo participante.

Quem saiu da mesa e volta SHALL rolar de novo (decisão do usuário, 2026-10-06): um token posto depois de o grupo da ficha sair todo da cena SHALL entrar como participante próprio, sem iniciativa, e o grupo antigo SHALL ficar fora da barra e ser pulado. Um token que jogava sozinho e sai da cena SHALL ficar fora da barra e ser pulado, sem travar o Próximo turno. A entrada SHALL ficar no registro da mesa e chegar à Sala de todos sem recarregar. Com modelo e instâncias, cada "Colocar" de um modelo é uma criatura nova, com participante e iniciativa próprios.

#### Scenario: Monstro chega no meio da disputa
- **WHEN** na rodada 2, vez de Lion, o Narrador põe na cena o token de um Lobo que não participava
- **THEN** o Lobo aparece na barra como "falta rolar", o Próximo turno trava, e a vez continua com Lion

#### Scenario: Jogador chega no meio da disputa
- **WHEN** o Narrador põe na cena o token do personagem de Bia durante a disputa
- **THEN** Bia vê o aviso "Role iniciativa", e, depois que ela rola, o personagem entra na posição do resultado e o Próximo turno destrava

#### Scenario: Outro token da mesma ficha
- **WHEN** com dois Goblins da mesma ficha na disputa desde o começo, o Narrador põe mais um Goblin
- **THEN** a barra mostra "Goblin (×2)" e "Goblin 2", que falta rolar; o Próximo turno trava até o Goblin 2 rolar, e ele tem a vez e o Deslocamento próprios

#### Scenario: Saiu da mesa e voltou
- **WHEN** o Narrador retira o único token do Ogro da cena e depois põe outro token do Ogro
- **THEN** o Ogro novo entra como "falta rolar", sem a iniciativa antiga, e o Próximo turno trava até ele rolar
