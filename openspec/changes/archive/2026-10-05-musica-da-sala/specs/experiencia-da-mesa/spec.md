# Spec Delta

## ADDED Requirements

### Requirement: Bolsa no painel da Sala
A aba **Bolsa** SHALL ter, no alto, a mesma faixa de retratos da aba Fichas:
- o Narrador vê todos os personagens da mesa e escolhe de quem é a bolsa;
- o jogador vê só os próprios personagens.

Abaixo da faixa, a aba SHALL mostrar o inventário em grade do personagem escolhido, o mesmo da ficha. As regras de ver, arrumar e editar itens SHALL ser as da ficha, com a autorização do servidor.

#### Scenario: Narrador olha a bolsa de um jogador
- **WHEN** o Narrador abre a aba Bolsa e escolhe o retrato de Lion
- **THEN** o inventário em grade de Lion aparece abaixo da faixa

#### Scenario: Jogador só vê a própria bolsa
- **WHEN** o jogador abre a aba Bolsa numa mesa com o personagem dele e o de outro jogador
- **THEN** a faixa mostra só o retrato do próprio personagem, com a bolsa dele

### Requirement: Música no painel da Sala
A aba **Música** SHALL ser o som da mesa, descrito na capacidade `musica-da-sala`: o Narrador escolhe na biblioteca um ambiente e uma música, que tocam juntos, e todos ouvem o mesmo som ao mesmo tempo.

#### Scenario: Música da mesa
- **WHEN** o Narrador abre a aba Música
- **THEN** vê o bloco "Tocando agora", com os quadros Ambiente e Música, e a biblioteca separada em Ambientes e Músicas

## REMOVED Requirements

### Requirement: Bolsa e Música no painel da Sala
**Reason**: A aba Música deixa de ser espaço reservado (mudança `musica-da-sala`). O requisito foi dividido em "Bolsa no painel da Sala", com o mesmo texto e cenários da Bolsa, e "Música no painel da Sala".
**Migration**: Nada a migrar: a Bolsa não muda, e a Música passa a seguir a capacidade `musica-da-sala`.
