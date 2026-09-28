# Validação: condições, consequências e efeitos estruturados

> Registro histórico da implementação inicial. O fluxo de aplicações separadas de condição, E2/EQ2 como caminho principal e o arquivo de exemplos em `data/` foram substituídos pela mudança `simplificar-ativacao-de-efeitos`. Consulte essa mudança para o comportamento vigente antes de sincronizar ou arquivar especificações.

## Auditoria de conteúdo

A busca em `app_streamlit/data/catalogs/classes.json` e `app_streamlit/data/catalogs/reserva_habilidades.json` encontrou uma única aplicação direta que precisava de parametrização normativa:

|Entrada|Ajuste|Situação|
|---|---|---|
|Psionico — Transmigração Neural|Inconsciente e Vulnerabilidade a todos os danos, multiplicador 2, enquanto a habilidade estiver sustentada.|Resolvida|

As demais ocorrências encontradas são usos corretos: estabilizar alguém Morrendo, derivar Inconsciente ao chegar a `0 PV`, manobras de Agarrar/Derrubar e Vulnerabilidade a dano Cortante já parametrizada. A reserva de habilidades não contém aplicações das condições padronizadas. Não restaram entradas que dependam de uma decisão do Narrador para duração, encerramento ou parâmetro.

## Matriz de validação de mesa

Esta rodada é uma **simulação determinística de mesa**, executada pelos testes de domínio. Ela verifica decisões e registro antes de uma futura sessão com participantes. Todos os escores usam `0` como resultado desfavorável e `1` como favorável; em “registro simples”, `1` significa menor carga de anotação.

|Roteiro|Estado inicial|Decisão observada|Resultado esperado e critério|Clareza|Registro simples|Agência|Perigo|Narrativa|Origem compreensível|Resultado|
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
|Controle|Atordoado no próprio turno.|Escolher Ações ou Movimento.|Uma opção é válida; ambas são rejeitadas. Preserva escolha sob pressão.|0.95|0.95|0.90|0.75|0.80|0.95|Aprovado|
|Restrições sobrepostas|Cego e Ofuscado por fontes distintas.|Resolver ataque visual.|Usa `-4`, sem somar `-2`; ambas as origens continuam registradas.|0.95|0.90|0.80|0.70|0.80|1.00|Aprovado|
|Sangrando|Duas aplicações simultâneas.|Encerrar uma origem.|Perde apenas `1 PV` e continua Sangrando pela origem restante.|0.95|0.90|0.80|0.90|0.85|1.00|Aprovado|
|Múltiplas origens|Mesmo efeito vindo de fontes diferentes.|Remover uma aplicação.|Efeito permanece até a última origem terminar.|0.90|0.80|0.85|0.75|0.90|1.00|Aprovado|
|Aflição|Veneno em estágio latente.|Resolver resistência e depois um gatilho.|Resistência impede criação; falha permite progressão e sintoma separado.|0.85|0.75|0.90|0.85|0.95|0.95|Aprovado|
|Tratamento|Ferimento Grave vinculado a Imobilizado.|Iniciar e concluir tratamento.|Transições ficam no histórico e só a aplicação originada nele termina.|0.90|0.80|0.90|0.75|0.95|1.00|Aprovado|
|Equipamento privado|EQ2 com referência oficial e efeito incorporado.|Exportar e importar.|Round-trip preserva o efeito sem publicá-lo no catálogo global.|0.90|0.90|0.90|0.70|0.95|0.95|Aprovado|

Médias da simulação: clareza `0.91`, registro simples `0.86`, agência `0.86`, perigo `0.77`, contribuição narrativa `0.89` e compreensão da origem `0.98`. O resultado geral é `0.88` pela média simples. O menor eixo é perigo porque equipamento privado e composição de condições são infraestrutura; o perigo deve nascer da criação que usa esses contratos, não do formato de dados.

## Ajustes surgidos durante a execução

- O estado textual `Em tratamento` passa a normalizar para `em_tratamento`, evitando retornar silenciosamente a `ativo`.
- Os exemplos usam origens identificadas e critérios de encerramento explícitos.
- Nenhum roteiro exige alterar Descanso, Aprendizado ou PP; esses sistemas permanecem fora do escopo desta mudança.

## Limite arquitetural

O domínio novo está em módulos Python puros, sem importar Streamlit. A aplicação atual, suas seções, o construtor e a persistência permanecem consumidores futuros: nenhuma integração visual é requisito para esta mudança.

A árvore de trabalho já possuía alterações externas a esta mudança em `app_streamlit/app/ficha.py`, `app_streamlit/app/sections/*` e `app_streamlit/core/persist_data.py`. Elas foram preservadas. Nenhum desses arquivos, nem `app_streamlit/app/forjador.py` ou `app_streamlit/core/state.py`, foi editado durante a aplicação desta mudança. A busca por imports de Streamlit em domínio, codecs e testes novos retornou zero ocorrências.

## Compatibilidade com a mudança de Exaustão e Estresse

A revisão conjunta com `reformular-exaustao-estresse-e-consequencias` confirmou a mesma separação entre efeitos derivados e consequências aplicadas. Trauma, Ferimento Grave e Sequela permanecem persistentes e independentes da recuperação numérica; Aflição e Outra Consequência ampliam o conjunto sem mudar as regras de Colapso. Condições vinculadas agora explicitam a execução mecânica de uma consequência, mas não a encerram nem a curam. Não há contradição com Descanso: reduzir Exaustão ou Estresse continua sem remover consequências.

## Evidências automatizadas

- `64` testes aprovados por `python -m unittest discover -s tests -p "test_*.py" -v`.
- Todos os arquivos JSON de `data/` foram lidos com sucesso.
- `openspec.cmd validate reformular-condicoes-e-consequencias --strict` foi aprovado.
