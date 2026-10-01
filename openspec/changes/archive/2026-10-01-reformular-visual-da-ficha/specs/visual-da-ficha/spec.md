# Spec Delta

## Purpose

Dar à ficha do personagem, fora do Resumo, a aparência ornamentada da nova estética: cabeçalho com retrato e recursos, faixa de estado, barra de abas com ícones e moldura comum às seções, sem mudar o que cada seção faz.

## ADDED Requirements

### Requirement: Cabeçalho ornamentado da ficha
Em todas as seções da ficha, exceto no Resumo, que já traz identidade e recursos, o topo SHALL mostrar um cabeçalho na paleta noturna, com moldura dourada recortada e uma ilustração de fundo. Ele SHALL conter:
- o retrato do personagem dentro de moldura ornamentada;
- classe e raça, com a cor da classe como complemento do nome escrito;
- o nome do personagem em fonte de exibição;
- as etiquetas de arquétipo e idade, quando existirem;
- um quadro de Pontos de Vida e Pontos de Propósito, com o atual, o máximo e uma barra.

Quem pode editar a ficha SHALL ver, junto ao retrato, as ações de trocar e remover o retrato. Os valores e ações do cabeçalho SHALL ser os mesmos de antes.

#### Scenario: Jogador abre o Inventário
- **WHEN** o jogador abre a aba Inventário da própria ficha
- **THEN** o topo mostra o retrato emoldurado, "Especialista de Combate · Elfo", o nome, as etiquetas e o quadro com PV 25/25 e PP 6/6, sobre o fundo ilustrado

#### Scenario: Personagem sem retrato
- **WHEN** o personagem não tem retrato enviado
- **THEN** a moldura mostra o retrato ilustrativo padrão, sem imagem quebrada

#### Scenario: Ficha só de leitura
- **WHEN** um jogador abre a ficha de outro personagem em modo de leitura
- **THEN** o cabeçalho aparece completo, sem as ações de trocar e remover o retrato

### Requirement: Faixa de estado com ícones
Abaixo do cabeçalho, a faixa de estado SHALL mostrar:
- Exaustão e Estresse em placas com ícone, valor, limite e faixa atual escrita;
- Esforço como botão destacado, para quem pode usá-lo;
- os Efeitos ativos ou a palavra "Nenhum".

O estado SHALL continuar comunicado por texto, e não só por cor. As ações existentes da faixa SHALL continuar disponíveis.

#### Scenario: Estresse pressionado
- **WHEN** o personagem está com Estresse 5 de 10 na faixa Pressionado
- **THEN** a placa de Estresse mostra o ícone, "5/10" e "Pressionado" escrito

#### Scenario: Nenhum efeito ativo
- **WHEN** o personagem não tem efeitos ativos
- **THEN** a faixa mostra "Efeitos ativos" seguido de "Nenhum"

### Requirement: Barra de abas com ícones
Cada uma das dez seções SHALL ter, na barra de abas, um ícone decorativo e o nome escrito. A aba ativa SHALL se destacar como placa dourada e SHALL ser identificável também por forma ou peso do texto, e não só por cor. Quando as abas não couberem na largura, a barra SHALL rolar na horizontal dentro de si, sem rolar a página, e SHALL manter a aba ativa visível. A navegação por teclado e a semântica de abas SHALL continuar como antes.

#### Scenario: Tela de 1440 pixels
- **WHEN** a ficha é aberta numa tela de 1440 pixels de largura
- **THEN** as dez abas aparecem numa só fileira, cada uma com ícone e nome

#### Scenario: Celular
- **WHEN** a ficha é aberta num celular de 375 pixels e a aba ativa é "Inventário"
- **THEN** a barra de abas rola na horizontal, a aba Inventário está visível e a página não tem rolagem horizontal

#### Scenario: Teclado
- **WHEN** o jogador foca a barra de abas e pressiona a seta para a direita
- **THEN** o foco vai para a próxima aba, que fica visível na barra

### Requirement: Moldura comum das seções
Cada seção da ficha, exceto o Resumo, SHALL ficar sobre pergaminho, dentro de moldura dourada recortada. Ela SHALL abrir com um cabeçalho que tem medalhão com o ícone da seção, título, uma frase curta de subtítulo e, à direita, as ferramentas da seção quando houver. O conteúdo de cada seção SHALL ser o mesmo de antes.

#### Scenario: Aba Atributos
- **WHEN** o jogador abre a aba Atributos
- **THEN** a seção aparece emoldurada, com o medalhão e o título "Atributos", e a tabela de atributos funciona como antes

#### Scenario: Ferramentas da seção
- **WHEN** o jogador abre a aba Inventário
- **THEN** o cabeçalho da seção mostra a busca e o botão "Importar código" à direita do título

### Requirement: Ornamentos da ficha em SVG e CSS
Molduras, cantos, chanfros e frisos da ficha SHALL ser desenhados em SVG ou CSS e SHALL esticar com o conteúdo, sem distorcer os cantos. Pinturas SHALL ser usadas só como ilustração: fundo do cabeçalho, couro e laterais pintadas da bolsa do inventário. Ornamentos e pinturas SHALL ser decorativos, ocultos de tecnologias assistivas e sem capturar cliques. Sem uma pintura, SHALL restar um fundo liso coerente, sem imagem quebrada.

#### Scenario: Pintura indisponível
- **WHEN** a ilustração de fundo do cabeçalho não carrega
- **THEN** o cabeçalho mostra o fundo noturno liso com a moldura, e todo o conteúdo continua legível

#### Scenario: Leitor de tela no cabeçalho
- **WHEN** um leitor de tela percorre o cabeçalho
- **THEN** lê o nome, a classe, a raça, as etiquetas e os recursos, e nenhum ornamento

### Requirement: Ficha ornamentada no celular
Em telas de até 760 pixels:
- o cabeçalho SHALL empilhar retrato e identidade acima do quadro de recursos;
- a faixa de estado SHALL quebrar em linhas;
- ornamentos que ocupem espaço necessário ao conteúdo SHALL ser simplificados ou omitidos.

Nenhuma tela a partir de 360 pixels SHALL ter rolagem horizontal da página.

#### Scenario: Cabeçalho num celular de 360 pixels
- **WHEN** a ficha é aberta numa tela de 360 pixels
- **THEN** retrato, nome e recursos aparecem empilhados, sem sobreposição e sem rolagem horizontal
