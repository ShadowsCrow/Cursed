# Tasks

## 1. Migração e persistência

- [x] 1.1 Criar a migração `0032_instancias_de_personagem`, depois da `0031_uso_de_cartas` (D1): coluna `characters.instancia_de` (String(100), nula), índice e FK para `characters.id` com `ON DELETE SET NULL`; `PersonagemRegistro.instancia_de`. Teste de migração: sobe, grava um modelo e uma instância, apagar o modelo anula o vínculo, desce. Verificado em `test_instancias.py` (`MigracaoInstanciasTest`).
- [x] 1.2 Acrescentar `instancia_de` a `PersonagemResumo` e preenchê-lo em `_personagem_resumo` (characters.py e narrator.py). Teste: a lista de personagens da mesa traz o campo. Verificado em `test_instancias.py` (a lista traz `instancia_de` e `numero_da_instancia`).

## 2. Domínio

- [x] 2.1 Criar `cursed_platform/instancias.py` (D2): `eh_modelo`, `proximo_numero`, `criar`, `promover`, `fora_da_cena`, e as funções de cópia por tabela (ficha, inventário, posses de cartas). Testes em `test_instancias.py`:
  - a instância nasce com nome "Modelo N", tipo, visibilidade e revelação do modelo, sem dono, `instancia_de` e procedência com o número;
  - PV e PP cheios; desgaste, consequências e efeitos aplicados zerados; retrato compartilhado;
  - inventário copiado com ids novos, equipado e posição na grade iguais; posses de habilidade e magia copiadas; posse de item remapeada; posse de efeito não copiada;
  - cartas de catálogo concedidas sem duplicar as já copiadas;
  - numeração não reutiliza o número de uma instância excluída;
  - editar o modelo depois não muda a instância;
  - `promover` limpa `instancia_de` e registra a procedência; `fora_da_cena` devolve só as sem token na cena. Verificado em `test_instancias.py` (`CriarInstanciaTest`).
- [x] 2.2 Em `acervo.listar`, excluir instâncias. Teste em `test_api_acervo.py` ou `test_acervo.py`: modelo e promovida aparecem, instância não. Verificado em `test_instancias.py` (`test_promover_e_limpar`: o acervo lista o modelo e a promovida, não a instância).

## 3. Servidor

- [x] 3.1 Em `POST /sala/cenas/{cena}/tokens`, aceitar `instanciar` (D3): com um modelo, criar a instância e ligar o token a ela com o nome numerado, na mesma transação, auditando `personagem.instanciado`; com instância ou personagem de jogador, como hoje. Testes de API: três "Colocar" criam três instâncias e três tokens; `instanciar` num personagem de jogador liga o token a ele mesmo; só o Narrador; o modo turno aberto recebe cada instância como participante próprio (`turno.incluir`). Verificado em `test_instancias.py` (`InstanciasApiTest`).
- [x] 3.2 Criar `POST /personagens/{id}/promocao` (só Narrador; 409 se não for instância) e `POST /personagens/{id}/instancias/limpeza?cena_id=` (envia à lixeira as instâncias do modelo sem token na cena; devolve quantas). Auditoria `personagem.promovido` e a de exclusão que já existe. Testes de API. Verificado em `test_instancias.py` (`test_promover_e_limpar`).
- [x] 3.4 Em `turno.incluir`, o token posto depois de o grupo da ficha sair da cena entra como participante próprio, sem iniciativa (D5). Teste em `test_turno.py`: o Ogro recolocado volta como "falta rolar" e trava o Próximo turno. Verificado em `test_turno.py` e `test_instancias.py` (`test_modo_turno_recebe_cada_instancia_sozinha`).
- [x] 3.3 Regenerar `openapi.json` e `schema.ts`; `export_openapi --check` e `check:client` passam. Feito; `check:client` passa.
- [x] 3.5 A ficha enviada à lixeira leva os tokens dela de todas as cenas (`sala.remover_tokens_do_personagem` em `DELETE /personagens/{id}` e na limpeza das instâncias), com `token.removido` no registro; remover o token não exclui a ficha. Decisão do usuário em 2026-10-06. Verificado em `test_instancias.py` (`test_excluir_a_ficha_leva_os_tokens_e_excluir_o_token_mantem_a_ficha`).

## 4. Interface

- [x] 4.1 Em `RoomView.colocarPersonagem`, mandar `instanciar: true` quando o personagem é NPC ou monstro sem `instancia_de`, e escolher o token criado. Teste em `RoomView.test.tsx`: "Colocar" num monstro envia `instanciar: true`; num personagem de jogador, `false`. Verificado em `RoomView.test.tsx` (modelo manda `instanciar: true`; instância e Lion, `false`; o token criado fica escolhido).
- [x] 4.2 Em `PersonagensDosJogadores`, agrupar as instâncias sob o modelo (D4), com "na cena", **Excluir**, **Promover a ficha** e, no modelo, **Excluir as instâncias fora da cena**; "Colocar" numa instância fora da cena liga o token a ela. Testes de interface para cada ação e para o agrupamento, inclusive "Modelo excluído". Verificado em `PersonagensDosJogadores.test.tsx` e `RoomView.test.tsx`.
- [x] 4.3 No acervo (`app/acervo`), nada a mudar na tela: o servidor já filtra. Conferir pelo teste de 2.2. Conferido pelo teste de 2.2.

## 5. Verificação

- [x] 5.1 Rodar a suíte completa (`unittest`, `vitest`, `tsc`, lint, build) sem falhas. Feito em 2026-10-06: Python inteira sem falhas (16 pulados), vitest 121 arquivos e 996 testes, eslint, build e `check:client` sem erros.
- [ ] 5.2 Verificar no navegador, no ambiente local, com Narrador e jogador em origens diferentes. Feito em parte pelo agente em 2026-10-06 (`cartas-na-cena-local`): "Colocar" duas vezes no Goblin Xamã criou "Goblin Xamã 1" e "Goblin Xamã 2", listados sob o modelo com "na cena", Promover, Excluir e Colocar, cada um entrando na disputa aberta como participante próprio ("falta rolar"); os demais pontos (dano em uma só, liberar o token de uma, excluir e promover pela lista, acervo) estão cobertos por testes de API e de interface. Falta a aprovação do usuário.
- [ ] 5.3 Aplicar a `0032` no Supabase de testes, depois da `0031`, só com autorização do usuário, e anotar no `AGENTS.md`.
