# biblioteca-do-sistema Specification

## Purpose
Permitir consultar o Cursed dentro da plataforma: uma visão geral para quem chega e os documentos do livro de regras para leitura, sem que a aplicação reescreva ou reinterprete as regras.

## Requirements

### Requirement: Seções da Biblioteca
A Biblioteca SHALL ter um menu lateral com **Visão geral** e **Regras**, e abrir em Visão geral. Em telas pequenas o menu lateral SHALL virar uma lista no topo, sem rolagem horizontal.

#### Scenario: Abrir a Biblioteca
- **WHEN** a pessoa escolhe "Biblioteca" na barra superior
- **THEN** a Visão geral aparece e o item "Visão geral" está destacado no menu lateral

### Requirement: Visão geral
A Visão geral SHALL apresentar o Cursed em texto curto: o que é o jogo, o que o diferencia e como uma campanha começa, com links para os documentos de regras em que cada ponto se baseia. O texto SHALL resumir o livro de regras sem criar, alterar nem adiantar regra, e SHALL ser aprovado pelo usuário antes de publicar.

#### Scenario: Link para a regra
- **WHEN** a pessoa segue o link "Exaustão e Estresse" na Visão geral
- **THEN** o documento correspondente abre em Regras

### Requirement: Leitura das regras
Regras SHALL listar os documentos do livro de regras publicados e mostrar cada um formatado (títulos, listas, tabelas, ênfase), só para leitura, com índice das seções do documento. O conteúdo SHALL ser o mesmo dos documentos do repositório na versão publicada da plataforma, sem edição manual no caminho. Documentos que não são regras (planejamento, arquivos que não são texto) SHALL NOT aparecer.

#### Scenario: Tabela legível
- **WHEN** a pessoa abre "Carga"
- **THEN** as tabelas do documento aparecem como tabelas, legíveis também a 360 px com rolagem só dentro da tabela

#### Scenario: Documento atualizado
- **WHEN** um documento de `rules/sistema` muda e a plataforma é publicada de novo
- **THEN** Regras mostra o texto novo sem outra alteração
