# Spec Delta

## Purpose

Dar à plataforma uma identidade visual de fantasia sombria (noite, dourado envelhecido, pergaminho e molduras ornamentadas) definida por um tema reutilizável, sem perder legibilidade, acessibilidade nem o uso em telas pequenas.

## ADDED Requirements

### Requirement: Tema definido por tokens
A aparência SHALL ser definida por um conjunto único de tokens de tema (cores, tipografia, espaçamento, raios, sombras, molduras e movimento), e as telas SHALL usá-los em vez de valores de cor fixos. O tema SHALL ter uma paleta noturna para a moldura da aplicação (fundo escuro, dourado envelhecido para destaques, vermelho profundo para ações principais e para o estado ativo) e uma paleta de pergaminho para superfícies de leitura de conteúdo. Telas ainda não migradas SHALL herdar os tokens e continuar legíveis e funcionais.

#### Scenario: Mudar um token muda a plataforma
- **WHEN** o valor do token do dourado de destaque é alterado
- **THEN** todos os destaques dourados da moldura, do assistente e da ficha mudam juntos, sem edição por tela

#### Scenario: Tela não migrada
- **WHEN** o Narrador abre uma tela que ainda não foi redesenhada, como a auditoria
- **THEN** ela usa as cores e fontes do novo tema, com todo o texto legível e todos os controles operáveis

### Requirement: Tipografia serifada com alternativa
Títulos, nomes de personagem e rótulos de seção SHALL usar uma fonte serifada de exibição; textos corridos e campos SHALL usar uma fonte de leitura de alta legibilidade. Cada fonte SHALL ter alternativas do sistema, de modo que a interface permaneça legível e sem deslocamento de layout relevante quando a fonte principal não carregar ou estiver bloqueada.

#### Scenario: Fonte não carrega
- **WHEN** a fonte de exibição não pode ser carregada (rede bloqueada)
- **THEN** os títulos aparecem em uma fonte serifada do sistema e nenhum texto fica invisível ou cortado

### Requirement: Superfícies de pergaminho para leitura
Conteúdo que o jogador lê ou edita por mais tempo (o assistente de criação e as seções da ficha) SHALL ser apresentado sobre superfície de pergaminho com texto escuro, e a moldura da aplicação (barra lateral, cabeçalho, diálogos de sistema) SHALL permanecer na paleta noturna. A separação entre as duas SHALL ser visível por moldura ornamentada, e o texto SHALL cumprir o contraste do requisito seguinte em ambas.

#### Scenario: Ficha sobre pergaminho
- **WHEN** o jogador abre a ficha de um personagem
- **THEN** as seções (Informações básicas, Atributos, Perícias e demais) aparecem sobre pergaminho dentro da moldura noturna, com o nome do personagem em fonte de exibição

#### Scenario: Assistente sobre pergaminho
- **WHEN** o jogador abre o assistente de criação
- **THEN** o conteúdo das etapas aparece sobre pergaminho e a lista de etapas na moldura noturna

### Requirement: Contraste, foco e estados sem depender de cor
Todo texto e todo controle SHALL ter contraste mínimo de `4,5:1` (texto normal) e `3:1` (texto grande e limites de controles) sobre a superfície em que aparecem, em ambas as paletas, inclusive em estados desabilitado e de erro quando o texto for informativo. Todo elemento interativo SHALL ter indicador de foco visível em ambas as paletas. Estado ativo, erro, aviso e sucesso SHALL ser comunicados também por texto ou ícone, e não somente por cor. A cor da classe SHALL continuar sendo apenas complemento ao nome escrito.

#### Scenario: Contraste sobre pergaminho
- **WHEN** um campo de texto e seu rótulo são exibidos sobre pergaminho
- **THEN** a razão de contraste entre texto e fundo é de pelo menos `4,5:1`

#### Scenario: Foco visível
- **WHEN** o jogador navega pelo assistente com a tecla Tab
- **THEN** o elemento em foco tem um indicador visível tanto sobre o pergaminho quanto sobre a moldura noturna

