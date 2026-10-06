# Spec Delta

## ADDED Requirements

### Requirement: Deslocamento calculado
A ficha SHALL calcular o **Deslocamento** do personagem, em metros, como um valor de Status, com cada fonte à mostra:
- **base:** o Deslocamento da raça no catálogo; sem raça, ou com raça que não o define, a base é 9 m, como manda `Iniciativa, Movimento e Posicionamento`;
- **itens e efeitos:** a soma dos modificadores com alvo `deslocamento` de itens equipados e de efeitos ativos (inclusive os de magias e habilidades aplicadas), pelo mesmo mecanismo dos demais valores calculados;
- **habilidades do catálogo:** a soma dos bônus de Deslocamento declarados nas habilidades da classe, do arquétipo e da raça do personagem (capacidade `catalogo-de-classes-e-racas`).

O total SHALL NOT ficar abaixo de 0. Modificadores situacionais (com contexto) SHALL aparecer como situacionais, sem entrar no total, como nos demais valores. Reduções como a metade por Sobrecarga, condições e terreno difícil SHALL NOT ser aplicadas por este cálculo.

#### Scenario: Deslocamento da raça
- **WHEN** o personagem é Humano, cuja raça tem Deslocamento 9
- **THEN** o Status mostra Deslocamento 9, com a fonte "Raça: Humano"

#### Scenario: Sem raça
- **WHEN** a ficha não tem raça
- **THEN** o Deslocamento é 9, com a fonte "Padrão das regras"

#### Scenario: Bota que aumenta o Deslocamento
- **WHEN** o personagem equipa um item com um modificador de alvo `deslocamento` e valor 3
- **THEN** o Deslocamento sobe 3 m, e a bota aparece entre as fontes

#### Scenario: Magia ativa
- **WHEN** um efeito ativo de uma magia traz um modificador de alvo `deslocamento` e valor 6
- **THEN** o Deslocamento sobe 6 m enquanto o efeito estiver ativo
