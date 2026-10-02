# editor-de-cartas Specification

## Purpose
Define como o Narrador cria e edita uma carta da mesa: numa etapa só, com a carta ao vivo ao lado, salvamento automático, validação junto de cada campo e um único gesto de publicação.

## Requirements

### Requirement: Criação numa etapa só
"Nova carta" SHALL abrir direto o editor, sem uma etapa anterior para tipo e título. O tipo SHALL ser escolhido no próprio editor, entre Habilidade, Magia, Item e Efeito, e o título SHALL ser editado na própria carta. A carta SHALL ser criada no servidor só no primeiro salvamento, que acontece quando o título deixa de estar vazio. Fechar o editor antes disso SHALL NOT deixar rascunho no catálogo.

#### Scenario: Narrador cria uma habilidade
- **WHEN** o Narrador clica em "Nova carta", mantém o tipo Habilidade e escreve o título "Passo Leve"
- **THEN** a carta aparece com esse título na página da esquerda, e o rascunho é criado e salvo sem nenhum outro clique

#### Scenario: Narrador desiste
- **WHEN** o Narrador abre "Nova carta", troca o tipo para Item e fecha o editor sem escrever o título
- **THEN** nenhuma carta nova aparece na biblioteca da mesa

### Requirement: Tipo trocável até a primeira publicação
Enquanto a carta nunca tiver sido publicada, o Narrador SHALL poder trocar o tipo. Os campos comuns (título, texto, requisitos, tags e arte) SHALL ser mantidos. Entre Habilidade e Magia, os campos do Framework comuns às duas também SHALL ser mantidos, e o Grau e os Descansos Mínimos SHALL ser recalculados pelas faixas do novo tipo. Se a troca descartar valores próprios do tipo anterior, o sistema SHALL pedir confirmação antes. Depois da primeira publicação, o tipo SHALL ficar fixo, e o servidor SHALL recusar a troca.

#### Scenario: Troca de Magia para Habilidade
- **WHEN** o Narrador troca o tipo de um rascunho de Magia, com Escola "Elemental", Alcance "15 metros" e Custo de Aprendizado `26`, para Habilidade
- **THEN** o sistema avisa que a Escola será descartada; ao confirmar, a carta vira Habilidade, mantém o título, o texto e o Alcance, e passa a mostrar Grau "Avançada" e Descansos Mínimos `8`

#### Scenario: Carta já publicada
- **WHEN** o Narrador abre uma carta com uma versão publicada
- **THEN** só o tipo atual aparece como escolhido, os outros tipos não são selecionáveis, e uma troca enviada direto à API é recusada

### Requirement: Salvamento automático do rascunho
O editor SHALL salvar o rascunho sozinho, pouco depois de cada alteração, e SHALL mostrar o estado do salvamento: salvando, salvo ou falha com opção de tentar de novo. Fechar o editor com uma alteração ainda não salva SHALL salvá-la antes de fechar. Se o rascunho tiver sido alterado em outro lugar, o editor SHALL avisar do conflito e SHALL NOT sobrescrever a outra edição.

#### Scenario: Narrador fecha logo depois de digitar
- **WHEN** o Narrador altera o texto e fecha o editor em seguida
- **THEN** a alteração é salva antes de o editor fechar, e reabrir a carta mostra o texto novo

#### Scenario: Conflito com outra edição
- **WHEN** outro Narrador salva o mesmo rascunho enquanto o editor está aberto
- **THEN** o editor avisa que a carta foi alterada em outro lugar e oferece recarregar, sem gravar por cima

### Requirement: Validação junto do campo
O servidor SHALL continuar sendo a autoridade da validação. O editor SHALL mostrar cada problema ao lado do campo a que ele se refere, com o rótulo que o Narrador vê na tela, e SHALL NOT mostrar identificadores internos. Os avisos de revisão pendente SHALL aparecer junto do campo afetado, sem impedir a publicação.

#### Scenario: Item sem subtipo
- **WHEN** o Narrador cria um item e ainda não escolheu o que ele é
- **THEN** o problema aparece junto de "O que é?", e não numa lista com o nome técnico do campo

