# Relatório de paridade — ficha viva (tarefa 6.9)

Execução de 2026-09-25 sobre o commit `86094b8`, com as fixtures de
`fixtures/legacy/` e os testes de `cursed_platform/tests/test_paridade_ficha.py`
contra a API real (SQLite local). O livro de regras não foi alterado.

## Resultado por jornada

| Jornada | Teste | Resultado |
| --- | --- | --- |
| Criação | `test_create_character_authorization` | Aprovada |
| Carregamento | `test_complex_sheet_round_trip` | Aprovada para o JSON da ficha; ver divergência D2 |
| Edição | `test_character_update_conflict` | Aprovada |
| Equipamento | `test_equip_and_unequip_recalculates_effects` | Aprovada |
| Efeitos | `test_effect_lifecycle_audit` | Aprovada (após 7.2 e 8.3) |
| Importação | `test_portable_import_preview_and_rejection` | Aprovada |
| Persistência | `test_persistent_snapshot_after_restart` | Aprovada |

A interface da ficha é verificada por testes de componentes com a API
simulada. Jornadas no navegador contra a API real ficam para a tarefa 12.2.

## Divergências

Divergências **abertas** impedem o corte do Streamlit.

| # | Divergência | Situação | Destino |
| --- | --- | --- | --- |
| D1 | Aplicar, ajustar, suspender e encerrar efeitos pelo Narrador, com auditoria. | Resolvida (7.2 e 8.3) | — |
| D2 | Uma ficha legada mantém `armas`, `armaduras`, `outros` e `efeitos_externos` no JSON, preservados, mas esses itens só aparecem no inventário e nos efeitos da ficha nova depois da migração para as tabelas. | Aberta | 11.1, 11.2 e 11.4 |
| D3 | Deslocamento e Capacidade de carga do Status não são calculados, porque dependem do catálogo de raças. | Aberta | Antes do piloto (12.6) |
| D4 | Com a política exigindo aprovação para `inventario` ou `efeitos`, o jogador recebe recusa com orientação, em vez de uma solicitação pendente. As solicitações existem apenas para edição da ficha. | Aberta | Antes do piloto (12.6) |
| D5 | A peça de armadura da `ficha_complexa` usa `defesa`, mas o Streamlit lê `armadura`. As duas aplicações somam zero para essa peça. O migrador não deve adivinhar o significado. | Pendência de revisão | 11.5 |
| D6 | Totais de atributos, perícias e Status passam a incluir modificadores sem condição de efeitos ativos. Na `ficha_complexa`, Arcanismo é 5 no Streamlit e será 7 depois de migrar "Marca de teste" (+2). Modificadores com contexto continuam fora do total. | Aprovada (design 7.1) | — |
| D7 | O "bônus externo" manual do Status do Streamlit não era persistido e foi substituído por efeitos com origem visível. Não há perda de dados. | Aprovada (design 7.1) | — |
| D8 | PV e PP não existem na ficha legada. A ficha nova só os exibe quando registrados em `recursos`; caso contrário, mostra "não registrado". | Aprovada (design 7.1) | — |
| D9 | O menu de transferência identifica participantes pelo id, porque o contrato de participantes não traz nome de exibição. | Aberta (usabilidade) | Perfil de usuário, antes do piloto |
