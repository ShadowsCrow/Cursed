# Spec Delta

## MODIFIED Requirements

### Requirement: Detalhe e ações da carta
Acionar uma carta, por clique, toque ou teclado, SHALL abrir o detalhe num diálogo com a forma de um grimório aberto, cópia fiel da referência aprovada pelo usuário (`referencia/detalhe-grimorio.png`, 2026-09-30):
- moldura dourada com filigrana nos cantos e estrelas no alto e no pé, sobre uma cena de velas quando a pintura existe;
- página da esquerda: a arte da carta num quadro ornamentado e, abaixo, o tipo em versalete e o título;
- página da direita: o texto inteiro num quadro de citação e os dados em quadros de duas colunas, cada um com um ícone num círculo, o rótulo em versalete e o valor.

Os quadros de dados SHALL ser, nesta ordem, os que se aplicam à carta:
- Marcações e Origem;
- Versão e Recebida em;
- Potência de uso e Custo de uso, em habilidades e magias;
- Escola e Grau, nas magias, com o Grau pelo nome (Básica a Lendária); Disciplina e Grau, nas habilidades, só quando definidos;
- os campos do Framework preenchidos, na ordem da ficha de criação do Framework (Tipo, Lançamento, Combo, Persistência, Alcance, Forma, Alvo ou Área, Impactos, Duração, Efeito Principal, Efeitos Secundários, Efeitos Condicionais, Teste, Componentes, Limitações e Escalonamento); campos vazios SHALL NOT aparecer;
- Custo de aprendizado e Descansos mínimos, só para o Narrador;
- os custos adicionais, os requisitos (com o rótulo "Acesso" em habilidades e magias) e, só para o Narrador, o custo legado.

Marcações vazias SHALL aparecer como "Nenhuma". Molduras, quadros, ícones e ornamentos SHALL ser SVG ou CSS. A cena de fundo SHALL ser pintura opcional, sem imagem quebrada quando falta. Em telas estreitas, as duas páginas SHALL ficar uma sobre a outra, sem rolagem horizontal.

As ações de hoje SHALL ficar no detalhe, com as mesmas permissões:
- "Iniciar aprendizado" e "Interromper aprendizado", para quem edita a ficha;
- "Concluir aprendizado", "Migrar para a versão {n}" e "Remover", para o Narrador.

#### Scenario: Jogador inicia um aprendizado
- **WHEN** o jogador abre o detalhe de uma magia disponível e aciona "Iniciar aprendizado"
- **THEN** a magia passa para a seção "Em aprendizado", como antes

#### Scenario: Participante sem permissão
- **WHEN** um participante sem permissão de edição abre o detalhe de uma carta
- **THEN** vê o conteúdo sem nenhum botão de ação

#### Scenario: Teclado
- **WHEN** o jogador foca uma carta e pressiona Enter
- **THEN** o detalhe abre, e ao fechar o foco volta para a carta

#### Scenario: Grimório de uma habilidade
- **WHEN** o jogador abre "Segundo round", concedida pela classe Especialista de Combate
- **THEN** a página da esquerda mostra a arte, "HABILIDADE" e "Segundo round"; a da direita mostra o texto inteiro no quadro de citação e os quadros Marcações, Origem ("Classe: Especialista de Combate - automática"), Versão, Recebida em, Potência de uso e Custo de uso, sem Custo de aprendizado e sem Descansos mínimos

#### Scenario: Magia com campos do Framework
- **WHEN** o jogador abre uma magia Druídica com Alcance "15 metros", Forma "Círculo" e Teste preenchidos, e Combo vazio
- **THEN** a página da direita mostra Escola "Druídica", o Grau pelo nome e os quadros Alcance, Forma e Teste, sem quadro de Combo e sem Custo de aprendizado

#### Scenario: Celular
- **WHEN** o detalhe é aberto numa tela de 375 pixels
- **THEN** a página da arte fica acima da página dos dados, e a página não rola na horizontal
