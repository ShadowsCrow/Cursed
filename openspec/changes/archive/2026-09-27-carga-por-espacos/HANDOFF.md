# Passagem de trabalho — carga-por-espacos

Estado em 2026-09-27. Progresso no `tasks.md`: 29/30 (atualizado em 2026-09-27). Commitado e enviado em `feature/retrato-refinamento`, junto com `calcular-valores-da-ficha` e o arquivamento de `migrar-para-plataforma-rpg-colaborativa`. Falta só a validação de mesa (9.2).

## Pronto e verificado

- **Motor da grade:** TypeScript (`platform/frontend/src/app/inventory/gridEngine.ts`) e Python (`cursed_platform/domain/grade.py`), com os mesmos casos em `fixtures/grade/casos.json`.
- **Protótipo:** `/preview/inventario` (`InventoryPrototype.tsx`).
- **Migração `0016_carga_em_grade`:** colunas de grade em `inventory_items`, `rpg_tables.moedas_por_pilha` (padrão provisório 100), `scene_stashes`, `scene_stash_items` e `item_offers`. `character_carries` e `acompanha_token_id` foram removidos (decisão de 2026-09-27). **Aplicada no Supabase de testes (8.3)**, com RLS e sem acesso de `anon`/`authenticated`.
- **5.2 Criação de item com formato:** `ItemFormatEditor` ligado ao `CardEditor` (subtipo define `item_tipo`; "Peso aproximado (só descrição)") e ao diálogo "Definir formato" do Narrador para itens sem dimensão (`PUT .../inventario/{item}/formato`).
- **5.3 Moedas na tela:** `CoinPurse` (total por tipo, alterar totais, dividir e juntar, na ordem da grade do servidor) e `CoinStackSetting` na Visão geral do Narrador (grava a política inteira).
- **6.2 Chão e baú:** `room/SceneStashes.tsx` na sala: grades do chão e dos baús, "Pegar para …" (vai para fora da grade), tocar numa célula ou arrastar até a grade do personagem (posição validada), Narrador cria baú e põe carta de item. "Largar no chão" na grade da ficha. Evento `recipiente.alterado` assinado em `RoomPresence`. Disputa verificada em PostgreSQL.
- **6.3 Trocas:** `cursed_platform/trocas.py` e rotas em `platform/api/cursed_api/stashes.py` (`/ofertas-item`, oferecer, aceitar com lugar opcional, recusar, cancelar). `recipientes.transferir` passa o item com efeitos e posse de carta. Evento `oferta.alterada` sem dados; `TableEvents` assina na página da ficha, que também reconsulta a cada 10 s. Entidades ocultas aparecem só pelo nome público, inclusive na auditoria.
- **7.1:** o valor derivado `carga:peso` foi removido; itens migrados ficam sem dimensão, com "Peso: N (só descrição)".
- **7.2:** o migrador de JSON registra "Tipo e dimensão na grade pendentes" nas cartas de item. O arquivo `app_streamlit/data/catalogs/armas_lib.json` **não foi editado**: o Streamlit ainda o lê; a conversão acontece no migrador.
- **6.1 Corpos padrão:** `cursed_platform/corpos.py` garante em cada mesa oito cartas de item publicadas (corpo inteiro e com ajuda por Tamanho; metade da altura arredondada para cima), com ids fixos, criadas junto com a mesa e ao listar o catálogo. Não se editam nem se republicam (409); a biblioteca esconde "Editar". O Narrador concede o corpo como qualquer carta de item. Cenário Playwright "corpos padrão".
- **8.2:** passada visual em `docs/validation/passada-visual-carga-em-grade.md` (capturas em `.screenshots/grade/`); o resumo da grade passou a mostrar as células na área vermelha.
- **4.7 Só é levado o que está na grade (decisão de 2026-09-27):** bandeja não conta nem se equipa (exceto mochila equipada); item sem formato não se equipa; redefinir formato que tira da grade desequipa; a arrumação registra "colocado na grade" e "retirado para a bandeja". Testes antigos que equipavam itens importados usam `cursed_platform/tests/grade_teste.py`.
- **2.1 Calibração (aprovada em 2026-09-27):** colunas Minúsculo 2, Pequeno 4, Médio 5, Grande 7, Enorme 9, Colossal 11; linhas 2 + Força; +1 linha vermelha; elmo 1 x 1; quatro mochilas de referência; aljava 1 x 2 com capacidade por item; moedas por pilha é configuração da campanha ("Regras da campanha" do Narrador). Registro em `docs/regras/calibracao-carga-em-grade.md`; `COLUNAS_POR_TAMANHO` nos dois motores.
- **2.2–2.3 Livro reescrito:** `Carga.md`, `Apêndice — Carga e Transporte.md` (A.1–A.15 e B.1–B.9), `Equipamentos.md`, `Criação de Personagem.md`, `Dano de queda.md` e `Apêndice — Dano de Queda.md`. Decisões das lacunas: levantar/empurrar/arrastar "pela grade + Narrador" (teste só para o que não cabe); água profunda pelo arrasto do equipamento (peitoral pesado ou escudo empunhado); arma versátil alterna entre uma e duas mãos.
- **4.8 Versátil:** `FormatoItemGrade.versatil` (só arma de uma mão), `PosicaoItemGrade.maos` na arrumação (recusa `nao_versatil`), histórico "empunhada com duas mãos/uma mão"; botão "Empunhar com duas mãos/uma mão" na grade; caixa "Versátil" no editor de formato e no protótipo.
- **5.4 Dica "(i)":** `inventory/RegraLevantar.tsx` (texto em `regrasCarga.ts`) no resumo da grade, na ficha e no protótipo; a dica se ancora no cabeçalho para caber no celular.
- **9.1:** roteiro em `docs/validation/roteiro-mesa-carga-em-grade.md`.
- **Última verificação (2026-09-27):** 225 testes Python com PostgreSQL 16, 314 no Vitest, 5 no Playwright; tipos, lint, build e `check:client` limpos. Conferido no navegador: "(i)" na ficha (desktop e 375 px) e arma versátil no protótipo.

## Pendências e decisões do usuário

- **4.6 (concluída em 2026-09-27 com `calcular-valores-da-ficha`):** a grade lê o Tamanho do catálogo de raças da plataforma; a exceção do Narrador registra a raça em `personagem.tamanho_raca`, a troca de raça exige limpar ou reconfirmar (422 na troca silenciosa) e a migração `completar_fichas` limpa Tamanho igual ao da raça e sinaliza o divergente. Testes: `test_api_validacao_ficha` (grade e troca de raça) e `test_completar_fichas`.
- **8.1:** concluída; enviado em `feature/retrato-refinamento` junto com `calcular-valores-da-ficha`, CI verde na execução 36305495934 (2026-09-27).
- **9.2:** validação de mesa.

## Cuidados

- Após mudar a API: `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e `npm run generate:client`.
- **PostgreSQL de teste:** `docker run -d --rm --name cursed-test-pg-grade -e POSTGRES_PASSWORD=teste -p 127.0.0.1:55432:5432 postgres:16` e `CURSED_TEST_POSTGRES_URL=postgresql+psycopg://postgres:teste@127.0.0.1:55432/postgres`. O contêiner `cursed-db` é do app Streamlit: não usar em testes.
- **Vite no Windows** às vezes perde gravações em sequência rápida e serve módulo antigo; tocar o arquivo (`touch`) resolve.
- **Migração da outra mudança:** a de `calcular-valores-da-ficha` é a `0017`.
