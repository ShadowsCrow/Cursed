# Validação de mesa: desgaste e consequências

## Escopo

Esta validação é uma simulação interna e estruturada das regras, sem interface digital e sem jogadores externos. Ela serve para detectar contradições mecânicas antes de um playtest humano. O cenário automatizado correspondente está em `tests/test_validacao_mesa_desgaste.py`.

## Roteiro

Para cada etapa, registrar a decisão tomada, a regra consultada, o resultado, o tempo de administração e qualquer dúvida.

|Etapa|Situação|Decisão relevante|Resultado esperado|
|---:|---|---|---|
|1|Marcha sob tempestade leva Tarek de 12 a 14 de Exaustão.|Continuar ou procurar abrigo.|Fica No Limite; Estresse não muda.|
|2|Tarek precisa salvar um aliado com 14 de Exaustão.|Usar ou não o último esforço.|A ação recebe `+1`, resolve e depois causa Colapso Físico.|
|3|O grupo tenta obrigar Tarek a continuar a marcha em 15.|Transportá-lo ou aceitar uma consequência contextual.|A trilha permanece em 15; surge Debilidade Extrema; não há morte automática.|
|4|Nara enfrenta a entidade com 8 de Estresse.|Assumir `+2` para uma interação decisiva.|O teste resolve e depois ocorre Colapso Mental com Trauma.|
|5|Nara colapsa novamente diante da mesma entidade.|Relacionar ou não o evento ao Trauma existente.|Vozes do Vazio é intensificado, sem duplicata.|
|6|O Trauma é acionado em outra cena.|Receber `+1` de Estresse, aceitar complicação ou usar apoio relevante.|A escolha produz custo claro; apoio coerente pode neutralizá-lo.|
|7|O grupo conclui um Descanso Longo.|Descansar ou buscar tratamento específico.|As trilhas diminuem; Trauma e Debilidade permanecem.|

Campos de registro para uma mesa futura:

- decisões que exigiram pausa;
- quantidade de consultas ao documento;
- tempo total de administração;
- clareza das causas e consequências;
- agência percebida;
- tensão e diversão;
- ajustes sugeridos.

## Execução da simulação interna

- **Execução:** cenário automatizado completo, incluindo as sete etapas.
- **Consultas necessárias durante a codificação:** faixas, ordem do último esforço, regra de excedente, regra de Trauma e separação entre descanso e tratamento.
- **Tempo mecânico automatizado:** inferior a um segundo; esse valor não representa tempo de uma mesa humana.
- **Decisões observadas:** procurar abrigo ou continuar; gastar o último recurso ou preservar-se; transportar o personagem ou aceitar consequência; assumir Estresse pela ação decisiva; escolher manifestação do colapso; resistir ao gatilho ou aceitar complicação; descansar ou buscar tratamento.

## Avaliação

|Critério|Resultado da simulação|Decisão|
|---|---|---|
|Clareza|A separação entre trilha, colapso e efeito persistente eliminou a dúvida sobre o que o descanso remove.|Aceitar.|
|Agência|O último esforço cria uma escolha com benefício imediato e custo certo depois da ação.|Aceitar e observar em playtest humano.|
|Tensão|Chegar a 14/8 torna o risco legível sem impedir automaticamente a ação decisiva.|Aceitar.|
|Diversão|A escolha existe e altera a cena, mas diversão percebida exige jogadores reais.|Acompanhar em playtest humano.|
|Carga operacional|Origens e consequências exigem registro, mas não há mais pontos permanentes nem contagem por contexto.|Aceitar; a futura interface deve condensar o registro.|

## Problemas encontrados

1. **Apoio ao gatilho do Trauma é deliberadamente ficcional.** Não há uma lista universal de ações válidas. Decisão: aceitar, pois preservar contexto e criatividade é objetivo do sistema; adicionar exemplos na documentação quando playtests indicarem dúvida recorrente.
2. **Excedente físico precisa de uma consequência nomeada.** Isso exige julgamento do Narrador no momento. Decisão: aceitar e acompanhar; uma biblioteca de exemplos pode ser criada futuramente sem transformar a consequência em tabela obrigatória.
3. **A intensidade do Trauma ainda não possui efeitos universais por nível.** Decisão: aceitar, pois cada Trauma deve declarar sua progressão e a mudança evita recriar uma matriz genérica.
4. **Tempo e diversão reais não podem ser validados por teste automatizado.** Decisão: acompanhar em playtest humano antes de considerar o balanceamento definitivo.

## Resultado

A simulação não encontrou contradição nas transições principais. O sistema preservou decisões de risco, não criou morte ou permanência anônima e manteve as consequências após a recuperação das trilhas. A validação humana continua recomendada para medir ritmo, compreensão espontânea e diversão percebida.
