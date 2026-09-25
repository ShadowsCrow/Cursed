# Tarefas: reformular condições, consequências e efeitos estruturados

> Conclusão histórica desta proposta. A decisão posterior `simplificar-ativacao-de-efeitos` substitui a arquitetura de aplicações separadas e retira o arquivo de exemplos; os checkboxes abaixo não representam mais o comportamento vigente em todos os pontos.

> A aplicação atual em Streamlit está fora do escopo. As entregas executáveis permanecem em regras, dados portáteis, codecs, domínio puro e testes, sem alterar `app_streamlit/app/ficha.py`, `app_streamlit/app/sections/*`, `app_streamlit/app/forjador.py`, `app_streamlit/core/state.py` ou `app_streamlit/core/persist_data.py`.

## 1. Consolidar as regras normativas

- [x] 1.1 Reescrever a parte de condições de `rules/sistema/Condições e Tipos de Dano.md` com a taxonomia, a lista fechada, a cadeia Condição → Efeito, origem, encerramento, sobreposição e composição; verificar que tipos de dano permanecem identificadores sem efeitos adicionais implícitos.
- [x] 1.2 Atualizar `rules/sistema/Morte e Inconsciência.md` para tratar Morrendo como estado derivado e Inconsciente como condição vinculada às regras de PV; verificar os fluxos de `0 PV`, recuperação e morte imediata.
- [x] 1.3 Atualizar `rules/sistema/Defesa.md` para distinguir condição, resultado imediato e relação de dano, incluindo Desarmar, Exposto, Incapacitado, Controlado e Vulnerabilidade parametrizada; verificar que Esquiva, Bloqueio e Reação não recebem penalidades duplicadas.
- [x] 1.4 Atualizar `rules/sistema/Framework de Criação, Aprendizado e Uso de Magias e Habilidades.md` com aliases, Atordoado a `+4` pontos de Controle, Sangrando calculado como dano recorrente e o contrato de efeitos oficiais ou incorporados; verificar exemplos de custo e distribuição privada.
- [x] 1.5 Harmonizar `rules/sistema/Exaustão e Estresse.md` com Trauma, Ferimento Grave, Sequela, Aflição e Outra Consequência, sem alterar as faixas; verificar que recuperação numérica não remove consequências nem efeitos vinculados ainda válidos.

## 2. Evoluir o catálogo, o domínio e os codecs de efeitos

- [x] 2.1 Evoluir `app_streamlit/data/catalogs/efeitos_default.json` de modo retrocompatível e cadastrar Sobrepeso e todas as condições com associação, versão, categoria, descrição e operações declarativas; verificar JSON válido, associações únicas e correspondência com a lista normativa.
- [x] 2.2 Criar um domínio puro de efeitos com normalização estrita ou compatível para `modificador`, `restricao`, `falha_automatica`, `alteracao_recurso` e `consumir_aplicacao`; verificar que operações desconhecidas são rejeitadas no modo estrito, extensões inertes são preservadas na leitura compatível e nenhum código é avaliado.
- [x] 2.3 Implementar resolução de efeitos oficiais referenciados e efeitos externos incorporados, retornando operações, origens e avisos sem importar Streamlit; verificar deduplicação por associação, preservação de origens e erro legível para referência default ausente.
- [x] 2.4 Centralizar codificação e decodificação de efeitos, preservar `E1` e adicionar `E2` autocontido e estruturado; verificar round-trip, leitura de E1 legado, rejeição de versão/operação inválida e compatibilidade do importador atual por meio do módulo legado.
- [x] 2.5 Estender o codec puro de equipamentos para codificar e decodificar `EQ2`, preservando `EQ1`; verificar equipamento com referência default, efeito incorporado, mistura dos dois, conteúdo legado e rejeição de payload executável ou malformado.
- [x] 2.6 Cobrir catálogo, operações, resolução e codecs em testes unitários, incluindo o efeito estruturado de Sobrepeso e um equipamento privado autocontido; verificar que toda a suíte específica de efeitos passa.
- [x] 2.7 Documentar no material normativo o contrato que um futuro gerador deverá consumir — autoria estruturada, pré-visualização, efeitos oficiais e privados — e verificar que nenhuma tarefa ou alteração desta mudança depende da interface Streamlit atual.

## 3. Implementar o domínio puro de condições

