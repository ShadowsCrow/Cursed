# Roteiro de validação de mesa — ficha completa (calcular-valores-da-ficha 10.1)

Objetivo: observar com Narrador e jogadores reais se a ficha calculada é clara, rápida e confiável. A pergunta central é se a mesa confia nos números de PV e PP sem refazer a conta, e se aplicar condições e trocar imagens ficou mais ágil. A sessão **não altera** as regras: cada problema recebe uma decisão registrada (corrigir agora, acompanhar ou rejeitar), e mudanças de regra ou de catálogo dependem do usuário.

## Preparação (Narrador)

1. Uma mesa de teste com dois ou mais jogadores e a política "jogadores editam a própria ficha" ligada.
2. Uma ficha antiga migrada (com classe escrita à mão e sem nível) e o complemento aplicado:
   `python platform/migration/completar_fichas.py --mesa-id MESA --aplicar`.
3. Uma imagem PNG ou JPEG para retrato (até 5 MB) e uma quadrada para ícone de condição.
4. As regras à mão: `Criação de Personagem.md` (PV/PP iniciais e Escalas) e `Progressão e Proficiência.md` (aumentos por nível), para conferir os números sem a ficha.
5. Um cronômetro para medir cada passo.

## Roteiro

| # | Situação | Quem | O que fazer | O que observar |
| --- | --- | --- | --- | --- |
| 1 | Criação com classe | Jogador | Criar um personagem, escolher classe, arquétipo e raça pelas listas e preencher Vigor e Propósito | As listas mostram só arquétipos da classe? PV e PP aparecem cheios no cabeçalho? O detalhe das fontes (base da classe e atributo) bate com a conta de `Criação de Personagem.md`? |
| 2 | Limites na tela | Jogador | Tentar Vigor base 8, depois ajustar 5 com ajuste +1 | O erro aparece junto ao campo, com a faixa, e o salvar fica indisponível? O total 6 mostra base e ajuste separados? |
| 3 | Subida de nível | Narrador | Subir o personagem do nível 1 ao 2 e depois ao 5 com PV gasto | O máximo sobe e o atual não é recuperado? O PP só sobe nos níveis pares? A mesa confiou no número sem refazer a conta? |
| 4 | Ficha migrada | Narrador | Abrir a ficha migrada: aviso de nível definido pela migração, classe vinculada, eventual Tamanho divergente e valores fora das listas | Os avisos são entendidos? "Confirmar nível" e "Vincular" resolvem o que precisam? Algo foi trocado sem o Narrador pedir? |
| 5 | Condição aplicada pelo jogador | Jogador | Em cena, marcar "Derrubado" no próprio personagem pela lista e encerrar depois; tentar aplicar Cego com Ofuscado ativo | Achar a condição foi rápido? O aviso de substituição ficou claro? O histórico mostra o jogador como autor? |
| 6 | Troca de arquétipo | Narrador | Trocar o arquétipo e depois a classe do personagem | A lista de cartas que saem e entram antes de salvar ajuda? As cartas de oferta continuaram? Os valores de PV/PP mudaram na hora? |
| 7 | Troca de raça com Tamanho | Narrador | Informar Tamanho atual Grande e trocar a raça | A escolha entre limpar e manter a exceção faz sentido? A grade de carga reflete o resultado? |
| 8 | Ajuste do Narrador | Narrador | Registrar +3 no PV máximo com origem e justificativa | O ajuste aparece como fonte? Ficou claro para o jogador de onde veio o PV extra? |
| 9 | Retrato | Jogador | Trocar o retrato; tentar enviar um arquivo que não é imagem | O retrato aparece rápido no cabeçalho? A recusa é legível? O histórico registra "retrato alterado"? |
| 10 | Ícone de condição | Narrador | Na biblioteca, enviar um ícone para "Derrubado" e depois removê-lo | O ícone novo aparece nas fichas desta mesa? Ao remover, volta ao ícone padrão? |
| 11 | Descanso | Narrador | Fazer um Descanso Curto e um Longo | A recuperação usa a Escala calculada? Um personagem sem classe do catálogo mostra o motivo, em vez de recuperar um valor inventado? |

## Registro dos resultados

| # | Funcionou? | Tempo | Clareza | Confiança nos números | Dúvidas ou atritos | Divergência com as regras? | Decisão (corrigir agora, acompanhar ou rejeitar) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| 11 | | | | | | | |

## Perguntas finais

- **Clareza:** todos entenderam de onde vem cada valor (classe, atributo, nível, ajuste) e o que significa "não calculável"?
- **Ritmo:** aplicar condições pela lista e pelo próprio jogador cortou pausas? Algum passo atrasou a cena?
- **Carga cognitiva:** o Narrador deixou de fazer contas de PV e PP e de conferir limites? O que ainda exigiu consulta?
- **Confiança nos números:** alguém sentiu necessidade de recalcular? Em que caso?

## Como registrar cada problema

Para cada problema, anotar numa linha o que aconteceu, em qual passo, a gravidade e a decisão:

- **Corrigir agora:** bloqueia a mesa ou contradiz a regra aprovada; vira tarefa antes do corte.
- **Acompanhar:** incomoda, mas não bloqueia; observar na próxima sessão.
- **Rejeitar:** comportamento esperado ou decisão já tomada; registrar o porquê.

Bases de classe, listas e habilidades vêm do JSON do catálogo (`cursed_platform/catalogos/`). Uma correção nelas é edição do JSON, decidida pelo usuário, e não da ficha.

## Limites conhecidos (não avaliar como defeito)

- O popover de edição abre por hover ou foco, e um clique logo depois o fecha (componente base, em acompanhamento).
- A prévia das condições mostra os alvos dos modificadores em formato interno.
- Dano, cura e gasto de PV/PP durante a sessão continuam sendo edição direta do valor atual; um fluxo próprio está fora desta mudança.
