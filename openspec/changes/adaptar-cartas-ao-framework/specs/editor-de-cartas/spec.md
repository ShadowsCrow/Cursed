# Spec Delta

## MODIFIED Requirements

### Requirement: Tipo trocável até a primeira publicação
Enquanto a carta nunca tiver sido publicada, o Narrador SHALL poder trocar o tipo. Os campos comuns (título, texto, requisitos, tags e arte) SHALL ser mantidos. Entre Habilidade e Magia, os campos do Framework comuns às duas também SHALL ser mantidos, e o Grau e os Descansos Mínimos SHALL ser recalculados pelas faixas do novo tipo. Se a troca descartar valores próprios do tipo anterior, o sistema SHALL pedir confirmação antes. Depois da primeira publicação, o tipo SHALL ficar fixo, e o servidor SHALL recusar a troca.

#### Scenario: Troca de Magia para Habilidade
- **WHEN** o Narrador troca o tipo de um rascunho de Magia, com Escola "Elemental", Alcance "15 metros" e Custo de Aprendizado `26`, para Habilidade
- **THEN** o sistema avisa que a Escola será descartada; ao confirmar, a carta vira Habilidade, mantém o título, o texto e o Alcance, e passa a mostrar Grau "Avançada" e Descansos Mínimos `8`

#### Scenario: Carta já publicada
- **WHEN** o Narrador abre uma carta com uma versão publicada
- **THEN** só o tipo atual aparece como escolhido, os outros tipos não são selecionáveis, e uma troca enviada direto à API é recusada

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