### Requirement: Um único gesto de publicação
O editor SHALL ter uma única ação principal, Publicar. Enquanto houver problemas, Publicar SHALL ficar indisponível, dizer quantas pendências faltam e, ao ser acionado, levar o foco à primeira. Publicar SHALL continuar pedindo confirmação e avisando quando a arte privada for copiada para a mesa. Cada publicação SHALL criar uma nova versão imutável.

#### Scenario: Duas pendências
- **WHEN** a carta tem dois problemas de validação
- **THEN** Publicar mostra "2 pendências", e acioná-lo leva o foco ao primeiro campo com problema

#### Scenario: Publicação com arte privada
- **WHEN** o Narrador publica uma carta com arte enviada ainda privada
- **THEN** a confirmação avisa que a arte será copiada para a mesa, e a nova versão aparece no histórico

### Requirement: Só os campos que se aplicam
O editor SHALL mostrar só os campos do tipo e, para itens, do subtipo escolhido. Em habilidades e magias, os campos do Framework SHALL aparecer na ordem da ficha de criação do Framework, com Escola só em magias e Disciplina só em habilidades. Tipo, Escola e Forma SHALL ser escolhidos entre as opções do catálogo. Grau e Descansos Mínimos SHALL aparecer como valores calculados, sem controle de edição; o Custo de Uso SHALL aparecer preenchido com o valor calculado, editável, e com aviso quando o Narrador registrar outro valor. O "Custo legado" SHALL aparecer só em cartas que já o tenham. Trocar o subtipo de um item SHALL descartar os valores dos campos que o novo subtipo não declara, com confirmação quando algum deles estiver preenchido. Os campos que os jogadores não veem SHALL ter a marca "só você vê".

#### Scenario: Espada vira mochila
- **WHEN** o Narrador troca o subtipo de um item de Uma mão, com Dano "1d8" preenchido, para Mochila
- **THEN** o sistema avisa que o Dano será descartado; ao confirmar, o item fica sem Dano e mostra os campos da mochila

#### Scenario: Custos de aprendizado
- **WHEN** o Narrador edita uma habilidade
- **THEN** Custo de Aprendizado e Descansos Mínimos aparecem com a marca "só você vê", e a carta da página da esquerda não os mostra

#### Scenario: Grau calculado ao digitar o custo
- **WHEN** o Narrador digita Custo de Aprendizado `26` numa magia
- **THEN** o quadro Grau passa a mostrar "Intermediária" e o de Descansos Mínimos, `6`, sem que o Narrador possa editá-los

#### Scenario: Custo de Uso diferente do Framework
- **WHEN** o Narrador digita Potência de Uso `1` e troca o Custo de Uso calculado (`1 PP`) por `3`
- **THEN** o quadro Custo de Uso mostra `3` e o aviso de que o Framework daria `1 PP`, e Publicar continua disponível

### Requirement: Carta ao vivo como prévia
A página da esquerda do editor SHALL mostrar a carta como ela aparece no detalhe da carta da ficha, atualizada a cada alteração. A arte SHALL ser enviada ou trocada pela própria área da arte. As versões publicadas SHALL ficar num bloco recolhido.

#### Scenario: Narrador envia a arte
- **WHEN** o Narrador usa o botão da câmera na arte de um rascunho que ainda não foi salvo
- **THEN** o rascunho é criado, a imagem é enviada, e a arte aparece na página da esquerda

### Requirement: Visual fiel ao conceito aprovado
O editor SHALL ser uma cópia fiel do conceito aprovado pelo usuário (`referencia/conceito-editor-mochila.png`): o grimório aberto, os marcadores de tipo saindo do topo do livro, a carta na página da esquerda, os quadros com medalhão na da direita e o selo de cera de Publicar no pé. As molduras SHALL ser SVG/CSS, e as pinturas SHALL ser opcionais: sem elas, o editor SHALL continuar completo e coerente. Em telas pequenas, o editor SHALL usar um layout de fluxo próprio. O resultado SHALL ser aprovado pelo usuário por comparação lado a lado com o conceito.

#### Scenario: Pinturas ausentes
- **WHEN** as pinturas do grimório e dos marcadores não carregam
- **THEN** o editor desenha o livro, os marcadores e o selo em SVG/CSS na mesma geometria, sem imagem quebrada

#### Scenario: Celular
- **WHEN** o Narrador abre o editor numa tela de 400 px
- **THEN** os marcadores, a carta e os campos ficam em coluna, sem rolagem horizontal