#### Scenario: Erro sem depender de cor
- **WHEN** um campo tem valor inválido
- **THEN** a mensagem de erro aparece em texto junto ao campo, além de qualquer mudança de cor

### Requirement: Ornamentos são decorativos
Molduras, filigranas, cantos e demais ornamentos SHALL ser decorativos: SHALL NOT carregar informação, SHALL ficar ocultos de tecnologias assistivas, SHALL NOT capturar foco nem cliques e SHALL NOT reduzir a área útil dos controles. Ilustrações de destaque (fundos, retratos, banners) SHALL ter alternativa visual quando ausentes, sem espaço vazio quebrado.

#### Scenario: Ficha sem retrato nem ilustração
- **WHEN** o personagem não tem retrato enviado
- **THEN** o cabeçalho mostra o retrato ilustrativo com iniciais dentro da moldura, sem imagem quebrada

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre a ficha
- **THEN** não anuncia ornamentos e lê apenas o conteúdo e os controles

### Requirement: Marca da plataforma
O emblema do Cursed SHALL ser a marca da plataforma e SHALL aparecer de forma consistente na barra lateral, na aba do navegador (ícone), na tela de entrada e nos estados de carregamento e de erro de página. Em tamanhos pequenos (ícone da aba e barra lateral recolhida) SHALL ser usada uma versão simplificada que permaneça reconhecível, e em tamanhos grandes a versão detalhada. O nome "CURSED" SHALL ser texto real da interface, e SHALL NOT fazer parte de nenhuma imagem. Sem a imagem da marca, a interface SHALL mostrar o nome em texto, sem imagem quebrada. Contornos semitransparentes da imagem SHALL NOT deixar halo de cor sobre nenhum fundo do tema.

#### Scenario: Ícone da aba
- **WHEN** o usuário abre qualquer página da plataforma
- **THEN** a aba mostra a versão simplificada do emblema, legível em `16` pixels

#### Scenario: Emblema sobre fundo escuro e sobre pergaminho
- **WHEN** o emblema é exibido sobre a moldura noturna e, em outro momento, sobre pergaminho
- **THEN** não há halo avermelhado nem contorno claro nas bordas em nenhum dos dois

#### Scenario: Imagem da marca indisponível
- **WHEN** a imagem do emblema não carrega
- **THEN** a barra lateral mostra o nome "CURSED" em texto e nenhum ícone de imagem quebrada

### Requirement: Movimento respeitoso
Animações do tema (brilhos, transições de etapa, realces) SHALL ser curtas e SHALL ser desativadas ou reduzidas a mudança instantânea quando o sistema do usuário pedir movimento reduzido. Nenhuma informação SHALL depender de animação para ser percebida.

#### Scenario: Movimento reduzido
- **WHEN** o usuário tem a preferência de movimento reduzido ativa e avança de etapa no assistente
- **THEN** a troca de etapa acontece sem animação e o foco vai para o título da nova etapa

### Requirement: Telas pequenas
A moldura, o assistente e a ficha SHALL ser utilizáveis, sem rolagem horizontal da página, em telas de `360` pixels de largura. Ornamentos SHALL ser simplificados ou omitidos quando ocuparem espaço necessário ao conteúdo.

#### Scenario: Ficha no celular
- **WHEN** a ficha é aberta numa tela de `360` pixels de largura
- **THEN** o conteúdo cabe sem rolagem horizontal e os ornamentos não sobrepõem texto nem controles

### Requirement: Comportamento existente preservado
A mudança de aparência SHALL NOT alterar o comportamento, as permissões, as mensagens de regra, a ordem de tabulação nem os dados de nenhuma tela: a ficha, o inventário em grade, as cartas, os efeitos e a sala SHALL funcionar como antes.

#### Scenario: Ficha antes e depois
- **WHEN** o mesmo personagem é aberto antes e depois da mudança
- **THEN** os mesmos valores, avisos, seções e ações estão disponíveis, apenas com a nova aparência

#### Scenario: Inventário em grade
- **WHEN** o jogador arrasta um item na grade de carga
- **THEN** o encaixe, os limites, a área de sobrecarga e os cálculos são os mesmos de antes
