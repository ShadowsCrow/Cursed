# Spec Delta

## MODIFIED Requirements

### Requirement: Pilhas e moedas
Itens do tipo Outros SHALL poder empilhar numa célula até o limite definido na criação. Os demais tipos SHALL NOT empilhar. As moedas são padrão do sistema em **três tipos: cobre, prata e ouro** (a platina deixou de existir por decisão do usuário em 2026-09-28). Uma pilha de moedas SHALL poder misturar tipos até o limite de moedas por pilha definido nas configurações da campanha. O sistema SHALL NOT converter moedas entre tipos.

#### Scenario: Moedas mistas
- **WHEN** a mesa define 100 moedas por pilha e o personagem tem 40 de cobre, 95 de prata e 12 de ouro
- **THEN** as 147 moedas ocupam 2 células, e o total por tipo continua visível

#### Scenario: Platina não existe
- **WHEN** o Narrador ou o jogador tenta registrar moedas de platina
- **THEN** não há esse tipo de moeda, e só cobre, prata e ouro podem ser registrados