- [x] 3.1 Criar `utils/condicoes.py` com normalização e validação de aplicações contendo identificador, condição, associação de efeito, alvo, origem, duração ou encerramento, resistência e parâmetros; verificar rejeição estrita de registros incompletos e preservação compatível de extensões.
- [x] 3.2 Implementar rastreamento de múltiplas aplicações e encerramento por origem; verificar que encerrar uma de duas origens mantém condição e efeito e que encerrar a última desativa ambos.
- [x] 3.3 Implementar composição sem soma cega, incluindo Cego sobre Ofuscado e Contido sem criar Imobilizado; verificar que penalidades substituídas aparecem uma vez e condições independentes preservam seus encerramentos.
- [x] 3.4 Implementar as transições de Exposto, Atordoado e Sangrando; verificar consumo por ataque válido, escolha entre Ações e Movimento e perda única de `1 PV` mesmo com múltiplas origens.
- [x] 3.5 Representar Desarmar como resultado imediato, Morrendo como estado derivado e Vulnerabilidade como relação de escopo obrigatório; verificar que não são aceitos como condições livres e que aliases antigos continuam legíveis.
- [x] 3.6 Cobrir aplicações, composição, transições e compatibilidade em `tests/test_condicoes.py`; verificar que cada cenário mecânico da especificação possui teste direto ou justificativa quando exclusivamente narrativo.

## 4. Estender consequências persistentes

- [x] 4.1 Estender `utils/desgaste.py` para aceitar Aflição e os campos manifestação, efeito atual, estado, progressão e condições vinculadas; verificar que registros legados normalizam sem perda e testes atuais permanecem válidos.
- [x] 4.2 Tornar rastreáveis as transições `ativo`, `mitigado`, `em tratamento` e `encerrado`; verificar que recuperar PV, Exaustão ou Estresse não altera consequência sem regra própria.
- [x] 4.3 Generalizar consequências equivalentes para permitir manter, atualizar ou intensificar o registro existente; verificar ausência de duplicação automática e coexistência de consequências distintas.
- [x] 4.4 Integrar consequências e aplicações de condições por origem; verificar que uma consequência ativa a condição e seu efeito oficial, e que encerrá-la remove somente suas aplicações.
- [x] 4.5 Implementar o ciclo opcional de Aflição separando exposição, criação, progressão, sintomas e cura; verificar resistência impeditiva, remoção temporária de sintoma e estabilidade sem progressão declarada.
- [x] 4.6 Ampliar os testes de consequências; verificar também que Colapso Mental ainda cria ou intensifica Trauma e que excedente físico ainda exige consequência contextual.

## 5. Migrar conteúdo sem acoplar interface

- [x] 5.1 Migrar usos normativos e de conteúdo de Desarmado, Morrendo, Vulnerável, Completamente Incapacitado e Completamente Controlado em `rules/sistema`, `app_streamlit/data/catalogs/classes.json` e `app_streamlit/data/catalogs/reserva_habilidades.json`; verificar com `rg` que ocorrências restantes são aliases, explicações ou relações parametrizadas.
- [x] 5.2 Revisar fontes que aplicam condições em classes e habilidades para declarar duração ou encerramento e parâmetros necessários, sem recalcular criações não afetadas; verificar JSON e listar entradas que dependam de decisão do Narrador.
- [x] 5.3 Documentar exemplos portáteis de aplicação temporária, origens sobrepostas, consequência vinculada, Aflição progressiva e equipamento privado autocontido; verificar todos contra os normalizadores e codecs puros.
- [x] 5.4 Confirmar o limite arquitetural por imports e diff; verificar que domínio, codecs, dados e testes não importam Streamlit e que nenhum arquivo de interface ou persistência foi modificado.

## 6. Validar regras, integração e experiência de mesa

- [x] 6.1 Criar matriz de validação de mesa para controle, restrições sobrepostas, Sangrando, múltiplas origens, Aflição, tratamento e equipamento privado; verificar estado inicial, decisões, resultado esperado e critério de aprovação de cada roteiro.
- [x] 6.2 Executar e registrar os roteiros com foco em clareza, carga de registro, agência, perigo, contribuição narrativa e compreensão da origem dos efeitos; verificar que falhas geram ajuste explícito sem ampliar o escopo para Descanso ou Aprendizado/PP.
- [x] 6.3 Executar toda a suíte automatizada e validações de JSON; verificar ausência de regressões em desgaste, efeitos e codecs e aprovação de todos os novos testes.
- [x] 6.4 Revisar esta mudança junto de `reformular-exaustao-estresse-e-consequencias` e executar validação estrita do OpenSpec; verificar ausência de contradições, cenários para todos os requisitos e checkboxes correspondentes ao estado real.
