# Spec Delta

## MODIFIED Requirements

### Requirement: Moldura comum das seções
Cada seção da ficha, exceto o Resumo e Informações básicas, que têm folha própria, SHALL ficar sobre pergaminho, dentro de moldura dourada recortada. Ela SHALL abrir com um cabeçalho que tem medalhão com o ícone da seção, título, uma frase curta de subtítulo e, à direita, as ferramentas da seção quando houver. O conteúdo de cada seção SHALL ser o mesmo de antes.

#### Scenario: Aba Atributos
- **WHEN** o jogador abre a aba Atributos
- **THEN** a seção aparece emoldurada, com o medalhão e o título "Atributos", e a tabela de atributos funciona como antes

#### Scenario: Ferramentas da seção
- **WHEN** o jogador abre a aba Inventário
- **THEN** o cabeçalho da seção mostra a busca e o botão "Importar código" à direita do título

## ADDED Requirements

### Requirement: Folha de Informações básicas
A aba Informações básicas SHALL usar a folha de pergaminho do Resumo, com moldura dupla e cantos ornamentados. O cabeçalho da folha SHALL mostrar a etiqueta "IDENTIDADE", o título "Informações básicas" e o subtítulo "Dados fundamentais sobre o personagem.".

Os campos SHALL ficar em dois quadros emoldurados, cada um com título e emblema:
- **Características pessoais**: Nome, Arquétipo, Nível, Altura (m) e Tamanho base;
- **Classificação e origem**: Classe, Raça, Idade, Sexo e Tamanho atual.

Cada campo SHALL ocupar uma linha com ícone decorativo, rótulo, valor e, para quem pode editar aquele campo, o botão "Editar". A edição, as permissões por campo, as consequências das trocas e os avisos do servidor SHALL continuar como antes. O Tamanho base SHALL aparecer sem botão de edição, com a indicação da raça de onde vem.

Quando o arquétipo tiver conceito no catálogo, uma faixa emoldurada SHALL mostrar "Conceito do arquétipo {nome}" e o texto do conceito. Sem conceito, a faixa SHALL não aparecer.

#### Scenario: Jogador abre Informações básicas
- **WHEN** o jogador abre a aba Informações básicas do Lion, Especialista de Combate, Antimago, Elfo
- **THEN** vê o título "Informações básicas", o quadro "Características pessoais" com Nome "Lion" e Arquétipo "Antimago", o quadro "Classificação e origem" com Classe "Especialista de Combate" e Raça "Elfo", e a faixa "Conceito do arquétipo Antimago" com o texto do catálogo

#### Scenario: Edição de um campo
- **WHEN** o jogador aciona "Editar" na linha Raça e escolhe outra raça
- **THEN** a mesma superfície de edição de antes abre, com as cartas que saem e entram, e a troca é salva do mesmo jeito

#### Scenario: Campo só do Narrador
- **WHEN** o jogador abre a aba
- **THEN** as linhas Nível e Tamanho atual mostram o valor sem o botão "Editar", e o Narrador vê o botão nas duas

#### Scenario: Ficha só de leitura
- **WHEN** um jogador abre a ficha de outro personagem em modo de leitura
- **THEN** todas as linhas aparecem sem o botão "Editar"

#### Scenario: Arquétipo sem conceito
- **WHEN** o personagem não tem arquétipo ou o arquétipo não tem conceito no catálogo
- **THEN** a faixa do conceito não aparece

### Requirement: Pinturas e ornamentos da folha de Informações básicas
Cantos, flores, frisos, emblemas e ícones das linhas SHALL ser desenhados em SVG ou CSS, decorativos e ocultos de tecnologias assistivas. A folha SHALL poder mostrar três pinturas opcionais: uma paisagem em sépia no cabeçalho e uma natureza-morta de cada lado da faixa do conceito. Uma pintura que não carregar SHALL desaparecer sem imagem quebrada; sem a paisagem, SHALL aparecer a rosa dos ventos em SVG. O texto SHALL nunca ficar por baixo de uma pintura.

#### Scenario: Pinturas indisponíveis
- **WHEN** nenhuma das pinturas da aba carrega
- **THEN** a folha aparece completa, com moldura, cantos, quadros e a rosa dos ventos, e o texto do conceito ocupa a largura da faixa

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre a aba
- **THEN** lê o título, os títulos dos quadros, os rótulos, os valores e os botões, e nenhum ícone, ornamento ou pintura

### Requirement: Informações básicas em telas estreitas
Na folha de Informações básicas:
- em telas largas, os dois quadros SHALL ficar lado a lado;
- quando a folha tiver menos de 900 pixels, os quadros SHALL se empilhar;
- quando a folha tiver menos de 640 pixels, a paisagem e as pinturas da faixa SHALL ser omitidas.

Nenhuma tela a partir de 360 pixels SHALL ter rolagem horizontal da página.

#### Scenario: Tela de 1440 pixels
- **WHEN** a aba é aberta numa tela de 1440 pixels
- **THEN** os dois quadros aparecem lado a lado, com a mesma altura

#### Scenario: Celular de 375 pixels
- **WHEN** a aba é aberta num celular de 375 pixels
- **THEN** os quadros aparecem empilhados, cada linha mostra rótulo, valor e "Editar" sem sobreposição, e a página não rola na horizontal
