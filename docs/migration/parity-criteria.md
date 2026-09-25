# Critérios mensuráveis de paridade

Os critérios abaixo bloqueiam o corte do Streamlit quando falharem. O
responsável é o papel que mantém o respectivo teste; o teste planejado deve ser
automatizado antes da validação de uma mesa piloto.

| Jornada | Critério de aceite mensurável | Responsável | Teste planejado |
| --- | --- | --- | --- |
| Criação | Um jogador autorizado cria uma ficha em uma mesa; a API retorna identificador, proprietário, `table_id` e versão inicial. A ação sem permissão é rejeitada. | Backend | Integração `test_create_character_authorization` |
| Carregamento | A fixture complexa retorna todos os campos críticos, listas de equipamentos e efeitos na mesma ordem lógica. | Backend | Integração `test_complex_sheet_round_trip` |
| Edição | Um comando autorizado altera somente os campos declarados; tentativa com versão antiga recebe conflito e não muda o estado confirmado. | Backend | Integração `test_character_update_conflict` |
| Equipamento | Equipar e desequipar altera o estado do item e recalcula efeitos derivados com fontes identificáveis. | Domínio | Unidade `test_equip_and_unequip_recalculates_effects` |
| Efeitos | Aplicar, ajustar, suspender e encerrar preserva origem, duração e auditoria; efeitos não autorizados são rejeitados. | Domínio | Integração `test_effect_lifecycle_audit` |
| Importação | E1/EQ1 válido apresenta prévia e cria equivalente atual; payload inválido não cria mutação parcial. | Migração | Integração `test_portable_import_preview_and_rejection` |
| Persistência | Após reiniciar o serviço, o snapshot autorizado conserva dados confirmados, versão e associações de mesa. | Backend | Integração `test_persistent_snapshot_after_restart` |

## Campos críticos da fixture complexa

- identidade: nome, raça, classe, arquétipo e cor de classe;
- personalidade;
- atributos e perícias, com valores, totais e ajustes;
- armas, armaduras e outros itens, incluindo ordem;
- efeitos externos, origem e modificadores quando presentes;
- dados desconhecidos preserváveis, sem reinterpretar significado mecânico.

## Evidência de aprovação

Cada execução de paridade deve registrar a versão do migrador, a fixture ou
origem usada, o resultado de cada teste e qualquer divergência. Divergências
abertas impedem o corte, conforme a especificação de migração da plataforma.
